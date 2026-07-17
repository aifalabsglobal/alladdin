import "server-only";

import type {
  Direction,
  HealthBand,
  PredictionHorizon,
} from "@prisma/client";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { dayChangePct } from "@/lib/format";
import {
  parseBreakdown,
  parseModelMetrics,
  type BreakdownItem,
} from "@/lib/queries/parsers";

export type StockListItem = {
  symbol: string;
  name: string;
  exchange: string;
  sectorId: string;
  sectorName: string;
  close: number | null;
  changePct: number | null;
  score: number | null;
  band: HealthBand | null;
  healthSeries: number[];
  topInfluencer: string | null;
};

export type StockListFilters = {
  query?: string;
  sectorId?: string;
  band?: HealthBand;
  page?: number;
  pageSize?: number;
};

export type StockListResult = {
  items: StockListItem[];
  total: number;
  page: number;
  pageCount: number;
};

export async function getStockList(
  filters: StockListFilters = {},
): Promise<StockListResult> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(50, Math.max(5, filters.pageSize ?? 20));

  const where: Prisma.StockWhereInput = {
    isActive: true,
    ...(filters.sectorId ? { sectorId: filters.sectorId } : {}),
    ...(filters.query
      ? {
          OR: [
            { symbol: { contains: filters.query, mode: "insensitive" } },
            { name: { contains: filters.query, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const stocks = await prisma.stock.findMany({
    where,
    include: {
      sector: true,
      priceBars: { orderBy: { date: "desc" }, take: 2 },
      healthScores: { orderBy: { date: "desc" }, take: 30 },
    },
    orderBy: { symbol: "asc" },
  });

  let items: StockListItem[] = stocks.map((s) => {
    const latestBar = s.priceBars[0];
    const prevBar = s.priceBars[1];
    const latestScore = s.healthScores[0];
    const breakdown = latestScore ? parseBreakdown(latestScore.breakdown) : [];
    const top = [...breakdown].sort(
      (a, b) => Math.abs(b.impactPoints) - Math.abs(a.impactPoints),
    )[0];

    return {
      symbol: s.symbol,
      name: s.name,
      exchange: s.exchange,
      sectorId: s.sectorId,
      sectorName: s.sector.name,
      close: latestBar?.close ?? null,
      changePct:
        latestBar && prevBar ? dayChangePct(latestBar.close, prevBar.close) : null,
      score: latestScore?.score ?? null,
      band: latestScore?.band ?? null,
      healthSeries: [...s.healthScores].reverse().map((h) => h.score),
      topInfluencer: top?.name ?? null,
    };
  });

  if (filters.band) {
    items = items.filter((i) => i.band === filters.band);
  }

  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount);

  return {
    items: items.slice((safePage - 1) * pageSize, safePage * pageSize),
    total,
    page: safePage,
    pageCount,
  };
}

export type StockPrediction = {
  horizon: PredictionHorizon;
  direction: Direction;
  confidence: number;
  modelKey: string;
  modelVersion: string;
  accuracy: number | null;
};

export type StockNews = {
  title: string;
  source: string;
  url: string;
  publishedAt: Date;
  sentiment: number | null;
  sentimentReason: string | null;
};

export type PeerStock = {
  symbol: string;
  name: string;
  score: number | null;
  band: HealthBand | null;
  pe: number | null;
};

export type StockDetail = {
  symbol: string;
  name: string;
  exchange: string;
  sectorId: string;
  sectorName: string;
  industry: string | null;
  marketCap: number | null;
  asOf: Date | null;
  close: number | null;
  changePct: number | null;
  score: number | null;
  band: HealthBand | null;
  breakdown: BreakdownItem[];
  chart: { date: Date; close: number; health: number }[];
  predictions: StockPrediction[];
  news: StockNews[];
  fundamentals: {
    pe: number | null;
    pb: number | null;
    eps: number | null;
    epsGrowthYoY: number | null;
    debtToEquity: number | null;
    roe: number | null;
    sectorMedianPe: number | null;
  } | null;
  peers: PeerStock[];
};

export async function getStockDetail(symbol: string): Promise<StockDetail | null> {
  const stock = await prisma.stock.findUnique({
    where: { symbol },
    include: {
      sector: true,
      priceBars: { orderBy: { date: "desc" }, take: 90 },
      healthScores: { orderBy: { date: "desc" }, take: 90 },
      fundamentals: { orderBy: { asOfDate: "desc" }, take: 1 },
      newsItems: { orderBy: { publishedAt: "desc" }, take: 5 },
    },
  });
  if (!stock) return null;

  const latestBar = stock.priceBars[0];
  const prevBar = stock.priceBars[1];
  const latestScore = stock.healthScores[0];

  // Latest prediction per horizon
  const latestPredictionDate = await prisma.prediction.findFirst({
    where: { stockId: stock.id },
    orderBy: { date: "desc" },
    select: { date: true },
  });

  const predictions = latestPredictionDate
    ? await prisma.prediction.findMany({
        where: { stockId: stock.id, date: latestPredictionDate.date },
        include: { mlModel: true },
        orderBy: { horizon: "asc" },
      })
    : [];

  // Peer comparison within sector
  const peers = await prisma.stock.findMany({
    where: { sectorId: stock.sectorId, isActive: true, NOT: { id: stock.id } },
    include: {
      healthScores: { orderBy: { date: "desc" }, take: 1 },
      fundamentals: { orderBy: { asOfDate: "desc" }, take: 1 },
    },
    take: 5,
    orderBy: { marketCap: "desc" },
  });

  const sectorFundamentals = await prisma.fundamental.findMany({
    where: { stock: { sectorId: stock.sectorId } },
    orderBy: { asOfDate: "desc" },
    take: 50,
    select: { pe: true },
  });
  const peValues = sectorFundamentals
    .map((f) => f.pe)
    .filter((v): v is number => v !== null)
    .sort((a, b) => a - b);
  const sectorMedianPe =
    peValues.length > 0 ? peValues[Math.floor(peValues.length / 2)]! : null;

  const healthByDate = new Map(
    stock.healthScores.map((h) => [h.date.getTime(), h.score]),
  );

  const chart = [...stock.priceBars]
    .reverse()
    .map((bar) => ({
      date: bar.date,
      close: bar.close,
      health: healthByDate.get(bar.date.getTime()) ?? 50,
    }));

  const fundamental = stock.fundamentals[0] ?? null;

  return {
    symbol: stock.symbol,
    name: stock.name,
    exchange: stock.exchange,
    sectorId: stock.sectorId,
    sectorName: stock.sector.name,
    industry: stock.industry,
    marketCap: stock.marketCap,
    asOf: latestBar?.date ?? null,
    close: latestBar?.close ?? null,
    changePct:
      latestBar && prevBar ? dayChangePct(latestBar.close, prevBar.close) : null,
    score: latestScore?.score ?? null,
    band: latestScore?.band ?? null,
    breakdown: latestScore
      ? parseBreakdown(latestScore.breakdown).sort(
          (a, b) => b.impactPoints - a.impactPoints,
        )
      : [],
    chart,
    predictions: predictions.map((p) => {
      const metrics = parseModelMetrics(p.mlModel.metrics);
      return {
        horizon: p.horizon,
        direction: p.direction,
        confidence: p.confidence,
        modelKey: p.mlModel.key,
        modelVersion: p.mlModel.version,
        accuracy: metrics?.accuracy?.[p.horizon] ?? null,
      };
    }),
    news: stock.newsItems.map((n) => ({
      title: n.title,
      source: n.source,
      url: n.url,
      publishedAt: n.publishedAt,
      sentiment: n.sentiment,
      sentimentReason: n.sentimentReason,
    })),
    fundamentals: fundamental
      ? {
          pe: fundamental.pe,
          pb: fundamental.pb,
          eps: fundamental.eps,
          epsGrowthYoY: fundamental.epsGrowthYoY,
          debtToEquity: fundamental.debtToEquity,
          roe: fundamental.roe,
          sectorMedianPe,
        }
      : null,
    peers: peers.map((p) => ({
      symbol: p.symbol,
      name: p.name,
      score: p.healthScores[0]?.score ?? null,
      band: p.healthScores[0]?.band ?? null,
      pe: p.fundamentals[0]?.pe ?? null,
    })),
  };
}
