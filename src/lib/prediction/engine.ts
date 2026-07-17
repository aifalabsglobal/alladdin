import "server-only";

import {
  DataSource,
  MlKind,
  MlStatus,
  type PredictionHorizon,
} from "@prisma/client";
import { randomUUID } from "crypto";

import { prisma } from "@/lib/db";
import {
  applyCalibration,
  loadCalibrationMap,
} from "@/lib/prediction/calibration";
import { getActiveHandler } from "@/lib/prediction/ensemble";
import { buildPredictionFeatures } from "@/lib/prediction/features";
import { originBucketFor } from "@/lib/prediction/originBucket";
import { resolveNseTargetAt } from "@/lib/prediction/types";
import { parseModelMetrics } from "@/lib/queries/parsers";

const ALL_HORIZONS: PredictionHorizon[] = [
  "M15",
  "H1",
  "EOD",
  "D1",
  "W1",
  "M1",
];

function utcDateOnly(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

async function ensureModel(key: string, version: string, kind: MlKind) {
  return prisma.mlModel.upsert({
    where: { key_version: { key, version } },
    create: {
      key,
      version,
      kind,
      status: MlStatus.ACTIVE,
      trainedAt: new Date(),
      metrics: {
        note: "Explainable ensemble prototype — trailing accuracy filled by outcome job",
        accuracy: {},
      },
    },
    update: {
      status: MlStatus.ACTIVE,
      kind,
    },
  });
}

export type PredictionRunSummary = {
  runId: string;
  asOf: string;
  stocksScored: number;
  predictionsUpserted: number;
  insufficientData: number;
  horizons: PredictionHorizon[];
};

export async function runPredictions(args?: {
  horizons?: PredictionHorizon[];
  symbolLimit?: number;
  asOf?: Date;
}): Promise<PredictionRunSummary> {
  const asOf = args?.asOf ?? new Date();
  const date = utcDateOnly(asOf);
  const horizons = args?.horizons ?? ALL_HORIZONS;
  const runId = randomUUID();
  const handler = getActiveHandler();
  const model = await ensureModel(
    handler.key,
    handler.version,
    handler.kind === "ENSEMBLE" ? MlKind.ENSEMBLE : MlKind.RULES,
  );

  const stocks = await prisma.stock.findMany({
    where: { isActive: true },
    select: {
      id: true,
      symbol: true,
      sectorId: true,
      priceBars: {
        orderBy: { date: "desc" },
        take: 90,
        select: { close: true, volume: true, date: true },
      },
      intradayBars: {
        where: { complete: true },
        orderBy: { closeTime: "desc" },
        take: 240,
        select: {
          close: true,
          volume: true,
          closeTime: true,
          interval: true,
        },
      },
      healthScores: {
        orderBy: { date: "desc" },
        take: 1,
        select: { score: true },
      },
      newsItems: {
        orderBy: { publishedAt: "desc" },
        take: 5,
        select: { sentiment: true },
      },
    },
    orderBy: { symbol: "asc" },
    take: args?.symbolLimit,
  });

  const latestMacro = await prisma.marketSnapshot.findFirst({
    orderBy: { date: "desc" },
  });

  const calibrationByHorizon = new Map(
    await Promise.all(
      horizons.map(async (horizon) => {
        const mapping = await loadCalibrationMap(handler.key, horizon);
        return [horizon, mapping] as const;
      }),
    ),
  );
  const modelMetrics = parseModelMetrics(model.metrics);

  let predictionsUpserted = 0;
  let insufficientData = 0;

  for (const stock of stocks) {
    const dailyBars = stock.priceBars
      .filter((b) => b.date.getTime() <= date.getTime())
      .reverse();

    const sentiments = stock.newsItems
      .map((n) => n.sentiment)
      .filter((s): s is number => s !== null);
    const newsSentiment =
      sentiments.length > 0
        ? sentiments.reduce((a, b) => a + b, 0) / sentiments.length
        : null;

    for (const horizon of horizons) {
      if (!handler.supports.includes(horizon)) continue;
      const interval =
        horizon === "M15" || horizon === "EOD"
          ? "M15"
          : horizon === "H1"
            ? "H1"
            : null;
      const bars = interval
        ? stock.intradayBars
            .filter(
              (bar) =>
                bar.interval === interval && bar.closeTime.getTime() <= asOf.getTime(),
            )
            .reverse()
        : dailyBars;
      const closes = bars.map((bar) => bar.close);
      const volumes = bars.map((bar) => bar.volume);
      const features = buildPredictionFeatures({
        closes,
        volumes,
        healthScore: stock.healthScores[0]?.score ?? null,
        indiaVix: latestMacro?.indiaVix ?? null,
        fiiNet: latestMacro?.fiiNet ?? null,
        newsSentiment,
        sectorMomentum: null,
      });
      const pred = handler.predict({
        horizon,
        features,
        asOf,
        closes,
      });

      if (pred.insufficientData) insufficientData += 1;
      const targetAt = resolveNseTargetAt(horizon, asOf);
      const originBucket = originBucketFor(horizon, asOf);
      const sampleAccuracy = modelMetrics?.accuracy?.[horizon] ?? null;
      const calibrated = applyCalibration(
        pred.confidence,
        calibrationByHorizon.get(horizon) ?? null,
        sampleAccuracy,
      );

      const saved = await prisma.prediction.upsert({
        where: {
          stockId_originBucket_horizon_mlModelId: {
            stockId: stock.id,
            originBucket,
            horizon,
            mlModelId: model.id,
          },
        },
        create: {
          stockId: stock.id,
          date,
          originBucket,
          asOf,
          targetAt,
          horizon,
          direction: pred.direction,
          confidence: calibrated.confidence,
          probUp: pred.probUp,
          probSideways: pred.probSideways,
          probDown: pred.probDown,
          expectedReturn: pred.expectedReturn,
          returnLow: pred.returnLow,
          returnHigh: pred.returnHigh,
          uncertainty: pred.uncertainty,
          runId,
          calibrated: calibrated.calibrated,
          insufficientData: pred.insufficientData,
          mlModelId: model.id,
          features: {
            ...pred.features,
            drivers: pred.drivers,
            dataSource: DataSource.COMPUTED,
            observationInterval: interval ?? "D1",
            handler: `${handler.key}@${handler.version}`,
          },
        },
        update: {
          date,
          asOf,
          targetAt,
          direction: pred.direction,
          confidence: calibrated.confidence,
          probUp: pred.probUp,
          probSideways: pred.probSideways,
          probDown: pred.probDown,
          expectedReturn: pred.expectedReturn,
          returnLow: pred.returnLow,
          returnHigh: pred.returnHigh,
          uncertainty: pred.uncertainty,
          runId,
          calibrated: calibrated.calibrated,
          insufficientData: pred.insufficientData,
          features: {
            ...pred.features,
            drivers: pred.drivers,
            dataSource: DataSource.COMPUTED,
            observationInterval: interval ?? "D1",
            handler: `${handler.key}@${handler.version}`,
          },
        },
      });
      await prisma.predictionExplanation.deleteMany({
        where: { predictionId: saved.id },
      });
      predictionsUpserted += 1;
    }
  }

  return {
    runId,
    asOf: asOf.toISOString(),
    stocksScored: stocks.length,
    predictionsUpserted,
    insufficientData,
    horizons,
  };
}
