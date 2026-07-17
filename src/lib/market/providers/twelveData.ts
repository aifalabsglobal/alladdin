import "server-only";

import { z } from "zod";

import { prisma } from "@/lib/db";
import { getServerEnv } from "@/lib/env";
import { PROVIDER_POLICIES } from "@/lib/market/policy";
import {
  recordProviderFailure,
  reserveProviderCredits,
} from "@/lib/market/providers/budget";

const quoteEntrySchema = z.object({
  symbol: z.string().optional(),
  close: z.coerce.number().positive().optional(),
  price: z.coerce.number().positive().optional(),
  percent_change: z.coerce.number().optional(),
  currency: z.string().optional(),
  timestamp: z.coerce.number().int().positive().optional(),
  status: z.string().optional(),
  code: z.number().optional(),
  message: z.string().optional(),
});

type QuoteEntry = z.infer<typeof quoteEntrySchema>;

/**
 * Twelve Data keyed quotes. Gated on TWELVE_DATA_API_KEY: without a key the
 * adapter is inert (never invents data). Respects the per-minute credit cap by
 * requesting at most `minuteCredits` symbols per run, prioritising HOT tiers.
 */
export async function ingestTwelveDataQuotes() {
  const env = getServerEnv();
  if (!env.TWELVE_DATA_API_KEY) {
    return { attempted: 0, upserted: 0, skipped: "no api key" as const };
  }

  const perRun = PROVIDER_POLICIES.TWELVE_DATA?.minuteCredits ?? 8;
  const mappings = await prisma.providerInstrument.findMany({
    where: {
      provider: "TWELVE_DATA",
      enabled: true,
      capabilities: { has: "QUOTE" },
      instrument: { isActive: true, tier: { in: ["HOT", "WARM"] } },
    },
    include: { instrument: true },
    orderBy: { instrument: { tier: "asc" } },
    take: perRun,
  });
  if (mappings.length === 0) {
    return { attempted: 0, upserted: 0, skipped: "no mappings" as const };
  }

  const budget = await reserveProviderCredits("TWELVE_DATA", mappings.length);
  if (!budget.allowed) {
    return {
      attempted: mappings.length,
      upserted: 0,
      skipped: "daily budget exhausted" as const,
    };
  }

  const symbols = mappings.map((mapping) => mapping.providerSymbol).join(",");
  try {
    const response = await fetch(
      `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symbols)}&apikey=${encodeURIComponent(env.TWELVE_DATA_API_KEY)}`,
      { signal: AbortSignal.timeout(12_000), cache: "no-store" },
    );
    if (!response.ok) throw new Error(`Twelve Data HTTP ${response.status}`);

    const raw = (await response.json()) as unknown;
    // A single-symbol request returns a flat object; multi-symbol returns a map
    // keyed by provider symbol. Normalise both into a symbol->entry lookup.
    const bySymbol = new Map<string, QuoteEntry>();
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      const record = raw as Record<string, unknown>;
      if ("status" in record || "close" in record || "price" in record) {
        const parsed = quoteEntrySchema.safeParse(record);
        const firstSymbol = mappings[0]?.providerSymbol;
        if (parsed.success && parsed.data.symbol) {
          bySymbol.set(parsed.data.symbol, parsed.data);
        } else if (parsed.success && firstSymbol) {
          bySymbol.set(firstSymbol, parsed.data);
        }
      } else {
        for (const [key, value] of Object.entries(record)) {
          const parsed = quoteEntrySchema.safeParse(value);
          if (parsed.success) bySymbol.set(key, parsed.data);
        }
      }
    }

    let upserted = 0;
    for (const mapping of mappings) {
      const entry = bySymbol.get(mapping.providerSymbol);
      if (!entry || entry.status === "error") continue;
      const price = entry.close ?? entry.price;
      if (!price || !Number.isFinite(price)) continue;
      const observedAt = entry.timestamp
        ? new Date(entry.timestamp * 1000)
        : new Date();

      await prisma.instrumentQuote.upsert({
        where: {
          instrumentId_provider: {
            instrumentId: mapping.instrumentId,
            provider: "TWELVE_DATA",
          },
        },
        create: {
          instrumentId: mapping.instrumentId,
          provider: "TWELVE_DATA",
          price,
          changePct24h: entry.percent_change ?? null,
          currency: entry.currency ?? mapping.instrument.quoteCurrency,
          quality: "DELAYED",
          observedAt,
          metadata: { plan: "free-tier keyed prototype" },
        },
        update: {
          price,
          changePct24h: entry.percent_change ?? null,
          quality: "DELAYED",
          observedAt,
          receivedAt: new Date(),
        },
      });
      upserted += 1;
    }
    return { attempted: mappings.length, upserted, budget };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Twelve Data failed";
    await recordProviderFailure("TWELVE_DATA", message);
    throw error;
  }
}
