import "server-only";

import {
  DataSource,
  MlKind,
  MlStatus,
  type InstrumentInterval,
  type PredictionHorizon,
} from "@prisma/client";
import { randomUUID } from "crypto";

import { prisma } from "@/lib/db";
import { getActiveHandler } from "@/lib/prediction/ensemble";
import { buildPredictionFeatures } from "@/lib/prediction/features";
import { HORIZON_MS } from "@/lib/prediction/types";

/**
 * Horizons the global (instrument) engine serves. Short intraday horizons are
 * only produced when matching intraday bars exist; daily horizons use D1 bars.
 */
const GLOBAL_HORIZONS: PredictionHorizon[] = ["M15", "H1", "EOD", "D1", "W1", "M1"];

const MIN_DAILY_BARS = 30;

function utcDateOnly(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function intervalForHorizon(
  horizon: PredictionHorizon,
): InstrumentInterval | "D1" {
  if (horizon === "M15" || horizon === "EOD") return "M15";
  if (horizon === "H1") return "H1";
  return "D1";
}

async function ensureModel() {
  const handler = getActiveHandler();
  const model = await prisma.mlModel.upsert({
    where: { key_version: { key: handler.key, version: handler.version } },
    create: {
      key: handler.key,
      version: handler.version,
      kind: MlKind.ENSEMBLE,
      status: MlStatus.ACTIVE,
      trainedAt: new Date(),
      metrics: {
        note: "Explainable ensemble prototype — trailing accuracy filled by outcome job",
        accuracy: {},
      },
    },
    update: { status: MlStatus.ACTIVE, kind: MlKind.ENSEMBLE },
  });
  return { handler, model };
}

export type InstrumentPredictionRunSummary = {
  runId: string;
  asOf: string;
  instrumentsScored: number;
  predictionsUpserted: number;
  insufficientData: number;
  horizons: PredictionHorizon[];
};

export async function runInstrumentPredictions(args?: {
  horizons?: PredictionHorizon[];
  instrumentLimit?: number;
  asOf?: Date;
}): Promise<InstrumentPredictionRunSummary> {
  const asOf = args?.asOf ?? new Date();
  const date = utcDateOnly(asOf);
  const horizons = args?.horizons ?? GLOBAL_HORIZONS;
  const runId = randomUUID();
  const { handler, model } = await ensureModel();

  const instruments = await prisma.instrument.findMany({
    where: { isActive: true },
    select: {
      id: true,
      symbol: true,
      bars: {
        where: { quality: { not: "INCOMPLETE" } },
        orderBy: { closeTime: "desc" },
        take: 260,
        select: {
          close: true,
          volume: true,
          closeTime: true,
          interval: true,
        },
      },
    },
    orderBy: { symbol: "asc" },
    take: args?.instrumentLimit,
  });

  let instrumentsScored = 0;
  let predictionsUpserted = 0;
  let insufficientData = 0;

  for (const instrument of instruments) {
    const dailyBars = instrument.bars
      .filter((bar) => bar.interval === "D1" && bar.closeTime.getTime() <= asOf.getTime())
      .sort((a, b) => a.closeTime.getTime() - b.closeTime.getTime());

    // Skip instruments without enough daily history for any signal at all.
    if (dailyBars.length < MIN_DAILY_BARS) continue;
    instrumentsScored += 1;

    for (const horizon of horizons) {
      if (!handler.supports.includes(horizon)) continue;
      const interval = intervalForHorizon(horizon);
      const bars =
        interval === "D1"
          ? dailyBars
          : instrument.bars
              .filter(
                (bar) =>
                  bar.interval === interval &&
                  bar.closeTime.getTime() <= asOf.getTime(),
              )
              .sort((a, b) => a.closeTime.getTime() - b.closeTime.getTime());

      const closes = bars.map((bar) => bar.close);
      const volumes = bars.map((bar) => bar.volume ?? 0);
      const features = buildPredictionFeatures({
        closes,
        volumes,
        healthScore: null,
        indiaVix: null,
        fiiNet: null,
        newsSentiment: null,
        sectorMomentum: null,
      });
      const pred = handler.predict({ horizon, features, asOf, closes });

      if (pred.insufficientData) insufficientData += 1;
      const targetAt = new Date(asOf.getTime() + HORIZON_MS[horizon]);

      await prisma.instrumentPrediction.upsert({
        where: {
          instrumentId_date_horizon_mlModelId: {
            instrumentId: instrument.id,
            date,
            horizon,
            mlModelId: model.id,
          },
        },
        create: {
          instrumentId: instrument.id,
          date,
          asOf,
          targetAt,
          horizon,
          direction: pred.direction,
          confidence: pred.confidence,
          probUp: pred.probUp,
          probSideways: pred.probSideways,
          probDown: pred.probDown,
          expectedReturn: pred.expectedReturn,
          returnLow: pred.returnLow,
          returnHigh: pred.returnHigh,
          uncertainty: pred.uncertainty,
          runId,
          calibrated: pred.calibrated,
          insufficientData: pred.insufficientData,
          mlModelId: model.id,
          features: {
            ...pred.features,
            drivers: pred.drivers,
            dataSource: DataSource.COMPUTED,
            observationInterval: interval,
            handler: `${handler.key}@${handler.version}`,
          },
        },
        update: {
          asOf,
          targetAt,
          direction: pred.direction,
          confidence: pred.confidence,
          probUp: pred.probUp,
          probSideways: pred.probSideways,
          probDown: pred.probDown,
          expectedReturn: pred.expectedReturn,
          returnLow: pred.returnLow,
          returnHigh: pred.returnHigh,
          uncertainty: pred.uncertainty,
          runId,
          calibrated: pred.calibrated,
          insufficientData: pred.insufficientData,
          features: {
            ...pred.features,
            drivers: pred.drivers,
            dataSource: DataSource.COMPUTED,
            observationInterval: interval,
            handler: `${handler.key}@${handler.version}`,
          },
        },
      });
      predictionsUpserted += 1;
    }
  }

  return {
    runId,
    asOf: asOf.toISOString(),
    instrumentsScored,
    predictionsUpserted,
    insufficientData,
    horizons,
  };
}
