import { DataSource, PrismaClient } from "@prisma/client";

import { parseSecBhavCsv } from "../src/lib/ingestion/parse";

const prisma = new PrismaClient();
const TARGET_SESSIONS = Number(process.argv[2] ?? 220);
const CONCURRENCY = 5;

function utcDateOnly(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function formatBhavDate(d: Date): string {
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}${mm}${d.getUTCFullYear()}`;
}

async function fetchDate(date: Date) {
  const url = `https://archives.nseindia.com/products/content/sec_bhavdata_full_${formatBhavDate(date)}.csv`;
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "text/csv,*/*",
      },
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) return null;
    const csv = await response.text();
    if (!csv.includes("SYMBOL")) return null;
    return { date, rows: parseSecBhavCsv(csv, date) };
  } catch {
    return null;
  }
}

async function main() {
  const stocks = await prisma.stock.findMany({
    where: { isActive: true, exchange: "NSE" },
    select: { id: true, symbol: true },
  });
  const stockBySymbol = new Map(stocks.map((s) => [s.symbol, s.id]));
  const stockIds = stocks.map((s) => s.id);

  const candidates: Date[] = [];
  const cursor = utcDateOnly(new Date());
  cursor.setUTCDate(cursor.getUTCDate() - 1);
  while (candidates.length < TARGET_SESSIONS + 90) {
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) candidates.push(utcDateOnly(cursor));
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  let sessions = 0;
  let rowsWritten = 0;

  for (let i = 0; i < candidates.length && sessions < TARGET_SESSIONS; i += CONCURRENCY) {
    const batch = candidates.slice(i, i + CONCURRENCY);
    const fetched = await Promise.all(batch.map(fetchDate));

    for (const result of fetched) {
      if (!result || sessions >= TARGET_SESSIONS) continue;
      const matched = result.rows
        .map((row) => {
          const stockId = stockBySymbol.get(row.symbol);
          if (!stockId) return null;
          return {
            stockId,
            date: result.date,
            open: row.open,
            high: row.high,
            low: row.low,
            close: row.close,
            volume: row.volume,
            deliveryPct: row.deliveryPct,
            dataSource: DataSource.NSE_BHAVCOPY,
          };
        })
        .filter((row): row is NonNullable<typeof row> => row !== null);

      if (matched.length === 0) continue;

      await prisma.$transaction([
        prisma.priceBar.deleteMany({
          where: {
            stockId: { in: stockIds },
            date: result.date,
            dataSource: DataSource.SYNTHETIC,
          },
        }),
        prisma.priceBar.createMany({ data: matched, skipDuplicates: true }),
      ]);

      sessions += 1;
      rowsWritten += matched.length;
      if (sessions % 20 === 0 || sessions === TARGET_SESSIONS) {
        console.log(
          `Backfilled ${sessions}/${TARGET_SESSIONS} sessions (${rowsWritten} stock-days)`,
        );
      }
    }
  }

  console.log(
    JSON.stringify(
      {
        targetSessions: TARGET_SESSIONS,
        sessionsBackfilled: sessions,
        rowsWritten,
        stockCount: stocks.length,
      },
      null,
      2,
    ),
  );

  if (sessions < TARGET_SESSIONS) {
    throw new Error(
      `Only ${sessions}/${TARGET_SESSIONS} published sessions were reachable`,
    );
  }
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
