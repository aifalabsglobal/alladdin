import type { Direction, PredictionHorizon } from "@prisma/client";

export type FeatureVector = Record<string, number | null>;

export type ModelPrediction = {
  horizon: PredictionHorizon;
  direction: Direction;
  confidence: number;
  probUp: number;
  probSideways: number;
  probDown: number;
  expectedReturn: number;
  returnLow: number;
  returnHigh: number;
  uncertainty: number;
  calibrated: boolean;
  insufficientData: boolean;
  features: FeatureVector;
  drivers: { key: string; impact: number; reason: string }[];
  targetAt: Date;
};

export type PredictionHandler = {
  key: string;
  version: string;
  kind: "RULES" | "GBM" | "ENSEMBLE";
  supports: PredictionHorizon[];
  predict(args: {
    horizon: PredictionHorizon;
    features: FeatureVector;
    asOf: Date;
    closes: number[];
  }): ModelPrediction;
};

export const HORIZON_MS: Record<PredictionHorizon, number> = {
  M15: 15 * 60_000,
  H1: 60 * 60_000,
  EOD: 6.25 * 60 * 60_000, // approx remaining cash session window
  D1: 24 * 60 * 60_000,
  W1: 5 * 24 * 60 * 60_000,
  M1: 21 * 24 * 60 * 60_000,
};

function nextNseSessionClose(base: Date, sessionsAhead: number): Date {
  const ist = new Date(base.getTime() + 330 * 60_000);
  let close = new Date(
    Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate(), 10, 0),
  );
  while (close.getUTCDay() === 0 || close.getUTCDay() === 6) {
    close = new Date(close.getTime() + 24 * 60 * 60_000);
  }
  let remaining = sessionsAhead;
  while (remaining > 0) {
    close = new Date(close.getTime() + 24 * 60 * 60_000);
    const day = close.getUTCDay();
    if (day !== 0 && day !== 6) remaining -= 1;
  }
  return close;
}

/** NSE-aware target resolver. Exchange holidays require a licensed calendar later. */
export function resolveNseTargetAt(
  horizon: PredictionHorizon,
  asOf: Date,
): Date {
  if (horizon === "M15" || horizon === "H1") {
    return new Date(asOf.getTime() + HORIZON_MS[horizon]);
  }
  if (horizon === "EOD") {
    const todayClose = nextNseSessionClose(asOf, 0);
    return asOf < todayClose
      ? todayClose
      : nextNseSessionClose(asOf, 1);
  }
  return nextNseSessionClose(
    asOf,
    horizon === "D1" ? 1 : horizon === "W1" ? 5 : 21,
  );
}

export const SIDEWAYS_THRESHOLD: Record<PredictionHorizon, number> = {
  M15: 0.0015,
  H1: 0.0025,
  EOD: 0.004,
  D1: 0.006,
  W1: 0.015,
  M1: 0.04,
};

export function directionFromReturn(
  ret: number,
  horizon: PredictionHorizon,
): Direction {
  const thr = SIDEWAYS_THRESHOLD[horizon];
  if (ret > thr) return "UP";
  if (ret < -thr) return "DOWN";
  return "SIDEWAYS";
}
