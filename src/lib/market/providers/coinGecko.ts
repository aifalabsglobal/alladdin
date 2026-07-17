import "server-only";

import { z } from "zod";

import { prisma } from "@/lib/db";
import { getServerEnv } from "@/lib/env";
import {
  recordProviderFailure,
  reserveProviderCredits,
} from "@/lib/market/providers/budget";

const quoteSchema = z.record(
  z.string(),
  z.object({
    usd: z.number().positive(),
    usd_24h_change: z.number().nullable().optional(),
    last_updated_at: z.number().int().positive().optional(),
  }),
);

export async function ingestCoinGeckoQuotes() {
  const mappings = await prisma.providerInstrument.findMany({
    where: {
      provider: "COINGECKO",
      enabled: true,
      capabilities: { has: "QUOTE" },
      instrument: { isActive: true, tier: { in: ["HOT", "WARM"] } },
    },
    include: { instrument: true },
  });
  if (mappings.length === 0) return { attempted: 0, upserted: 0, skipped: "no mappings" };

  const budget = await reserveProviderCredits("COINGECKO");
  if (!budget.allowed) {
    return { attempted: mappings.length, upserted: 0, skipped: "daily budget exhausted" };
  }

  const ids = mappings.map((mapping) => mapping.providerSymbol).join(",");
  const env = getServerEnv();
  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(ids)}&vs_currencies=usd&include_24hr_change=true&include_last_updated_at=true`,
      {
        headers: env.COINGECKO_API_KEY
          ? { "x-cg-demo-api-key": env.COINGECKO_API_KEY }
          : {},
        signal: AbortSignal.timeout(12_000),
        cache: "no-store",
      },
    );
    if (!response.ok) throw new Error(`CoinGecko HTTP ${response.status}`);
    const parsed = quoteSchema.safeParse(await response.json());
    if (!parsed.success) throw new Error("CoinGecko response shape changed");

    let upserted = 0;
    for (const mapping of mappings) {
      const quote = parsed.data[mapping.providerSymbol];
      if (!quote) continue;
      const observedAt = quote.last_updated_at
        ? new Date(quote.last_updated_at * 1000)
        : new Date();
      await prisma.instrumentQuote.upsert({
        where: {
          instrumentId_provider: {
            instrumentId: mapping.instrumentId,
            provider: "COINGECKO",
          },
        },
        create: {
          instrumentId: mapping.instrumentId,
          provider: "COINGECKO",
          price: quote.usd,
          changePct24h: quote.usd_24h_change ?? null,
          currency: "USD",
          quality: "DELAYED",
          observedAt,
          metadata: { aggregation: "CoinGecko global aggregate" },
        },
        update: {
          price: quote.usd,
          changePct24h: quote.usd_24h_change ?? null,
          quality: "DELAYED",
          observedAt,
          receivedAt: new Date(),
        },
      });
      upserted += 1;
    }
    return { attempted: mappings.length, upserted, budget };
  } catch (error) {
    const message = error instanceof Error ? error.message : "CoinGecko failed";
    await recordProviderFailure("COINGECKO", message);
    throw error;
  }
}
