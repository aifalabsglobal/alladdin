import type { Direction } from "@prisma/client";

import { featureCompleteness } from "@/lib/prediction/features";
import {
  HORIZON_MS,
  SIDEWAYS_THRESHOLD,
  type ModelPrediction,
  type PredictionHandler,
} from "@/lib/prediction/types";

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

function softmax3(a: number, b: number, c: number): [number, number, number] {
  const m = Math.max(a, b, c);
  const ea = Math.exp(a - m);
  const eb = Math.exp(b - m);
  const ec = Math.exp(c - m);
  const s = ea + eb + ec;
  return [ea / s, eb / s, ec / s];
}

/**
 * Explainable technical baseline — no trained weights.
 * Suitable for all horizons when history completeness is adequate.
 */
export const baselineRulesHandler: PredictionHandler = {
  key: "baseline_rules",
  version: "2.0.0",
  kind: "RULES",
  supports: ["M15", "H1", "EOD", "D1", "W1", "M1"],

  predict({ horizon, features, asOf }) {
    const completeness = featureCompleteness(features);
    const insufficientData = completeness < 0.45;

    const trend = features.trend_ma20 ?? 0;
    const ret1 = features.ret_1 ?? 0;
    const ret5 = features.ret_5 ?? 0;
    const rsi = features.rsi_14 ?? 50;
    const vol = features.vol_20 ?? 0.01;
    const health = features.health_score ?? 0.5;
    const vix = features.india_vix ?? 15;
    const news = features.news_sentiment ?? 0;
    const fii = features.fii_net_z ?? 0;
    const sector = features.sector_momentum ?? 0;

    // Horizon-aware scaling: shorter horizons lean on recent returns.
    const shortW = horizon === "M15" || horizon === "H1" || horizon === "EOD" ? 1.2 : 0.7;
    const longW = horizon === "W1" || horizon === "M1" ? 1.2 : 0.8;

    const momentumScore =
      shortW * (2.5 * ret1 + 1.2 * ret5) +
      longW * (1.8 * trend) +
      0.4 * ((rsi - 50) / 50) +
      0.35 * ((health - 0.5) * 2) +
      0.25 * news +
      0.2 * fii +
      0.25 * sector -
      0.15 * Math.max(0, (vix - 18) / 20);

    const thr = SIDEWAYS_THRESHOLD[horizon];
    const expectedReturn = momentumScore * Math.max(vol, 0.004) * 3;
    const upLogit = momentumScore;
    const downLogit = -momentumScore;
    let sideLogit = 0.35 - Math.abs(momentumScore) * 0.8;

    // Widen sideways when volatility is high relative to expected move.
    if (Math.abs(expectedReturn) < thr * 1.2) {
      sideLogit += 0.6;
    }

    const [probUp, probSideways, probDown] = softmax3(
      upLogit,
      sideLogit,
      downLogit,
    );

    let direction: Direction = "SIDEWAYS";
    let confidence = probSideways;
    if (probUp >= probDown && probUp >= probSideways) {
      direction = "UP";
      confidence = probUp;
    } else if (probDown >= probUp && probDown >= probSideways) {
      direction = "DOWN";
      confidence = probDown;
    }

    // Completeness dampens confidence; never overclaim on thin data.
    confidence = clamp01(confidence * (0.55 + 0.45 * completeness));
    if (insufficientData) {
      direction = "SIDEWAYS";
      confidence = Math.min(confidence, 0.34);
    }

    const uncertainty = clamp01(vol * 8 + (1 - completeness) * 0.4);
    const band = thr + vol * (horizon === "M1" ? 2.5 : 1.4);

    const drivers = [
      {
        key: "trend_ma20",
        impact: trend,
        reason: `Price vs 20-bar MA (${(trend * 100).toFixed(2)}%)`,
      },
      {
        key: "ret_1",
        impact: ret1,
        reason: `Last bar return (${(ret1 * 100).toFixed(2)}%)`,
      },
      {
        key: "rsi_14",
        impact: (rsi - 50) / 50,
        reason: `RSI 14 at ${rsi.toFixed(1)}`,
      },
      {
        key: "health_score",
        impact: (health - 0.5) * 2,
        reason: `Health score ${(health * 100).toFixed(0)}/100`,
      },
    ]
      .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact))
      .slice(0, 4);

    return {
      horizon,
      direction,
      confidence: Number(confidence.toFixed(4)),
      probUp: Number(probUp.toFixed(4)),
      probSideways: Number(probSideways.toFixed(4)),
      probDown: Number(probDown.toFixed(4)),
      expectedReturn: Number(expectedReturn.toFixed(6)),
      returnLow: Number((expectedReturn - band).toFixed(6)),
      returnHigh: Number((expectedReturn + band).toFixed(6)),
      uncertainty: Number(uncertainty.toFixed(4)),
      calibrated: false,
      insufficientData,
      features,
      drivers,
      targetAt: new Date(asOf.getTime() + HORIZON_MS[horizon]),
    } satisfies ModelPrediction;
  },
};

export function calibrateLinear(
  confidence: number,
  sampleAccuracy: number | null,
): number {
  if (sampleAccuracy === null) return confidence;
  // Shrink toward empirical accuracy when we have outcomes.
  return clamp01(0.65 * confidence + 0.35 * sampleAccuracy);
}
