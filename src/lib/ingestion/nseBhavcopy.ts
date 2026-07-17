import "server-only";

import { DataSource } from "@prisma/client";

import { parseSecBhavCsv } from "@/lib/ingestion/parse";
import type {
  AdapterResult,
  IngestionAdapter,
  IngestionContext,
} from "@/lib/ingestion/types";

function utcDateOnly(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function formatBhavDate(d: Date): string {
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = d.getUTCFullYear();
  return `${dd}${mm}${yyyy}`;
}

/**
 * Official NSE end-of-day bhavcopy (securities full bhavcopy incl. delivery %).
 * Tries the last few weekdays until a published file is found.
 */
export const nseBhavcopyAdapter: IngestionAdapter = {
  name: "nse_bhavcopy",
  dataSource: DataSource.NSE_BHAVCOPY,

  async run(ctx: IngestionContext): Promise<AdapterResult> {
    const bySymbol = new Map(ctx.stocks.map((s) => [s.symbol, s]));

    let csv: string | null = null;
    let tradeDate: Date | null = null;

    for (let back = 0; back < 7 && csv === null; back += 1) {
      const candidate = new Date();
      candidate.setUTCDate(candidate.getUTCDate() - back);
      const day = candidate.getUTCDay();
      if (day === 0 || day === 6) continue;

      const url = `https://archives.nseindia.com/products/content/sec_bhavdata_full_${formatBhavDate(candidate)}.csv`;
      try {
        const res = await fetch(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            Accept: "text/csv,*/*",
          },
          signal: AbortSignal.timeout(30_000),
        });
        if (res.ok) {
          const text = await res.text();
          if (text.includes("SYMBOL")) {
            csv = text;
            tradeDate = utcDateOnly(candidate);
          }
        }
      } catch {
        // try earlier day
      }
    }

    if (!csv || !tradeDate) {
      throw new Error("No bhavcopy file reachable for the last 7 days");
    }

    const rows = parseSecBhavCsv(csv, tradeDate);
    let rowsUpserted = 0;

    for (const row of rows) {
      const stock = bySymbol.get(row.symbol);
      if (!stock) continue;

      await ctx.prisma.priceBar.upsert({
        where: { stockId_date: { stockId: stock.id, date: row.date } },
        create: {
          stockId: stock.id,
          date: row.date,
          open: row.open,
          high: row.high,
          low: row.low,
          close: row.close,
          volume: row.volume,
          deliveryPct: row.deliveryPct,
          dataSource: DataSource.NSE_BHAVCOPY,
        },
        update: {
          open: row.open,
          high: row.high,
          low: row.low,
          close: row.close,
          volume: row.volume,
          deliveryPct: row.deliveryPct,
          dataSource: DataSource.NSE_BHAVCOPY,
        },
      });
      rowsUpserted += 1;
    }

    return {
      rowsUpserted,
      details: {
        tradeDate: tradeDate.toISOString().slice(0, 10),
        csvRows: rows.length,
        matched: rowsUpserted,
      },
    };
  },
};
