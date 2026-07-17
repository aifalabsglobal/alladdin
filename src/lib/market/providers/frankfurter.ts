import "server-only";

import { z } from "zod";

import { prisma } from "@/lib/db";
import {
  recordProviderFailure,
  reserveProviderCredits,
} from "@/lib/market/providers/budget";

const responseSchema = z.object({
  date: z.string(),
  base: z.string(),
  rates: z.record(z.string(), z.number().positive()),
});

export async function ingestReferenceFxQuotes() {
  const instruments = await prisma.instrument.findMany({
    where: {
      assetClass: "FX",
      isActive: true,
      baseCurrency: { not: null },
    },
  });
  if (instruments.length === 0) return { attempted: 0, upserted: 0 };

  await reserveProviderCredits("FRANKFURTER");
  try {
    const response = await fetch("https://api.frankfurter.dev/v1/latest", {
      signal: AbortSignal.timeout(12_000),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Frankfurter HTTP ${response.status}`);
    const parsed = responseSchema.safeParse(await response.json());
    if (!parsed.success) throw new Error("Frankfurter response shape changed");

    const rates = { ...parsed.data.rates, [parsed.data.base]: 1 };
    const observedAt = new Date(`${parsed.data.date}T16:00:00.000Z`);
    let upserted = 0;
    for (const instrument of instruments) {
      const base = instrument.baseCurrency;
      if (!base) continue;
      const baseRate = rates[base];
      const quoteRate = rates[instrument.quoteCurrency];
      if (!baseRate || !quoteRate) continue;
      const price = quoteRate / baseRate;

      await prisma.instrumentQuote.upsert({
        where: {
          instrumentId_provider: {
            instrumentId: instrument.id,
            provider: "FRANKFURTER",
          },
        },
        create: {
          instrumentId: instrument.id,
          provider: "FRANKFURTER",
          price,
          currency: instrument.quoteCurrency,
          quality: "DELAYED",
          observedAt,
          metadata: {
            kind: "central-bank reference rate",
            notForTransactionUse: true,
          },
        },
        update: {
          price,
          currency: instrument.quoteCurrency,
          quality: "DELAYED",
          observedAt,
          receivedAt: new Date(),
        },
      });
      upserted += 1;
    }
    return { attempted: instruments.length, upserted };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Frankfurter failed";
    await recordProviderFailure("FRANKFURTER", message);
    throw error;
  }
}
