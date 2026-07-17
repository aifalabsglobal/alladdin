import "server-only";

import type { AssetClass, InstrumentTier, Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { dayChangePct } from "@/lib/format";

export type AssetListFilters = {
  query?: string;
  assetClass?: AssetClass;
  tier?: InstrumentTier;
  venue?: string;
  page?: number;
  pageSize?: number;
};

export type AssetListItem = {
  id: string;
  symbol: string;
  name: string;
  assetClass: AssetClass;
  tier: InstrumentTier;
  venueCode: string;
  venueName: string;
  currency: string;
  sessionType: string;
  close: number | null;
  changePct: number | null;
  asOf: Date | null;
  source: string | null;
  healthScore: number | null;
  providerCount: number;
};

export async function getAssetList(filters: AssetListFilters = {}) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(10, filters.pageSize ?? 30));
  const where: Prisma.InstrumentWhereInput = {
    isActive: true,
    ...(filters.assetClass ? { assetClass: filters.assetClass } : {}),
    ...(filters.tier ? { tier: filters.tier } : {}),
    ...(filters.venue ? { venue: { code: filters.venue } } : {}),
    ...(filters.query
      ? {
          OR: [
            { symbol: { contains: filters.query, mode: "insensitive" } },
            { name: { contains: filters.query, mode: "insensitive" } },
            {
              venue: {
                name: { contains: filters.query, mode: "insensitive" },
              },
            },
          ],
        }
      : {}),
  };

  const [total, instruments] = await Promise.all([
    prisma.instrument.count({ where }),
    prisma.instrument.findMany({
      where,
      include: {
        venue: true,
        providerMappings: {
          where: { enabled: true },
          select: { provider: true },
        },
        quotes: { orderBy: { observedAt: "desc" }, take: 1 },
        bars: { orderBy: { openTime: "desc" }, take: 2 },
        stock: {
          include: {
            priceBars: { orderBy: { date: "desc" }, take: 2 },
            healthScores: { orderBy: { date: "desc" }, take: 1 },
          },
        },
      },
      orderBy: [{ tier: "asc" }, { assetClass: "asc" }, { symbol: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const items: AssetListItem[] = instruments.map((instrument) => {
    const quote = instrument.quotes[0];
    const observed = instrument.bars[0];
    const previous = instrument.bars[1];
    const legacyObserved = instrument.stock?.priceBars[0];
    const legacyPrevious = instrument.stock?.priceBars[1];
    const close = quote?.price ?? observed?.close ?? legacyObserved?.close ?? null;
    const previousClose = previous?.close ?? legacyPrevious?.close ?? null;

    return {
      id: instrument.id,
      symbol: instrument.symbol,
      name: instrument.name,
      assetClass: instrument.assetClass,
      tier: instrument.tier,
      venueCode: instrument.venue?.code ?? "OTC",
      venueName: instrument.venue?.name ?? "Venue unavailable",
      currency: instrument.quoteCurrency,
      sessionType: instrument.venue?.sessionType ?? "EXCHANGE",
      close,
      changePct:
        quote?.changePct24h ??
        (close !== null && previousClose !== null
          ? dayChangePct(close, previousClose)
          : null),
      asOf: quote?.observedAt ?? observed?.openTime ?? legacyObserved?.date ?? null,
      source:
        quote?.provider ??
        observed?.provider ??
        (legacyObserved ? legacyObserved.dataSource : null),
      healthScore: instrument.stock?.healthScores[0]?.score ?? null,
      providerCount: instrument.providerMappings.length,
    };
  });

  return {
    items,
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getAssetDetail(id: string) {
  return prisma.instrument.findUnique({
    where: { id },
    include: {
      venue: true,
      providerMappings: {
        where: { enabled: true },
        orderBy: { provider: "asc" },
      },
      quotes: { orderBy: { observedAt: "desc" } },
      bars: {
        orderBy: { openTime: "desc" },
        take: 180,
      },
      predictions: {
        where: { mlModel: { status: "ACTIVE" } },
        include: { mlModel: true },
        orderBy: { asOf: "desc" },
        take: 12,
      },
      stock: {
        include: {
          sector: true,
          priceBars: { orderBy: { date: "desc" }, take: 90 },
          healthScores: { orderBy: { date: "desc" }, take: 1 },
          predictions: {
            include: { mlModel: true },
            orderBy: { asOf: "desc" },
            take: 12,
          },
        },
      },
    },
  });
}

export async function searchAssets(query: string, limit = 8) {
  const q = query.trim();
  if (q.length < 1) return [];

  return prisma.instrument.findMany({
    where: {
      isActive: true,
      OR: [
        { symbol: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
      ],
    },
    include: { venue: true },
    orderBy: [{ tier: "asc" }, { symbol: "asc" }],
    take: Math.min(20, Math.max(1, limit)),
  });
}

export async function getGlobalMarketSummary() {
  const [classCounts, quotes, venues] = await Promise.all([
    prisma.instrument.groupBy({
      by: ["assetClass"],
      where: { isActive: true },
      _count: { _all: true },
    }),
    prisma.instrumentQuote.findMany({
      include: { instrument: { include: { venue: true } } },
      orderBy: { observedAt: "desc" },
      take: 12,
    }),
    prisma.venue.findMany({
      where: { code: { in: ["XNSE", "XNAS", "XNYS", "FX", "CRYPTO"] } },
      orderBy: { code: "asc" },
    }),
  ]);
  return { classCounts, quotes, venues };
}
