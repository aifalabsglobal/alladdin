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

const chartQuoteSchema = z.object({
  date: z.date(),
  open: z.number().nullable(),
  high: z.number().nullable(),
  low: z.number().nullable(),
  close: z.number().nullable(),
  volume: z.number().nullable(),
});

const quoteSummarySchema = z.object({
  summaryDetail: z
    .object({
      trailingPE: z.number().optional(),
      priceToBook: z.number().optional().catch(undefined),
    })
    .optional(),
  defaultKeyStatistics: z
    .object({
      trailingEps: z.number().optional(),
      priceToBook: z.number().optional().catch(undefined),
    })
    .optional(),
  price: z
    .object({
      marketCap: z.number().optional(),
    })
    .optional(),
});

function utcDateOnly(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

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

/**
 * EOD + delayed OHLCV and basic fundamentals via yahoo-finance2.
 * Pulls the last ~10 trading days per stock and upserts price bars,
 * superseding synthetic rows for the same (stockId, date).
 */
export const yahooFinanceAdapter: IngestionAdapter = {
  name: "yahoo_finance",
  dataSource: DataSource.YAHOO_FINANCE,

  async run(ctx: IngestionContext): Promise<AdapterResult> {
    let rowsUpserted = 0;
    const failures: string[] = [];
    const period1 = new Date();
    period1.setUTCDate(period1.getUTCDate() - 15);

    for (const stock of ctx.stocks) {
      const ySymbol = yahooSymbol(stock.symbol, stock.exchange);
      try {
        // throttle to stay under Yahoo rate limits
        await sleep(400);
        const chart = await withRetry(() =>
          yahooFinance.chart(ySymbol, {
            period1,
            interval: "1d",
          }),
        );

        for (const raw of chart.quotes) {
          const parsed = chartQuoteSchema.safeParse(raw);
          if (!parsed.success) continue;
          const q = parsed.data;
          if (
            q.open === null ||
            q.high === null ||
            q.low === null ||
            q.close === null ||
            q.volume === null
          ) {
            continue;
          }

          const date = utcDateOnly(q.date);
          await ctx.prisma.priceBar.upsert({
            where: { stockId_date: { stockId: stock.id, date } },
            create: {
              stockId: stock.id,
              date,
              open: q.open,
              high: q.high,
              low: q.low,
              close: q.close,
              volume: q.volume,
              dataSource: DataSource.YAHOO_FINANCE,
            },
            update: {
              open: q.open,
              high: q.high,
              low: q.low,
              close: q.close,
              volume: q.volume,
              dataSource: DataSource.YAHOO_FINANCE,
            },
          });
          rowsUpserted += 1;
        }

        // Basic fundamentals snapshot (best-effort per stock)
        try {
          await sleep(400);
          const summaryRaw = await withRetry(() =>
            yahooFinance.quoteSummary(ySymbol, {
              modules: ["summaryDetail", "defaultKeyStatistics", "price"],
            }),
          );
          const summary = quoteSummarySchema.safeParse(summaryRaw);
          if (summary.success) {
            const s = summary.data;
            const asOfDate = utcDateOnly(new Date());
            const pe = s.summaryDetail?.trailingPE ?? null;
            const eps = s.defaultKeyStatistics?.trailingEps ?? null;
            const pb =
              s.defaultKeyStatistics?.priceToBook ??
              s.summaryDetail?.priceToBook ??
              null;

            if (pe !== null || eps !== null || pb !== null) {
              await ctx.prisma.fundamental.upsert({
                where: {
                  stockId_asOfDate: { stockId: stock.id, asOfDate },
                },
                create: {
                  stockId: stock.id,
                  asOfDate,
                  pe,
                  pb,
                  eps,
                  dataSource: DataSource.YAHOO_FINANCE,
                },
                update: {
                  pe,
                  pb,
                  eps,
                  dataSource: DataSource.YAHOO_FINANCE,
                },
              });
              rowsUpserted += 1;
            }

            if (s.price?.marketCap) {
              await ctx.prisma.stock.update({
                where: { id: stock.id },
                data: { marketCap: s.price.marketCap },
              });
            }
          }
        } catch {
          // fundamentals are best-effort; price bars already stored
        }
      } catch (err) {
        failures.push(
          `${ySymbol}: ${err instanceof Error ? err.message : "unknown error"}`,
        );
      }
    }

    if (ctx.stocks.length > 0 && failures.length === ctx.stocks.length) {
      throw new Error(
        `All ${ctx.stocks.length} symbols failed (likely rate limited): ${failures[0]}`,
      );
    }

    return {
      rowsUpserted,
      details: {
        stocksProcessed: ctx.stocks.length - failures.length,
        failures: failures.slice(0, 10),
      },
    };
  },
};
