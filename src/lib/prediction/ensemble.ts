import type { PredictionHorizon } from "@prisma/client";

import { baselineRulesHandler, calibrateLinear } from "@/lib/prediction/baselineRules";
import type {
  FeatureVector,
  ModelPrediction,
  PredictionHandler,
} from "@/lib/prediction/types";

/**
 * Fixed nonlinear shadow score using deterministic feature transforms.
 * Not a trained artifact — used as a second voice in the ensemble until a
 * real artifact is promoted. Marked insufficient when feature coverage is thin.
 */
function nonlinearShadowPredict(args: {
  horizon: PredictionHorizon;
  features: FeatureVector;
  asOf: Date;
  closes: number[];
}): ModelPrediction {
  const base = baselineRulesHandler.predict(args);
  // Emphasize momentum / vol interaction differently from the rules voice.
  const mom =
    (args.features.ret_5 ?? 0) * 1.4 + (args.features.trend_ma20 ?? 0) * 1.1;
  const volPenalty = Math.max(0, (args.features.vol_20 ?? 0.01) - 0.02) * 2;
  const shift = mom - volPenalty;

  let { probUp, probSideways, probDown, expectedReturn } = base;
  probUp = Math.max(0.01, probUp + shift * 0.15);
  probDown = Math.max(0.01, probDown - shift * 0.15);
  const sum = probUp + probSideways + probDown;
  probUp /= sum;
  probSideways /= sum;
  probDown /= sum;
  expectedReturn = expectedReturn + shift * 0.002;

  const direction =
    probUp >= probDown && probUp >= probSideways
      ? "UP"
      : probDown >= probUp && probDown >= probSideways
        ? "DOWN"
        : "SIDEWAYS";
  const confidence =
    direction === "UP" ? probUp : direction === "DOWN" ? probDown : probSideways;

  return {
    ...base,
    direction,
    confidence: Number(confidence.toFixed(4)),
    probUp: Number(probUp.toFixed(4)),
    probSideways: Number(probSideways.toFixed(4)),
    probDown: Number(probDown.toFixed(4)),
    expectedReturn: Number(expectedReturn.toFixed(6)),
    drivers: [
      ...base.drivers,
      {
        key: "nonlinear_shadow",
        impact: shift,
        reason: "Shadow nonlinear momentum/vol interaction",
      },
    ].slice(0, 5),
  };
}

export const ensembleHandler: PredictionHandler = {
  key: "ensemble_v1",
  version: "1.0.0",
  kind: "ENSEMBLE",
  supports: ["M15", "H1", "EOD", "D1", "W1", "M1"],

  predict(args) {
    const rules = baselineRulesHandler.predict(args);
    const shadow = nonlinearShadowPredict(args);

    const wRules = 0.55;
    const wShadow = 0.45;
    const probUp = wRules * rules.probUp + wShadow * shadow.probUp;
    const probSideways =
      wRules * rules.probSideways + wShadow * shadow.probSideways;
    const probDown = wRules * rules.probDown + wShadow * shadow.probDown;
    const sum = probUp + probSideways + probDown;

    const pUp = probUp / sum;
    const pSide = probSideways / sum;
    const pDown = probDown / sum;

    const direction =
      pUp >= pDown && pUp >= pSide
        ? "UP"
        : pDown >= pUp && pDown >= pSide
          ? "DOWN"
          : "SIDEWAYS";

    let confidence =
      direction === "UP" ? pUp : direction === "DOWN" ? pDown : pSide;
    confidence = calibrateLinear(confidence, null);

    const insufficientData = rules.insufficientData || shadow.insufficientData;
    if (insufficientData) {
      confidence = Math.min(confidence, 0.34);
    }

    return {
      horizon: args.horizon,
      direction: insufficientData ? "SIDEWAYS" : direction,
      confidence: Number(confidence.toFixed(4)),
      probUp: Number(pUp.toFixed(4)),
      probSideways: Number(pSide.toFixed(4)),
      probDown: Number(pDown.toFixed(4)),
      expectedReturn: Number(
        (
          wRules * rules.expectedReturn +
          wShadow * shadow.expectedReturn
        ).toFixed(6),
      ),
      returnLow: Math.min(rules.returnLow, shadow.returnLow),
      returnHigh: Math.max(rules.returnHigh, shadow.returnHigh),
      uncertainty: Number(
        ((rules.uncertainty + shadow.uncertainty) / 2).toFixed(4),
      ),
      calibrated: false,
      insufficientData,
      features: args.features,
      drivers: [...rules.drivers, ...shadow.drivers]
        .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact))
        .slice(0, 5),
      targetAt: rules.targetAt,
    };
  },
};

export function getActiveHandler(): PredictionHandler {
  return ensembleHandler;
}
