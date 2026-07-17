import {
  DataSource,
  Direction,
  PrismaClient,
  type HealthBand,
  type InfluencerCategory,
  type InfluencerScope,
  type PredictionHorizon,
  type Prisma,
} from "@prisma/client";

import {
  computeHealthScore,
  V1_INFLUENCERS,
  type InfluencerContribution,
} from "../src/lib/scoring/compute";
import {
  SEED_SECTORS,
  SEED_STOCKS,
  createRng,
  hashString,
} from "./seed-data";

const prisma = new PrismaClient();

const DAYS = 90;
const SEED_VERSION = "phase1-synthetic-v1";
const BATCH = 500;

function utcDateOnly(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + days);
  return utcDateOnly(d);
}

function tradingDaysBack(count: number): Date[] {
  const dates: Date[] = [];
  const cursor = utcDateOnly(new Date());
  cursor.setUTCDate(cursor.getUTCDate() - 1);

  while (dates.length < count) {
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) {
      dates.push(utcDateOnly(cursor));
    }
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return dates.reverse();
}

function reasonFor(impact: number, rawHint: string): string {
  const pts = `${impact >= 0 ? "+" : ""}${impact.toFixed(1)} pts`;
  return `${rawHint}: ${pts}`;
}

async function createManyBatched<T>(
  label: string,
  rows: T[],
  write: (chunk: T[]) => Promise<unknown>,
) {
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    await write(chunk);
    if ((i / BATCH) % 5 === 0) {
      console.log(`  ${label}: ${Math.min(i + BATCH, rows.length)} / ${rows.length}`);
    }
  }
}

async function seedInfluencers() {
  for (const inf of V1_INFLUENCERS) {
    await prisma.influencer.upsert({
      where: { key: inf.key },
      create: {
        key: inf.key,
        name: inf.name,
        category: inf.category as InfluencerCategory,
        scope: inf.scope as InfluencerScope,
        defaultWeight: inf.defaultWeight,
        description: inf.description,
      },
      update: {
        name: inf.name,
        category: inf.category as InfluencerCategory,
        scope: inf.scope as InfluencerScope,
        defaultWeight: inf.defaultWeight,
        description: inf.description,
      },
    });
  }
}

async function seedSectors() {
  const map = new Map<string, string>();
  for (const name of SEED_SECTORS) {
    const sector = await prisma.sector.upsert({
      where: { name },
      create: { name, healthScore: 55 },
      update: { name },
    });
    map.set(name, sector.id);
  }
  return map;
}

async function seedStocks(sectorIds: Map<string, string>) {
  const map = new Map<string, { id: string; basePrice: number; sector: string }>();

  for (const s of SEED_STOCKS) {
    const sectorId = sectorIds.get(s.sector);
    if (!sectorId) {
      throw new Error(`Missing sector ${s.sector} for ${s.symbol}`);
    }

    const stock = await prisma.stock.upsert({
      where: { symbol: s.symbol },
      create: {
        symbol: s.symbol,
        exchange: s.exchange,
        name: s.name,
        sectorId,
        industry: s.industry,
        marketCap: s.marketCapCr * 1e7,
        isActive: true,
      },
      update: {
        exchange: s.exchange,
        name: s.name,
        sectorId,
        industry: s.industry,
        marketCap: s.marketCapCr * 1e7,
        isActive: true,
      },
    });

    map.set(s.symbol, { id: stock.id, basePrice: s.basePrice, sector: s.sector });
  }

  return map;
}

async function seedMlModel() {
  return prisma.mlModel.upsert({
    where: { key_version: { key: "baseline_rules", version: "1.0.0" } },
    create: {
      key: "baseline_rules",
      version: "1.0.0",
      kind: "RULES",
      status: "ACTIVE",
      hyperparams: { seedVersion: SEED_VERSION },
      metrics: {
        accuracy: { D1: 0.52, W1: 0.54, M1: 0.51 },
        note: "Synthetic baseline metrics for Phase 1 seed",
      },
      trainedAt: new Date(),
    },
    update: {
      status: "ACTIVE",
      kind: "RULES",
      hyperparams: { seedVersion: SEED_VERSION },
    },
  });
}

