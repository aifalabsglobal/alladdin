import "server-only";

import { MlKind, MlStatus, Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import {
  binaryBrier,
  fitLogistic,
  predictLogisticProb,
  type LogisticModel,
} from "@/lib/prediction/logistic";

export const SHADOW_MODEL_KEY = "logistic_shadow";
export const SHADOW_MODEL_VERSION = "1.0.0";

/** Prediction-feature keys the shadow model trains on. */
const FEATURE_KEYS = [
  "ret_1",
  "ret_5",
  "ret_20",
  "trend_ma20",
  "ma5_ma20",
  "rsi_14",
  "vol_20",
  "volume_ratio",
  "health_score",
] as const;

const MIN_TRAIN = 80;

export type ShadowTrainingSummary = {
  trained: boolean;
  totalSamples: number;
  trainSamples: number;
  testSamples: number;
  testAccuracy: number | null;
  baselineAccuracy: number | null;
  brier: number | null;
  note?: string;
};

function extractRow(features: unknown): number[] | null {
  if (!features || typeof features !== "object" || Array.isArray(features)) {
    return null;
  }
  const record = features as Record<string, unknown>;
  return FEATURE_KEYS.map((key) => {
    const value = record[key];
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
  });
}

async function upsertShadowModel(
  metrics: Prisma.InputJsonObject,
  hyperparams?: LogisticModel,
) {
  const hp: Prisma.InputJsonValue | undefined = hyperparams
    ? (hyperparams as unknown as Prisma.InputJsonObject)
    : undefined;
  await prisma.mlModel.upsert({
    where: {
      key_version: { key: SHADOW_MODEL_KEY, version: SHADOW_MODEL_VERSION },
    },
    create: {
      key: SHADOW_MODEL_KEY,
      version: SHADOW_MODEL_VERSION,
      kind: MlKind.LOGISTIC,
      status: MlStatus.SHADOW,
      trainedAt: new Date(),
      hyperparams: hp,
      metrics,
    },
    update: {
      kind: MlKind.LOGISTIC,
      status: MlStatus.SHADOW,
      trainedAt: new Date(),
      hyperparams: hp,
      metrics,
    },
  });
}

/**
 * Train a logistic shadow model on matured D1 predictions (real feature vectors
 * + realized outcomes), evaluate on a holdout split, and register it as a
 * SHADOW model. It never feeds live signals; it exists to benchmark honestly
 * whether a trained model would beat the ensemble before any promotion.
 */
export async function trainAndEvaluateShadow(): Promise<ShadowTrainingSummary> {
  const matured = await prisma.prediction.findMany({
    where: { horizon: "D1", outcome: { not: null } },
    select: { features: true, outcome: true },
    orderBy: { date: "asc" },
    take: 8000,
  });

  const X: number[][] = [];
  const y: number[] = [];
  for (const row of matured) {
    const features = extractRow(row.features);
    if (!features) continue;
    X.push(features);
    y.push(row.outcome === "UP" ? 1 : 0);
  }

  const total = X.length;
  if (total < MIN_TRAIN) {
    const summary: ShadowTrainingSummary = {
      trained: false,
      totalSamples: total,
      trainSamples: 0,
      testSamples: 0,
      testAccuracy: null,
      baselineAccuracy: null,
      brier: null,
      note: `Need >= ${MIN_TRAIN} matured D1 outcomes to train; have ${total}.`,
    };
    await upsertShadowModel({
      accuracy: {},
      samples: {},
      source: "holdout_eval",
      note: summary.note,
      updatedAt: new Date().toISOString(),
    });
    return summary;
  }

  const indices = [...Array(total).keys()];
  // Chronological walk-forward: train on earliest 70%, test on latest 30%.
  const cut = Math.floor(total * 0.7);
  const trainIdx = indices.slice(0, cut);
  const testIdx = indices.slice(cut);

  const model = fitLogistic(
    trainIdx.map((i) => X[i]!),
    trainIdx.map((i) => y[i]!),
    [...FEATURE_KEYS],
    { epochs: 500, lr: 0.2, l2: 0.002 },
  );

  let correct = 0;
  const probs: number[] = [];
  const outcomes: number[] = [];
  let positives = 0;
  for (const i of testIdx) {
    const features = Object.fromEntries(
      FEATURE_KEYS.map((key, j) => [key, X[i]![j]!]),
    );
    const p = predictLogisticProb(model, features);
    const predicted = p >= 0.5 ? 1 : 0;
    if (predicted === y[i]) correct += 1;
    probs.push(p);
    outcomes.push(y[i]!);
    positives += y[i]!;
  }

  const testN = testIdx.length;
  const testAccuracy = testN > 0 ? correct / testN : null;
  // Majority-class baseline on the test split.
  const majority = positives / Math.max(1, testN);
  const baselineAccuracy = Math.max(majority, 1 - majority);
  const brier = binaryBrier(probs, outcomes);

  await upsertShadowModel(
    {
      accuracy: { D1: testAccuracy ?? 0 },
      samples: { D1: testN },
      brier,
      baselineAccuracy,
      trainSamples: trainIdx.length,
      source: "holdout_eval",
      target: "P(next-day UP)",
      updatedAt: new Date().toISOString(),
    },
    model,
  );

  return {
    trained: true,
    totalSamples: total,
    trainSamples: trainIdx.length,
    testSamples: testN,
    testAccuracy,
    baselineAccuracy,
    brier,
  };
}
