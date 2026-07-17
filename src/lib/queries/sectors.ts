import "server-only";

import type { HealthBand } from "@prisma/client";

import { prisma } from "@/lib/db";
import { dayChangePct } from "@/lib/format";
import { bandFromScore } from "@/lib/scoring/bands";

export type SectorSummary = {
  id: string;
  name: string;
  healthScore: number | null;
  band: HealthBand | null;
  stockCount: number;
};

export async function getSectorSummaries(): Promise<SectorSummary[]> {
  const sectors = await prisma.sector.findMany({
    include: { _count: { select: { stocks: true } } },
    orderBy: { healthScore: "desc" },
  });

  return sectors.map((s) => ({
    id: s.id,
    name: s.name,
    healthScore: s.healthScore,
    band: s.healthScore === null ? null : bandFromScore(s.healthScore),
    stockCount: s._count.stocks,
  }));
}

export type SectorConstituent = {
  symbol: string;
  name: string;
  close: number | null;
  changePct: number | null;
  score: number | null;
  band: HealthBand | null;
};

export type SectorDetail = {
  id: string;
  name: string;
  healthScore: number | null;
  band: HealthBand | null;
  healthTrend: { date: Date; avgScore: number }[];
  constituents: SectorConstituent[];
  momentumReadings: { reasonText: string; impactPoints: number; symbol: string }[];
};

export async function getSectorDetail(id: string): Promise<SectorDetail | null> {
  const sector = await prisma.sector.findUnique({
    where: { id },
    include: {
      stocks: {
        where: { isActive: true },
        include: {
          priceBars: { orderBy: { date: "desc" }, take: 2 },
          healthScores: { orderBy: { date: "desc" }, take: 1 },
        },
        orderBy: { symbol: "asc" },
      },
    },
  });
  if (!sector) return null;

  const stockIds = sector.stocks.map((s) => s.id);

  const trendRows = await prisma.healthScore.groupBy({
    by: ["date"],
    where: { stockId: { in: stockIds } },
    _avg: { score: true },
    orderBy: { date: "asc" },
  });

  const latestReading = await prisma.influencerReading.findFirst({
    where: { influencer: { key: "sector_momentum" }, stockId: { in: stockIds } },
    orderBy: { date: "desc" },
    select: { date: true },
  });

  const momentum = latestReading
    ? await prisma.influencerReading.findMany({
        where: {
          influencer: { key: "sector_momentum" },
          stockId: { in: stockIds },
          date: latestReading.date,
        },
        include: { stock: { select: { symbol: true } } },
        orderBy: { impactPoints: "desc" },
        take: 6,
      })
    : [];

  const constituents: SectorConstituent[] = sector.stocks
    .map((s) => {
      const latestBar = s.priceBars[0];
      const prevBar = s.priceBars[1];
      const score = s.healthScores[0];
      return {
        symbol: s.symbol,
        name: s.name,
        close: latestBar?.close ?? null,
        changePct:
          latestBar && prevBar ? dayChangePct(latestBar.close, prevBar.close) : null,
        score: score?.score ?? null,
        band: score?.band ?? null,
      };
    })
    .sort((a, b) => (b.score ?? -1) - (a.score ?? -1));

  return {
    id: sector.id,
    name: sector.name,
    healthScore: sector.healthScore,
    band: sector.healthScore === null ? null : bandFromScore(sector.healthScore),
    healthTrend: trendRows.map((r) => ({
      date: r.date,
      avgScore: r._avg.score ?? 0,
    })),
    constituents,
    momentumReadings: momentum.map((m) => ({
      reasonText: m.reasonText,
      impactPoints: m.impactPoints,
      symbol: m.stock?.symbol ?? "—",
    })),
  };
}