function buildNormalizedScores(
  rng: () => number,
  dayIndex: number,
  symbol: string,
): Record<string, { normalized: number; raw: number; hint: string }> {
  const drift = Math.sin((dayIndex + (hashString(symbol) % 17)) / 7) * 40;

  return {
    trend_ma: {
      raw: 50 + drift,
      normalized: Math.max(-100, Math.min(100, drift + (rng() - 0.5) * 50)),
      hint:
        drift >= 0
          ? "Price holding above key moving averages"
          : "Price slipping under the 50-day average",
    },
    rsi_14: {
      raw: 50 + drift * 0.4,
      normalized: Math.max(-100, Math.min(100, (rng() - 0.5) * 40)),
      hint: "RSI sitting in a balanced zone with mild mean-reversion bias",
    },
    volume_delivery: {
      raw: 0.4 + rng() * 0.4,
      normalized: Math.max(-100, Math.min(100, (rng() - 0.35) * 120)),
      hint: "Delivery participation shaping conviction behind the move",
    },
    eps_growth: {
      raw: (rng() - 0.4) * 30,
      normalized: Math.max(-100, Math.min(100, (rng() - 0.4) * 140)),
      hint: "EPS growth versus sector median",
    },
    valuation_pe: {
      raw: 15 + rng() * 25,
      normalized: Math.max(-100, Math.min(100, (0.5 - rng()) * 100)),
      hint: "P/E relative to sector peers",
    },
    leverage: {
      raw: rng() * 1.5,
      normalized: Math.max(-100, Math.min(100, (0.4 - rng()) * 80)),
      hint: "Balance-sheet leverage versus sector norm",
    },
    news_sentiment: {
      raw: (rng() - 0.5) * 2,
      normalized: Math.max(-100, Math.min(100, (rng() - 0.5) * 160)),
      hint: "Recent news tone over the last week",
    },
    fii_flow: {
      raw: (rng() - 0.55) * 4000,
      normalized: Math.max(-100, Math.min(100, (rng() - 0.55) * 140)),
      hint: "FII net flow trend over recent sessions",
    },
    sector_momentum: {
      raw: (rng() - 0.45) * 8,
      normalized: Math.max(-100, Math.min(100, (rng() - 0.45) * 120)),
      hint: "Sector momentum versus Nifty",
    },
    india_vix: {
      raw: 12 + rng() * 10,
      normalized: Math.max(-100, Math.min(100, (16 - (12 + rng() * 10)) * 8)),
      hint: "India VIX fear gauge versus calm threshold",
    },
    usd_inr_crude: {
      raw: (rng() - 0.5) * 2,
      normalized: Math.max(-100, Math.min(100, (rng() - 0.5) * 100)),
      hint: "USD/INR and crude sensitivity for this sector",
    },
  };
}

async function clearSyntheticTimeSeries(stockIds: string[]) {
  console.log("Clearing previous SYNTHETIC time-series rows (idempotent refresh)…");

  await prisma.influencerReading.deleteMany({
    where: { dataSource: DataSource.SYNTHETIC, stockId: { in: stockIds } },
  });
  await prisma.healthScore.deleteMany({
    where: { dataSource: DataSource.SYNTHETIC, stockId: { in: stockIds } },
  });
  await prisma.priceBar.deleteMany({
    where: { dataSource: DataSource.SYNTHETIC, stockId: { in: stockIds } },
  });
  await prisma.fundamental.deleteMany({
    where: { dataSource: DataSource.SYNTHETIC, stockId: { in: stockIds } },
  });
  await prisma.marketSnapshot.deleteMany({
    where: { dataSource: DataSource.SYNTHETIC },
  });
  await prisma.featureSnapshot.deleteMany({
    where: { stockId: { in: stockIds } },
  });
  await prisma.prediction.deleteMany({
    where: { stockId: { in: stockIds } },
  });
  await prisma.newsItem.deleteMany({
    where: { source: "SYNTHETIC", stockId: { in: stockIds } },
  });
}

