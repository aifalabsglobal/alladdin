import "server-only";

import { prisma } from "@/lib/db";
import { dayChangePct } from "@/lib/format";
import { parseBreakdown } from "@/lib/queries/parsers";

export type MarketOverview = {
  asOf: Date;
  marketHealthScore: number;
  niftyClose: number;
  niftyChangePct: number | null;
  sensexClose: number;
  sensexChangePct: number | null;
  fiiNet: number;
  diiNet: number;
  indiaVix: number;
  advancers: number;
  decliners: number;
};

export async function getMarketOverview(): Promise<MarketOverview | null> {
  const snapshots = await prisma.marketSnapshot.findMany({
    orderBy: { date: "desc" },
    take: 2,
  });
  const latest = snapshots[0];
  if (!latest) return null;
  const prev = snapshots[1];

  return {
    asOf: latest.date,
    marketHealthScore: latest.marketHealthScore,
    niftyClose: latest.niftyClose,
    niftyChangePct: prev ? dayChangePct(latest.niftyClose, prev.niftyClose) : null,
    sensexClose: latest.sensexClose,
    sensexChangePct: prev
      ? dayChangePct(latest.sensexClose, prev.sensexClose)
      : null,
    fiiNet: latest.fiiNet,
    diiNet: latest.diiNet,
    indiaVix: latest.indiaVix,
    advancers: latest.breadthAdvancers,
    decliners: latest.breadthDecliners,
  };
}

export type MarketSparklines = {
  nifty: number[];
  sensex: number[];
};

export async function getMarketSparklines(days = 30): Promise<MarketSparklines> {
  const rows = await prisma.marketSnapshot.findMany({
    orderBy: { date: "desc" },
    take: days,
    select: { niftyClose: true, sensexClose: true },
  });
  rows.reverse();
  return {
    nifty: rows.map((r) => r.niftyClose),
    sensex: rows.map((r) => r.sensexClose),
  };
}

export type StockMover = {
  symbol: string;
  name: string;
  sectorName: string;
  score: number;
  band: import("@prisma/client").HealthBand;
  scoreChange: number | null;
  reason: string | null;
};

/** Biggest health-score movers between the two most recent scored sessions. */
export async function getAttentionMovers(limit = 6): Promise<StockMover[]> {
  const latestScore = await prisma.healthScore.findFirst({
    orderBy: { date: "desc" },
    select: { date: true },
  });
  if (!latestScore) return [];

  const prevScore = await prisma.healthScore.findFirst({
    where: { date: { lt: latestScore.date } },
    orderBy: { date: "desc" },
    select: { date: true },
  });

  const [latestRows, prevRows] = await Promise.all([
    prisma.healthScore.findMany({
      where: { date: latestScore.date },
      include: {
        stock: { include: { sector: true } },
        topPositiveInfluencer: true,
        topNegativeInfluencer: true,
      },
    }),
    prevScore
      ? prisma.healthScore.findMany({
          where: { date: prevScore.date },
          select: { stockId: true, score: true },
        })
      : Promise.resolve([]),
  ]);

  const prevByStock = new Map(prevRows.map((r) => [r.stockId, r.score]));

  const movers = latestRows.map((row) => {
    const prev = prevByStock.get(row.stockId);
    const change = prev === undefined ? null : row.score - prev;
    const breakdown = parseBreakdown(row.breakdown);
    const driver =
      change !== null && change < 0
        ? breakdown.filter((b) => b.impactPoints < 0).sort((a, b) => a.impactPoints - b.impactPoints)[0]
        : breakdown.filter((b) => b.impactPoints > 0).sort((a, b) => b.impactPoints - a.impactPoints)[0];

    return {
      symbol: row.stock.symbol,
      name: row.stock.name,
      sectorName: row.stock.sector.name,
      score: row.score,
      band: row.band,
      scoreChange: change,
      reason: driver?.reasonText ?? null,
    };
  });

  return movers
    .filter((m) => m.scoreChange !== null)
    .sort((a, b) => Math.abs(b.scoreChange ?? 0) - Math.abs(a.scoreChange ?? 0))
    .slice(0, limit);
}

export type RankedStock = {
  symbol: string;
  name: string;
  sectorName: string;
  score: number;
  band: import("@prisma/client").HealthBand;
};

export async function getTopAndBottomStocks(count = 5): Promise<{
  top: RankedStock[];
  bottom: RankedStock[];
}> {
  const latest = await prisma.healthScore.findFirst({
    orderBy: { date: "desc" },
    select: { date: true },
  });
  if (!latest) return { top: [], bottom: [] };

  const rows = await prisma.healthScore.findMany({
    where: { date: latest.date },
    include: { stock: { include: { sector: true } } },
    orderBy: { score: "desc" },
  });

  const toRanked = (r: (typeof rows)[number]): RankedStock => ({
    symbol: r.stock.symbol,
    name: r.stock.name,
    sectorName: r.stock.sector.name,
    score: r.score,
    band: r.band,
  });

  return {
    top: rows.slice(0, count).map(toRanked),
    bottom: rows.slice(-count).reverse().map(toRanked),
  };
}

export type MarketInfluencerReading = {
  key: string;
  name: string;
  category: string;
  impactPoints: number;
  reasonText: string;
};

/**
 * Market-scope influencers are seeded per stock; dedupe by influencer key
 * using the average impact across stocks for the latest session.
 */
export async function getMarketInfluencers(limit = 5): Promise<MarketInfluencerReading[]> {
  const latest = await prisma.influencerReading.findFirst({
    orderBy: { date: "desc" },
    select: { date: true },
  });
  if (!latest) return [];

  const readings = await prisma.influencerReading.findMany({
    where: {
      date: latest.date,
      influencer: { scope: { in: ["MARKET", "SECTOR"] } },
    },
    include: { influencer: true },
  });

  const grouped = new Map<
    string,
    { name: string; category: string; total: number; count: number; sample: string }
  >();

  for (const r of readings) {
    const entry = grouped.get(r.influencer.key) ?? {
      name: r.influencer.name,
      category: r.influencer.category,
      total: 0,
      count: 0,
      sample: r.reasonText,
    };
    entry.total += r.impactPoints;
    entry.count += 1;
    grouped.set(r.influencer.key, entry);
  }

  return [...grouped.entries()]
    .map(([key, g]) => ({
      key,
      name: g.name,
      category: g.category,
      impactPoints: g.total / g.count,
      reasonText: g.sample,
    }))
    .sort((a, b) => Math.abs(b.impactPoints) - Math.abs(a.impactPoints))
    .slice(0, limit);
}
