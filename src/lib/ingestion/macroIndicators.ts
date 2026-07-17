import "server-only";

import { DataSource } from "@prisma/client";
import yahooFinance from "yahoo-finance2";
import { z } from "zod";

yahooFinance.suppressNotices(["yahooSurvey"]);

import type {
  AdapterResult,
  IngestionAdapter,
  IngestionContext,
} from "@/lib/ingestion/types";

const MACRO_TICKERS: { key: string; yahoo: string }[] = [
  { key: "usd_inr", yahoo: "USDINR=X" },
  { key: "crude_brent", yahoo: "BZ=F" },
  { key: "india_vix", yahoo: "^INDIAVIX" },
  { key: "in_10y_gsec", yahoo: "^TNX" },
  { key: "sp500", yahoo: "^GSPC" },
  { key: "nasdaq_fut", yahoo: "NQ=F" },
  { key: "nifty50", yahoo: "^NSEI" },
  { key: "sensex", yahoo: "^BSESN" },
];

const quoteSchema = z.object({
  regularMarketPrice: z.number(),
  regularMarketTime: z.date().optional(),
});

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

function utcDateOnly(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * Macro cues (USD/INR, crude, India VIX, yields, global indices)
 * stored as MacroIndicator rows keyed by (key, date).
 */
export const macroIndicatorsAdapter: IngestionAdapter = {
  name: "macro_indicators",
  dataSource: DataSource.MACRO,

  async run(ctx: IngestionContext): Promise<AdapterResult> {
    let rowsUpserted = 0;
    const failures: string[] = [];

    for (const ticker of MACRO_TICKERS) {
      try {
        await sleep(600);
        const raw = await withRetry(() => yahooFinance.quote(ticker.yahoo));
        const parsed = quoteSchema.safeParse(raw);
        if (!parsed.success) {
          failures.push(`${ticker.key}: unexpected payload`);
          continue;
        }

        const date = utcDateOnly(parsed.data.regularMarketTime ?? new Date());
        await ctx.prisma.macroIndicator.upsert({
          where: { key_date: { key: ticker.key, date } },
          create: {
            key: ticker.key,
            date,
            value: parsed.data.regularMarketPrice,
            dataSource: DataSource.MACRO,
            metadata: { yahooSymbol: ticker.yahoo },
          },
          update: {
            value: parsed.data.regularMarketPrice,
            dataSource: DataSource.MACRO,
          },
        });
        rowsUpserted += 1;
      } catch (err) {
        failures.push(
          `${ticker.key}: ${err instanceof Error ? err.message : "unknown error"}`,
        );
      }
    }

    if (failures.length === MACRO_TICKERS.length) {
      throw new Error(
        `All ${MACRO_TICKERS.length} macro tickers failed (likely rate limited): ${failures[0]}`,
      );
    }

    return { rowsUpserted, details: { failures } };
  },
};
