import type { Direction, PredictionHorizon } from "@prisma/client";

import type { FreshnessState } from "@/lib/live/freshness";

export type AbstainReason =
  | "STALE_OR_UNTRUSTED_DATA"
  | "DELAYED_SHORT_HORIZON"
  | "UNCALIBRATED"
  | "LOW_SAMPLE"
  | "LOW_COMPLETENESS"
  | "MODEL_CONFLICT"
  | "NON_POSITIVE_AFTER_COST_EV"
  | "SIDEWAYS_HAS_NO_DIRECTIONAL_EDGE";

export type DecisionSupportInput = {
  direction: Direction;
  horizon: PredictionHorizon;
  confidence: number;
  calibrated: boolean;
  expectedReturn: number | null;
  freshness: FreshnessState;
  dataCompleteness: number;
  sampleCount: number;
  transactionCostRate: number;
  modelProbabilities?: number[];
};

export type DecisionSupportResult = {
  state: "STAND_ASIDE" | "RESEARCH_ONLY";
  reasons: AbstainReason[];
  grossDirectionalEdge: number | null;
  afterCostEv: number | null;
  disagreement: number;
  confidence: number;
};

const SHORT_HORIZONS = new Set<PredictionHorizon>(["M15", "H1", "EOD"]);

export function modelDisagreement(probabilities: number[] = []): number {
  const valid = probabilities.filter(
    (value) => Number.isFinite(value) && value >= 0 && value <= 1,
  );
  if (valid.length < 2) return 0;
  return Math.max(...valid) - Math.min(...valid);
}

export function assessDecisionSupport(
  input: DecisionSupportInput,
): DecisionSupportResult {
  const reasons: AbstainReason[] = [];
  const disagreement = modelDisagreement(input.modelProbabilities);
  const untrusted = ["stale", "synthetic", "unavailable", "degraded"].includes(
    input.freshness,
  );
  if (untrusted) reasons.push("STALE_OR_UNTRUSTED_DATA");
  if (input.freshness === "delayed" && SHORT_HORIZONS.has(input.horizon)) {
    reasons.push("DELAYED_SHORT_HORIZON");
  }
  if (!input.calibrated) reasons.push("UNCALIBRATED");
  if (input.sampleCount < 100) reasons.push("LOW_SAMPLE");
  if (input.dataCompleteness < 0.8) reasons.push("LOW_COMPLETENESS");
  if (disagreement > 0.18) reasons.push("MODEL_CONFLICT");

  let grossDirectionalEdge: number | null = null;
  if (input.expectedReturn !== null) {
    grossDirectionalEdge =
      input.direction === "UP"
        ? input.expectedReturn
        : input.direction === "DOWN"
          ? -input.expectedReturn
          : 0;
  }
  const afterCostEv =
    grossDirectionalEdge === null
      ? null
      : grossDirectionalEdge - Math.max(0, input.transactionCostRate);

  if (input.direction === "SIDEWAYS") {
    reasons.push("SIDEWAYS_HAS_NO_DIRECTIONAL_EDGE");
  }
  if (afterCostEv === null || afterCostEv <= 0) {
    reasons.push("NON_POSITIVE_AFTER_COST_EV");
  }

  return {
    state: reasons.length > 0 ? "STAND_ASIDE" : "RESEARCH_ONLY",
    reasons,
    grossDirectionalEdge,
    afterCostEv,
    disagreement,
    confidence: Math.max(0, Math.min(1, input.confidence)),
  };
}

export function transactionCostAssumption(assetClass: string): number {
  switch (assetClass) {
    case "CRYPTO":
      return 0.002;
    case "FX":
      return 0.0003;
    case "EQUITY":
    case "ETF":
      return 0.001;
    case "COMMODITY":
    case "FUTURE":
      return 0.0015;
    default:
      return 0.001;
  }
}

export function brierScore(
  probabilities: [number, number, number][],
  outcomes: (0 | 1 | 2)[],
): number | null {
  if (probabilities.length === 0 || probabilities.length !== outcomes.length) {
    return null;
  }
  const total = probabilities.reduce((sum, probs, index) => {
    const outcome = outcomes[index]!;
    return (
      sum +
      probs.reduce((row, probability, classIndex) => {
        const actual = classIndex === outcome ? 1 : 0;
        return row + (probability - actual) ** 2;
      }, 0)
    );
  }, 0);
  return total / probabilities.length;
}

export function conformalInterval(args: {
  estimate: number;
  residuals: number[];
  coverage?: number;
}): { low: number; high: number; coverage: number } | null {
  const coverage = Math.max(0.5, Math.min(0.99, args.coverage ?? 0.9));
  const residuals = args.residuals
    .filter((value) => Number.isFinite(value))
    .map(Math.abs)
    .sort((a, b) => a - b);
  if (residuals.length < 20) return null;
  const rank = Math.min(
    residuals.length - 1,
    Math.ceil((residuals.length + 1) * coverage) - 1,
  );
  const radius = residuals[rank]!;
  return {
    low: args.estimate - radius,
    high: args.estimate + radius,
    coverage,
  };
}