async function main() {
  console.log(`Alladin seed starting (${SEED_VERSION})…`);
  console.log(`Seeding ${SEED_STOCKS.length} stocks across ${SEED_SECTORS.length} sectors…`);

  await seedInfluencers();
  const sectorIds = await seedSectors();
  const stocks = await seedStocks(sectorIds);
  const mlModel = await seedMlModel();
  const influencers = await prisma.influencer.findMany();
  const influencerByKey = new Map(influencers.map((i) => [i.key, i]));

  const stockIds = [...stocks.values()].map((s) => s.id);
  await clearSyntheticTimeSeries(stockIds);

  const dates = tradingDaysBack(DAYS);
  console.log(`Generating ${dates.length} trading days of synthetic market data…`);

  const priceRows: Prisma.PriceBarCreateManyInput[] = [];
  const fundamentalRows: Prisma.FundamentalCreateManyInput[] = [];
  const readingRows: Prisma.InfluencerReadingCreateManyInput[] = [];
  const healthRows: Prisma.HealthScoreCreateManyInput[] = [];
  const featureRows: Prisma.FeatureSnapshotCreateManyInput[] = [];
  const predictionRows: Prisma.PredictionCreateManyInput[] = [];
  const newsRows: Prisma.NewsItemCreateManyInput[] = [];
  const marketRows: Prisma.MarketSnapshotCreateManyInput[] = [];
  const latestScoresBySector = new Map<string, number[]>();

  for (const [symbol, stock] of stocks) {
    const rng = createRng(hashString(`${SEED_VERSION}:${symbol}`));
    let price = stock.basePrice;

    for (let di = 0; di < dates.length; di += 1) {
      const date = dates[di]!;
      const dayRet = (rng() - 0.48) * 0.03;
      const open = price;
      const close = Math.max(1, open * (1 + dayRet));
      const high = Math.max(open, close) * (1 + rng() * 0.01);
      const low = Math.min(open, close) * (1 - rng() * 0.01);
      const volume = Math.floor(500_000 + rng() * 4_500_000);
      const deliveryPct = 20 + rng() * 50;

      priceRows.push({
        stockId: stock.id,
        date,
        open,
        high,
        low,
        close,
        volume,
        deliveryPct,
        dataSource: DataSource.SYNTHETIC,
      });
      price = close;

      if (di % 20 === 0 || di === dates.length - 1) {
        fundamentalRows.push({
          stockId: stock.id,
          asOfDate: date,
          pe: 12 + rng() * 35,
          pb: 1 + rng() * 8,
          eps: close / (15 + rng() * 20),
          epsGrowthYoY: (rng() - 0.35) * 40,
          debtToEquity: rng() * 1.8,
          roe: 5 + rng() * 25,
          dataSource: DataSource.SYNTHETIC,
        });
      }

      const scores = buildNormalizedScores(rng, di, symbol);
      const contributions: Omit<InfluencerContribution, "impactPoints">[] = [];

      for (const inf of V1_INFLUENCERS) {
        const s = scores[inf.key]!;
        contributions.push({
          key: inf.key,
          name: inf.name,
          category: inf.category,
          weight: inf.defaultWeight,
          normalizedScore: s.normalized,
          reasonText: "",
        });
      }

      const health = computeHealthScore(contributions);
      for (const item of health.breakdown) {
        const base = scores[item.key]!;
        item.reasonText = reasonFor(item.impactPoints, base.hint);

        const influencer = influencerByKey.get(item.key);
        if (!influencer) continue;

        readingRows.push({
          influencerId: influencer.id,
          stockId: stock.id,
          sectorId:
            item.key === "sector_momentum" ? sectorIds.get(stock.sector) : null,
          date,
          rawValue: base.raw,
          normalizedScore: item.normalizedScore,
          impactPoints: item.impactPoints,
          reasonText: item.reasonText,
          dataSource: DataSource.SYNTHETIC,
        });
      }

      const topPos = health.topPositiveKey
        ? influencerByKey.get(health.topPositiveKey)?.id
        : null;
      const topNeg = health.topNegativeKey
        ? influencerByKey.get(health.topNegativeKey)?.id
        : null;

      healthRows.push({
        stockId: stock.id,
        date,
        score: health.score,
        band: health.band as HealthBand,
        topPositiveInfluencerId: topPos,
        topNegativeInfluencerId: topNeg,
        breakdown: health.breakdown as unknown as Prisma.InputJsonValue,
        dataSource: DataSource.SYNTHETIC,
      });

      if (di === dates.length - 1) {
        const list = latestScoresBySector.get(stock.sector) ?? [];
        list.push(health.score);
        latestScoresBySector.set(stock.sector, list);
      }

      if (di >= dates.length - 30) {
        const featureMap: Record<string, number> = {};
        for (const item of health.breakdown) {
          featureMap[item.key] = item.normalizedScore;
        }
        featureMap.ret_1d = dayRet;
        featureMap.health_score = health.score;

        const label1d: Direction =
          dayRet > 0.01 ? "UP" : dayRet < -0.01 ? "DOWN" : "SIDEWAYS";

        featureRows.push({
          stockId: stock.id,
          date,
          features: featureMap,
          label1d: di < dates.length - 1 ? label1d : null,
        });
      }

      if (di >= dates.length - 5) {
        const horizons: PredictionHorizon[] = ["D1", "W1", "M1"];
        for (const horizon of horizons) {
          const conf = 0.45 + rng() * 0.35;
          const direction: Direction =
            health.score >= 60 ? "UP" : health.score <= 40 ? "DOWN" : "SIDEWAYS";

          predictionRows.push({
            stockId: stock.id,
            date,
            horizon,
            direction,
            confidence: Math.round(conf * 1000) / 1000,
            mlModelId: mlModel.id,
            features: {
              healthScore: health.score,
              topPositive: health.topPositiveKey,
              topNegative: health.topNegativeKey,
              seedVersion: SEED_VERSION,
            },
          });
        }
      }
    }

    const latest = dates[dates.length - 1]!;
    for (let n = 0; n < 2; n += 1) {
      const publishedAt = addDays(latest, -n * 2);
      const url = `https://seed.alladin.local/news/${symbol.toLowerCase()}/${n + 1}`;
      const sentiment = (rng() - 0.5) * 1.6;
      newsRows.push({
        stockId: stock.id,
        publishedAt,
        source: "SYNTHETIC",
        title: `${symbol}: synthetic market note ${n + 1} (${SEED_VERSION})`,
        url,
        contentHash: `${hashString(`${symbol}:${n}:${SEED_VERSION}`)}`,
        sentiment: Math.max(-1, Math.min(1, sentiment)),
        sentimentReason:
          sentiment >= 0
            ? "Tone leans constructive on near-term business momentum."
            : "Tone leans cautious on near-term uncertainty.",
      });
    }
  }

  const marketRng = createRng(hashString(`${SEED_VERSION}:market`));
  let nifty = 22500;
  let sensex = 74000;

  for (let di = 0; di < dates.length; di += 1) {
    const date = dates[di]!;
    nifty *= 1 + (marketRng() - 0.48) * 0.012;
    sensex *= 1 + (marketRng() - 0.48) * 0.012;
    const fiiNet = (marketRng() - 0.55) * 3500;
    const diiNet = (marketRng() - 0.4) * 2500;
    const indiaVix = 11 + marketRng() * 12;
    const adv = Math.floor(20 + marketRng() * 25);
    const dec = 50 - adv;
    const marketHealth = Math.max(
      0,
      Math.min(
        100,
        50 + (adv - dec) * 0.8 + fiiNet / 200 - Math.max(0, indiaVix - 16) * 1.5,
      ),
    );

    marketRows.push({
      date,
      niftyClose: Math.round(nifty * 100) / 100,
      sensexClose: Math.round(sensex * 100) / 100,
      marketHealthScore: Math.round(marketHealth * 100) / 100,
      breadthAdvancers: adv,
      breadthDecliners: dec,
      fiiNet: Math.round(fiiNet * 100) / 100,
      diiNet: Math.round(diiNet * 100) / 100,
      indiaVix: Math.round(indiaVix * 100) / 100,
      dataSource: DataSource.SYNTHETIC,
    });
  }

  console.log("Writing batches…");
  await createManyBatched("priceBars", priceRows, (chunk) =>
    prisma.priceBar.createMany({ data: chunk }),
  );
  await createManyBatched("fundamentals", fundamentalRows, (chunk) =>
    prisma.fundamental.createMany({ data: chunk }),
  );
  await createManyBatched("influencerReadings", readingRows, (chunk) =>
    prisma.influencerReading.createMany({ data: chunk }),
  );
  await createManyBatched("healthScores", healthRows, (chunk) =>
    prisma.healthScore.createMany({ data: chunk }),
  );
  await createManyBatched("featureSnapshots", featureRows, (chunk) =>
    prisma.featureSnapshot.createMany({ data: chunk }),
  );
  await createManyBatched("predictions", predictionRows, (chunk) =>
    prisma.prediction.createMany({ data: chunk }),
  );
  await createManyBatched("newsItems", newsRows, (chunk) =>
    prisma.newsItem.createMany({ data: chunk }),
  );
  await createManyBatched("marketSnapshots", marketRows, (chunk) =>
    prisma.marketSnapshot.createMany({ data: chunk }),
  );

  for (const [name, sectorId] of sectorIds) {
    const scores = latestScoresBySector.get(name) ?? [];
    const avg =
      scores.length === 0
        ? 50
        : scores.reduce((s, x) => s + x, 0) / scores.length;

    await prisma.sector.update({
      where: { id: sectorId },
      data: { healthScore: Math.round(avg * 100) / 100 },
    });
    console.log(`  Sector ${name}: health ${avg.toFixed(1)}`);
  }

  const counts = {
    sectors: await prisma.sector.count(),
    stocks: await prisma.stock.count(),
    influencers: await prisma.influencer.count(),
    priceBars: await prisma.priceBar.count({ where: { dataSource: DataSource.SYNTHETIC } }),
    healthScores: await prisma.healthScore.count({
      where: { dataSource: DataSource.SYNTHETIC },
    }),
    influencerReadings: await prisma.influencerReading.count({
      where: { dataSource: DataSource.SYNTHETIC },
    }),
    marketSnapshots: await prisma.marketSnapshot.count({
      where: { dataSource: DataSource.SYNTHETIC },
    }),
    predictions: await prisma.prediction.count(),
    newsItems: await prisma.newsItem.count({ where: { source: "SYNTHETIC" } }),
    mlModels: await prisma.mlModel.count(),
  };

  console.log("Seed complete.");
  console.log(JSON.stringify({ seedVersion: SEED_VERSION, counts }, null, 2));
}

main()
  .catch((err: unknown) => {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
