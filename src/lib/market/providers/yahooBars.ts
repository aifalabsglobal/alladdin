import "server-only";

import yahooFinance from "yahoo-finance2";

yahooFinance.suppressNotices(["yahooSurvey"]);

import { prisma } from "@/lib/db";
import { recordProviderFailure, reserveProviderCredits } from "@/lib/market/providers/budget";

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

type YahooQuote = {
  date?: Date | string;
  open?: number | null;
  high?: number | null;
  low?: number | null;
  close?: number | null;
  volume?: number | null;
};

/**
 * Ingest daily InstrumentBar history for HOT/WARM instruments that have a
 * YAHOO_FINANCE mapping. Prototype/unofficial — never claimed as licensed.
 */
export async function ingestGlobalYahooBars(args?: {
  lookbackDays?: number;
  instrumentLimit?: number;
}) {
  const lookbackDays = args?.lookbackDays ?? 90;
  const mappings = await prisma.providerInstrument.findMany({
    where: {
      provider: "YAHOO_FINANCE",
      enabled: true,
      capabilities: { has: "EOD" },
      instrument: { isActive: true, tier: { in: ["HOT", "WARM"] } },
    },
    include: { instrument: true },
    orderBy: { instrument: { tier: "asc" } },
    take: args?.instrumentLimit ?? 40,
  });
  if (mappings.length === 0) {
    return { attempted: 0, upserted: 0, failures: 0, skipped: "no mappings" as const };
  }

  await reserveProviderCredits("YAHOO_FINANCE", mappings.length);

  const period2 = new Date();
  const period1 = new Date(period2.getTime() - lookbackDays * 86_400_000);
  let upserted = 0;
  let failures = 0;

  for (const mapping of mappings) {
    try {
      const chart = await withRetry(() =>
        yahooFinance.chart(mapping.providerSymbol, {
          period1,
          period2,
          interval: "1d",
        }),
      );
      const quotes = ((chart as { quotes?: YahooQuote[] }).quotes ?? []).filter(
        (q) => q.close != null && Number.isFinite(q.close),
      );
      for (const quote of quotes) {
        const openTime = new Date(quote.date ?? period2);
        openTime.setUTCHours(0, 0, 0, 0);
        const closeTime = new Date(openTime.getTime() + 86_400_000 - 1);
        const close = quote.close!;
        await prisma.instrumentBar.upsert({
          where: {
            instrumentId_interval_openTime_provider: {
              instrumentId: mapping.instrumentId,
              interval: "D1",
              openTime,
              provider: "YAHOO_FINANCE",
            },
          },
          create: {
            instrumentId: mapping.instrumentId,
            interval: "D1",
            openTime,
            closeTime,
            open: quote.open ?? close,
            high: quote.high ?? close,
            low: quote.low ?? close,
            close,
            volume: quote.volume ?? null,
            currency: mapping.instrument.quoteCurrency,
            provider: "YAHOO_FINANCE",
            quality: "DELAYED",
            providerTs: openTime,
          },
          update: {
            closeTime,
            open: quote.open ?? close,
            high: quote.high ?? close,
            low: quote.low ?? close,
            close,
            volume: quote.volume ?? null,
            quality: "DELAYED",
            providerTs: openTime,
          },
        });
        upserted += 1;
      }
      await sleep(250);
    } catch (error) {
      failures += 1;
      const message = error instanceof Error ? error.message : "Yahoo bar failed";
      await recordProviderFailure("YAHOO_FINANCE", message);
    }
  }

  return { attempted: mappings.length, upserted, failures };
}
