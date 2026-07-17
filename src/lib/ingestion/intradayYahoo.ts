import "server-only";

import { BarInterval, DataSource } from "@prisma/client";
import yahooFinance from "yahoo-finance2";

yahooFinance.suppressNotices(["yahooSurvey"]);

import { prisma } from "@/lib/db";
import {
  normalizeYahooCandles,
  type NormalizedCandle,
} from "@/lib/ingestion/candles";

export type { NormalizedCandle };
export { normalizeYahooCandles } from "@/lib/ingestion/candles";

const YAHOO_INTERVAL: Record<BarInterval, "15m" | "60m" | "1d" | null> = {
  M15: "15m",
  H1: "60m",
  D1: "1d",
};

function yahooSymbol(symbol: string, exchange: string): string {
  return `${symbol}${exchange === "BSE" ? ".BO" : ".NS"}`;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const message = err instanceof Error ? err.message : "";
      if (message.includes("Too Many Requests")) {
        await sleep(2000 * (i + 1));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

export async function fetchYahooIntradayCandles(args: {
  symbol: string;
  exchange: string;
  interval: BarInterval;
  lookbackDays?: number;
}): Promise<NormalizedCandle[]> {
  const yahooInterval = YAHOO_INTERVAL[args.interval];
  if (!yahooInterval || yahooInterval === "1d") {
    throw new Error(`Unsupported intraday interval: ${args.interval}`);
  }

  const period2 = new Date();
  const period1 = new Date(
    period2.getTime() - (args.lookbackDays ?? 5) * 24 * 60 * 60_000,
  );

  const chart = await withRetry(() =>
    yahooFinance.chart(yahooSymbol(args.symbol, args.exchange), {
      period1,
      period2,
      interval: yahooInterval,
    }),
  );

  const quotes = (chart as { quotes?: unknown[] }).quotes ?? [];
  return normalizeYahooCandles(quotes, yahooInterval as "15m" | "60m");
}

/**
 * Upsert intraday bars for active stocks. Bounded concurrency to reduce 429s.
 * Returns rows upserted. Idempotent on (stockId, interval, openTime).
 */
export async function ingestIntradayBars(args?: {
  interval?: BarInterval;
  symbolLimit?: number;
  lookbackDays?: number;
}): Promise<{
  interval: BarInterval;
  stocksAttempted: number;
  rowsUpserted: number;
  failures: number;
}> {
  const interval = args?.interval ?? BarInterval.M15;
  const stocks = await prisma.stock.findMany({
    where: { isActive: true },
    select: { id: true, symbol: true, exchange: true },
    orderBy: { symbol: "asc" },
    take: args?.symbolLimit,
  });

  let rowsUpserted = 0;
  let failures = 0;
  const concurrency = 3;

  for (let i = 0; i < stocks.length; i += concurrency) {
    const batch = stocks.slice(i, i + concurrency);
    await Promise.all(
      batch.map(async (stock) => {
        try {
          const candles = await fetchYahooIntradayCandles({
            symbol: stock.symbol,
            exchange: stock.exchange,
            interval,
            lookbackDays: args?.lookbackDays,
          });
          for (const c of candles) {
            await prisma.intradayBar.upsert({
              where: {
                stockId_interval_openTime: {
                  stockId: stock.id,
                  interval,
                  openTime: c.openTime,
                },
              },
              create: {
                stockId: stock.id,
                interval,
                openTime: c.openTime,
                closeTime: c.closeTime,
                open: c.open,
                high: c.high,
                low: c.low,
                close: c.close,
                volume: c.volume,
                complete: c.complete,
                dataSource: DataSource.YAHOO_FINANCE,
                providerTs: c.closeTime,
              },
              update: {
                closeTime: c.closeTime,
                open: c.open,
                high: c.high,
                low: c.low,
                close: c.close,
                volume: c.volume,
                complete: c.complete,
                dataSource: DataSource.YAHOO_FINANCE,
                providerTs: c.closeTime,
                ingestedAt: new Date(),
              },
            });
            rowsUpserted += 1;
          }
        } catch {
          failures += 1;
        }
      }),
    );
    await sleep(400);
  }

  return {
    interval,
    stocksAttempted: stocks.length,
    rowsUpserted,
    failures,
  };
}

/** Drop incomplete / old intraday bars older than retentionDays. */
export async function pruneIntradayBars(retentionDays = 14): Promise<number> {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60_000);
  const result = await prisma.intradayBar.deleteMany({
    where: { openTime: { lt: cutoff } },
  });
  return result.count;
}
