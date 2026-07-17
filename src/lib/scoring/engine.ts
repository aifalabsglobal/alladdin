import "server-only";

import { DataSource, type Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import {
  computeHealthScore,
  V1_INFLUENCERS,
  type InfluencerContribution,
} from "@/lib/scoring/compute";
import {
  currencyCrudeSignal,
  epsGrowthSignal,
  fiiFlowSignal,
  indiaVixSignal,
  leverageSignal,
  newsSentimentSignal,
  rsiSignal,
  sectorMomentumSignal,
  trendMaSignal,
  valuationPeSignal,
  volumeDeliverySignal,
  type SignalResult,
} from "@/lib/scoring/influencers";
import {
  dateDiffDays,
  percentChange,
} from "@/lib/scoring/indicators";
import { sensitivityFor } from "@/lib/scoring/sensitivity";

export const SCORING_ENGINE_VERSION = "health-v1.0.0";
const REAL_PRICE_SOURCES: DataSource[] = [
  DataSource.NSE_BHAVCOPY,
  DataSource.YAHOO_FINANCE,
];
type InfluencerKey = (typeof V1_INFLUENCERS)[number]["key"];

type PricePoint = { date: Date; close: number };

function utcDateOnly(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function buildEqualWeightIndex(series: PricePoint[][]): PricePoint[] {
  const returnsByDate = new Map<number, number[]>();
  for (const points of series) {
    for (let i = 1; i < points.length; i += 1) {
      const current = points[i];
      const previous = points[i - 1];
      if (!current || !previous) continue;
      const key = current.date.getTime();
      const list = returnsByDate.get(key) ?? [];
      list.push(percentChange(current.close, previous.close) / 100);
      returnsByDate.set(key, list);
    }
  }

  let level = 100;
  return [...returnsByDate.entries()]
    .sort(([a], [b]) => a - b)
    .map(([timestamp, returns]) => {
      level *=
        1 + returns.reduce((sum, value) => sum + value, 0) / returns.length;
      return { date: new Date(timestamp), close: level };
    });
}

function macroValues(
  macro: { key: string; date: Date; value: number }[],
  key: string,
): number[] {
  return macro
    .filter((row) => row.key === key)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((row) => row.value);
}

function macroChanges(
  macro: { key: string; date: Date; value: number }[],
  key: string,
): number[] {
  const values = macroValues(macro, key);
  const changes: number[] = [];
  for (let i = 1; i < values.length; i += 1) {
    changes.push(percentChange(values[i] ?? 0, values[i - 1] ?? 0));
  }
  return changes;
}

export type ScoringRunSummary = {
  asOf: string;
  engineVersion: string;
  stocksScored: number;
  readingsUpserted: number;
  averageConfidence: number;
  fallbackCounts: Record<string, number>;
};

/**
 * Point-in-time, deterministic scoring pass.
 * Only data dated <= asOf is loaded; all writes use unique-key upserts.
 */
export async function runScoring(
  requestedDate?: Date,
): Promise<ScoringRunSummary> {
  const latestRealBar = await prisma.priceBar.findFirst({
    where: { dataSource: { in: REAL_PRICE_SOURCES } },
    orderBy: { date: "desc" },
    select: { date: true },
  });
  if (!latestRealBar) throw new Error("No real price bars available to score");

  const asOf = utcDateOnly(requestedDate ?? latestRealBar.date);
  if (asOf > latestRealBar.date) {
    throw new Error(
      `Cannot score after latest real bar ${latestRealBar.date.toISOString().slice(0, 10)}`,
    );
  }

  const [stocks, influencers, macro] = await Promise.all([
    prisma.stock.findMany({
      where: { isActive: true },
      include: {
        sector: true,
        priceBars: {
          where: {
            date: { lte: asOf },
            dataSource: { in: REAL_PRICE_SOURCES },
          },
          orderBy: { date: "desc" },
          take: 250,
        },
        fundamentals: {
          where: {
            asOfDate: { lte: asOf },
            dataSource: { not: DataSource.SYNTHETIC },
          },
          orderBy: { asOfDate: "desc" },
          take: 1,
        },
        newsItems: {
          where: {
            source: { not: "SYNTHETIC" },
            sentiment: { not: null },
            publishedAt: {
              lte: new Date(asOf.getTime() + 86_399_999),
              gte: new Date(asOf.getTime() - 7 * 86_400_000),
            },
          },
          orderBy: { publishedAt: "desc" },
        },
      },
    }),
    prisma.influencer.findMany(),
    prisma.macroIndicator.findMany({
      where: { date: { lte: asOf } },
      orderBy: { date: "asc" },
      take: 500,
      select: { key: true, date: true, value: true },
    }),
  ]);

  const influencerByKey = new Map(influencers.map((item) => [item.key, item]));
  const stockSeries = new Map(
    stocks.map((stock) => [
      stock.id,
      [...stock.priceBars]
        .reverse()
        .map((bar) => ({ date: bar.date, close: bar.close })),
    ]),
  );
  const marketProxy = buildEqualWeightIndex([...stockSeries.values()]);

  const sectorIndexes = new Map<string, PricePoint[]>();
  for (const stock of stocks) {
    const existing = sectorIndexes.get(stock.sectorId);
    if (existing) continue;
    const peerSeries = stocks
      .filter((peer) => peer.sectorId === stock.sectorId)
      .map((peer) => stockSeries.get(peer.id) ?? []);
    sectorIndexes.set(stock.sectorId, buildEqualWeightIndex(peerSeries));
  }

  const realFundamentalsBySector = new Map<
    string,
    { epsGrowth: number[]; pe: number[]; leverage: number[] }
  >();
  for (const stock of stocks) {
    const bucket = realFundamentalsBySector.get(stock.sectorId) ?? {
      epsGrowth: [],
      pe: [],
      leverage: [],
    };
    const fundamental = stock.fundamentals[0];
    if (fundamental?.epsGrowthYoY !== null && fundamental?.epsGrowthYoY !== undefined) {
      bucket.epsGrowth.push(fundamental.epsGrowthYoY);
    }
    if (fundamental?.pe !== null && fundamental?.pe !== undefined) {
      bucket.pe.push(fundamental.pe);
    }
    if (
      fundamental?.debtToEquity !== null &&
      fundamental?.debtToEquity !== undefined
    ) {
      bucket.leverage.push(fundamental.debtToEquity);
    }
    realFundamentalsBySector.set(stock.sectorId, bucket);
  }

  const fiiValues = macroValues(macro, "fii_net");
  const vixRows = macro.filter((row) => row.key === "india_vix");
  const latestVix = vixRows.at(-1);
  const usdChanges = macroChanges(macro, "usd_inr");
  const crudeChanges = macroChanges(macro, "crude_brent");
  const niftyRows = macro
    .filter((row) => row.key === "nifty50")
    .map((row) => ({ date: row.date, close: row.value }));

  let readingsUpserted = 0;
  let confidenceTotal = 0;
  const fallbackCounts: Record<string, number> = {};
  const latestScoresBySector = new Map<string, number[]>();

  for (const stock of stocks) {
    const bars = [...stock.priceBars].reverse();
    const closes = bars.map((bar) => bar.close);
    const fundamental = stock.fundamentals[0] ?? null;
    const peerFundamentals = realFundamentalsBySector.get(stock.sectorId) ?? {
      epsGrowth: [],
      pe: [],
      leverage: [],
    };
    const sensitivity = sensitivityFor(stock.sector.name);
    const sectorIndex = sectorIndexes.get(stock.sectorId) ?? [];
    const benchmark = niftyRows.length >= 5 ? niftyRows : marketProxy;

    const signals: Record<InfluencerKey, SignalResult> = {
      trend_ma: trendMaSignal(closes),
      rsi_14: rsiSignal(closes),
      volume_delivery: volumeDeliverySignal(
        bars.map((bar) => ({
          volume: bar.volume,
          deliveryPct: bar.deliveryPct,
        })),
      ),
      eps_growth: epsGrowthSignal(
        fundamental?.epsGrowthYoY ?? null,
        peerFundamentals.epsGrowth,
      ),
      valuation_pe: valuationPeSignal(
        fundamental?.pe ?? null,
        peerFundamentals.pe,
      ),
      leverage: leverageSignal(
        fundamental?.debtToEquity ?? null,
        peerFundamentals.leverage,
      ),
      news_sentiment: newsSentimentSignal(
        stock.newsItems.flatMap((item) =>
          item.sentiment === null
            ? []
            : [
                {
                  sentiment: item.sentiment,
                  ageDays: dateDiffDays(asOf, item.publishedAt),
                },
              ],
        ),
      ),
      fii_flow: fiiFlowSignal(fiiValues, sensitivity),
      sector_momentum: sectorMomentumSignal(
        sectorIndex.map((point) => point.close),
        benchmark.map((point) => point.close),
        niftyRows.length < 5,
      ),
      india_vix: indiaVixSignal(
        latestVix?.value ?? null,
        latestVix ? dateDiffDays(asOf, latestVix.date) : 0,
      ),
      usd_inr_crude: currencyCrudeSignal(
        usdChanges,
        crudeChanges,
        sensitivity,
      ),
    };

    const contributions: Omit<InfluencerContribution, "impactPoints">[] =
      V1_INFLUENCERS.map((definition) => ({
        key: definition.key,
        name: definition.name,
        category: definition.category,
        weight: definition.defaultWeight,
        normalizedScore: signals[definition.key].normalizedScore,
        reasonText: signals[definition.key].reasonText,
      }));

    const computed = computeHealthScore(contributions);
    const confidence = V1_INFLUENCERS.reduce(
      (sum, definition) =>
        sum +
        definition.defaultWeight * signals[definition.key].dataQuality,
      0,
    );
    confidenceTotal += confidence;

    const enrichedBreakdown = computed.breakdown.map((item) => {
      const signal = signals[item.key as InfluencerKey];
      if (!signal) {
        throw new Error(`Missing signal calculation for ${item.key}`);
      }
      if (signal.isFallback) {
        fallbackCounts[item.key] = (fallbackCounts[item.key] ?? 0) + 1;
      }
      return {
        ...item,
        reasonText: `${signal.reasonText}: ${item.impactPoints >= 0 ? "+" : ""}${item.impactPoints.toFixed(1)} pts`,
        rawValue: signal.rawValue,
        dataQuality: Number(signal.dataQuality.toFixed(3)),
        provenance: signal.provenance,
        isFallback: signal.isFallback,
        engineVersion: SCORING_ENGINE_VERSION,
      };
    });

    const topPositiveId = computed.topPositiveKey
      ? influencerByKey.get(computed.topPositiveKey)?.id
      : null;
    const topNegativeId = computed.topNegativeKey
      ? influencerByKey.get(computed.topNegativeKey)?.id
      : null;

    await prisma.$transaction(
      async (tx) => {
        for (const item of enrichedBreakdown) {
          const influencer = influencerByKey.get(item.key);
          if (!influencer) {
            throw new Error(`Influencer ${item.key} is not seeded`);
          }
          await tx.influencerReading.upsert({
            where: {
              influencerId_stockId_date: {
                influencerId: influencer.id,
                stockId: stock.id,
                date: asOf,
              },
            },
            create: {
              influencerId: influencer.id,
              stockId: stock.id,
              sectorId:
                influencer.scope === "SECTOR" ? stock.sectorId : undefined,
              date: asOf,
              rawValue: item.rawValue,
              normalizedScore: item.normalizedScore,
              impactPoints: item.impactPoints,
              reasonText: item.reasonText,
              dataSource: DataSource.COMPUTED,
            },
            update: {
              sectorId:
                influencer.scope === "SECTOR" ? stock.sectorId : null,
              rawValue: item.rawValue,
              normalizedScore: item.normalizedScore,
              impactPoints: item.impactPoints,
              reasonText: item.reasonText,
              dataSource: DataSource.COMPUTED,
            },
          });
          readingsUpserted += 1;
        }

        await tx.healthScore.upsert({
          where: { stockId_date: { stockId: stock.id, date: asOf } },
          create: {
            stockId: stock.id,
            date: asOf,
            score: computed.score,
            band: computed.band,
            topPositiveInfluencerId: topPositiveId,
            topNegativeInfluencerId: topNegativeId,
            breakdown: enrichedBreakdown as unknown as Prisma.InputJsonValue,
            dataSource: DataSource.COMPUTED,
          },
          update: {
            score: computed.score,
            band: computed.band,
            topPositiveInfluencerId: topPositiveId,
            topNegativeInfluencerId: topNegativeId,
            breakdown: enrichedBreakdown as unknown as Prisma.InputJsonValue,
            dataSource: DataSource.COMPUTED,
          },
        });

        const normalizedFeatures = Object.fromEntries(
          enrichedBreakdown.map((item) => [item.key, item.normalizedScore]),
        );
        const qualityFeatures = Object.fromEntries(
          enrichedBreakdown.map((item) => [item.key, item.dataQuality]),
        );
        await tx.featureSnapshot.upsert({
          where: { stockId_date: { stockId: stock.id, date: asOf } },
          create: {
            stockId: stock.id,
            date: asOf,
            features: {
              engineVersion: SCORING_ENGINE_VERSION,
              asOf: asOf.toISOString(),
              normalized: normalizedFeatures,
              dataQuality: qualityFeatures,
              healthScore: computed.score,
              confidence: Number(confidence.toFixed(3)),
              // Labels intentionally remain null until future prices mature.
            },
          },
          update: {
            features: {
              engineVersion: SCORING_ENGINE_VERSION,
              asOf: asOf.toISOString(),
              normalized: normalizedFeatures,
              dataQuality: qualityFeatures,
              healthScore: computed.score,
              confidence: Number(confidence.toFixed(3)),
            },
          },
        });
      },
      { maxWait: 10_000, timeout: 30_000 },
    );

    const sectorScores = latestScoresBySector.get(stock.sectorId) ?? [];
    sectorScores.push(computed.score);
    latestScoresBySector.set(stock.sectorId, sectorScores);
  }

  for (const [sectorId, scores] of latestScoresBySector) {
    const average =
      scores.reduce((sum, score) => sum + score, 0) / scores.length;
    await prisma.sector.update({
      where: { id: sectorId },
      data: { healthScore: Number(average.toFixed(2)) },
    });
  }

  return {
    asOf: asOf.toISOString().slice(0, 10),
    engineVersion: SCORING_ENGINE_VERSION,
    stocksScored: stocks.length,
    readingsUpserted,
    averageConfidence:
      stocks.length === 0
        ? 0
        : Number((confidenceTotal / stocks.length).toFixed(3)),
    fallbackCounts,
  };
}
