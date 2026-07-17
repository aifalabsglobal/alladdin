import "server-only";

import { z } from "zod";

import { prisma } from "@/lib/db";
import { getServerEnv } from "@/lib/env";
import { PROVIDER_POLICIES } from "@/lib/market/policy";
import {
  recordProviderFailure,
  reserveProviderCredits,
} from "@/lib/market/providers/budget";

const globalQuoteSchema = z.object({
  "Global Quote": z
    .object({
      "01. symbol": z.string().optional(),
      "05. price": z.coerce.number().positive().optional(),
      "10. change percent": z.string().optional(),
    })
    .optional(),
  Note: z.string().optional(),
  Information: z.string().optional(),
});

function parseChangePercent(value: string | undefined): number | null {
  if (!value) return null;
  const numeric = Number.parseFloat(value.replace("%", "").trim());
  return Number.isFinite(numeric) ? numeric : null;
}

/**
 * Alpha Vantage GLOBAL_QUOTE, one symbol per request. Gated on
 * ALPHA_VANTAGE_API_KEY and strictly rate limited (25/day free). Used as a
 * low-frequency research fallback, never a live ticker.
 */
export async function ingestAlphaVantageQuotes() {
  const env = getServerEnv();
  if (!env.ALPHA_VANTAGE_API_KEY) {
    return { attempted: 0, upserted: 0, skipped: "no api key" as const };
  }

  const perRun = PROVIDER_POLICIES.ALPHA_VANTAGE?.minuteCredits ?? 5;
  const mappings = await prisma.providerInstrument.findMany({
    where: {
      provider: "ALPHA_VANTAGE",
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

  let attempted = 0;
  let upserted = 0;
  try {
    for (const mapping of mappings) {
      const budget = await reserveProviderCredits("ALPHA_VANTAGE");
      if (!budget.allowed) break;
      attempted += 1;

      const response = await fetch(
        `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(mapping.providerSymbol)}&apikey=${encodeURIComponent(env.ALPHA_VANTAGE_API_KEY)}`,
        { signal: AbortSignal.timeout(12_000), cache: "no-store" },
      );
      if (!response.ok) throw new Error(`Alpha Vantage HTTP ${response.status}`);

      const parsed = globalQuoteSchema.safeParse(await response.json());
      if (!parsed.success) throw new Error("Alpha Vantage response shape changed");
      if (parsed.data.Note || parsed.data.Information) {
        throw new Error(parsed.data.Note ?? parsed.data.Information ?? "rate limited");
      }
      const price = parsed.data["Global Quote"]?.["05. price"];
      if (!price || !Number.isFinite(price)) continue;

      await prisma.instrumentQuote.upsert({
        where: {
          instrumentId_provider: {
            instrumentId: mapping.instrumentId,
            provider: "ALPHA_VANTAGE",
          },
        },
        create: {
          instrumentId: mapping.instrumentId,
          provider: "ALPHA_VANTAGE",
          price,
          changePct24h: parseChangePercent(
            parsed.data["Global Quote"]?.["10. change percent"],
          ),
          currency: mapping.instrument.quoteCurrency,
          quality: "DELAYED",
          observedAt: new Date(),
          metadata: { function: "GLOBAL_QUOTE", plan: "free-tier fallback" },
        },
        update: {
          price,
          changePct24h: parseChangePercent(
            parsed.data["Global Quote"]?.["10. change percent"],
          ),
          quality: "DELAYED",
          observedAt: new Date(),
          receivedAt: new Date(),
        },
      });
      upserted += 1;
    }
    return { attempted, upserted };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Alpha Vantage failed";
    await recordProviderFailure("ALPHA_VANTAGE", message);
    throw error;
  }
}
