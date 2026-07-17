import "server-only";

import type { InfluencerCategory, InfluencerScope } from "@prisma/client";

import { prisma } from "@/lib/db";

export type InfluencerCatalogItem = {
  key: string;
  name: string;
  category: InfluencerCategory;
  scope: InfluencerScope;
  weight: number;
  description: string;
  avgImpact: number | null;
  strongestPositive: { symbol: string; reasonText: string } | null;
  strongestNegative: { symbol: string; reasonText: string } | null;
};

export async function getInfluencerCatalog(): Promise<{
  asOf: Date | null;
  items: InfluencerCatalogItem[];
}> {
  const influencers = await prisma.influencer.findMany({
    orderBy: [{ category: "asc" }, { defaultWeight: "desc" }],
  });

  const latest = await prisma.influencerReading.findFirst({
    orderBy: { date: "desc" },
    select: { date: true },
  });

  const readings = latest
    ? await prisma.influencerReading.findMany({
        where: { date: latest.date },
        include: { stock: { select: { symbol: true } } },
      })
    : [];

  const byInfluencer = new Map<string, typeof readings>();
  for (const r of readings) {
    const list = byInfluencer.get(r.influencerId) ?? [];
    list.push(r);
    byInfluencer.set(r.influencerId, list);
  }

  const items = influencers.map((inf) => {
    const rows = byInfluencer.get(inf.id) ?? [];
    const avg =
      rows.length > 0
        ? rows.reduce((s, r) => s + r.impactPoints, 0) / rows.length
        : null;

    const sorted = [...rows].sort((a, b) => b.impactPoints - a.impactPoints);
    const pos = sorted[0];
    const neg = sorted[sorted.length - 1];

    return {
      key: inf.key,
      name: inf.name,
      category: inf.category,
      scope: inf.scope,
      weight: inf.defaultWeight,
      description: inf.description,
      avgImpact: avg,
      strongestPositive:
        pos && pos.impactPoints > 0
          ? { symbol: pos.stock?.symbol ?? "Market", reasonText: pos.reasonText }
          : null,
      strongestNegative:
        neg && neg.impactPoints < 0
          ? { symbol: neg.stock?.symbol ?? "Market", reasonText: neg.reasonText }
          : null,
    };
  });

  return { asOf: latest?.date ?? null, items };
}
