import "server-only";

import type { Direction, PredictionHorizon } from "@prisma/client";

import { prisma } from "@/lib/db";
import {
  assessDecisionSupport,
  brierScore,
  transactionCostAssumption,
  type AbstainReason,
} from "@/lib/decision/support";
import { parseModelMetrics } from "@/lib/queries/parsers";

const ALL_HORIZONS: PredictionHorizon[] = ["M15", "H1", "EOD", "D1", "W1", "M1"];

/** Class ordering used for the three-way Brier score. */
function outcomeIndex(direction: Direction): 0 | 1 | 2 {
  if (direction === "UP") return 0;
  if (direction === "SIDEWAYS") return 1;
  return 2;
}

const RELIABILITY_BINS = [
  { label: "0.40–0.50", lo: 0.0, hi: 0.5 },
  { label: "0.50–0.60", lo: 0.5, hi: 0.6 },
  { label: "0.60–0.70", lo: 0.6, hi: 0.7 },
  { label: "0.70–0.80", lo: 0.7, hi: 0.8 },
  { label: "0.80–0.90", lo: 0.8, hi: 0.9 },
  { label: "0.90–1.00", lo: 0.9, hi: 1.01 },
] as const;

export type ReliabilityBin = {
  label: string;
  predicted: number | null;
  empirical: number | null;
  count: number;
};

export type HorizonCalibration = {
  horizon: PredictionHorizon;
  labeled: number;
  accuracy: number | null;
  brier: number | null;
};

export type ModelBenchRow = {
  key: string;
  version: string;
  kind: string;
  status: string;
  accuracy: number | null;
  samples: number | null;
  brier: number | null;
  baselineAccuracy: number | null;
  note: string | null;
};

export type CalibrationSummary = {
  latestRunAt: string | null;
  totalLabeled: number;
  overallBrier: number | null;
  horizons: HorizonCalibration[];
  reliability: ReliabilityBin[];
  bench: ModelBenchRow[];
  abstention: {
    assessed: number;
    standAside: number;
    researchOnly: number;
    rate: number;
    topReasons: { reason: AbstainReason; count: number }[];
  };
};

const REASON_LABELS: Record<AbstainReason, string> = {
  STALE_OR_UNTRUSTED_DATA: "Stale or untrusted data",
  DELAYED_SHORT_HORIZON: "Delayed feed on short horizon",
  UNCALIBRATED: "Model not yet calibrated",
  LOW_SAMPLE: "Too few matured outcomes",
  LOW_COMPLETENESS: "Incomplete feature set",
  MODEL_CONFLICT: "Models disagree",
  NON_POSITIVE_AFTER_COST_EV: "No edge after costs",
  SIDEWAYS_HAS_NO_DIRECTIONAL_EDGE: "No directional edge",
};

export function abstainReasonLabel(reason: AbstainReason): string {
  return REASON_LABELS[reason] ?? reason;
}

export async function getCalibrationSummary(): Promise<CalibrationSummary> {
  // Matured predictions across all history feed accuracy, Brier and reliability.
  const matured = await prisma.prediction.findMany({
    where: { outcome: { not: null }, correct: { not: null } },
    select: {
      horizon: true,
      confidence: true,
      correct: true,
      outcome: true,
      probUp: true,
      probSideways: true,
      probDown: true,
    },
    take: 20_000,
  });

  const byHorizon = new Map<
    PredictionHorizon,
    { labeled: number; correct: number; probs: [number, number, number][]; outcomes: (0 | 1 | 2)[] }
  >();
  const allProbs: [number, number, number][] = [];
  const allOutcomes: (0 | 1 | 2)[] = [];
  const bins = RELIABILITY_BINS.map((bin) => ({
    ...bin,
    confSum: 0,
    correct: 0,
    count: 0,
  }));

  for (const row of matured) {
    const bucket =
      byHorizon.get(row.horizon) ??
      { labeled: 0, correct: 0, probs: [], outcomes: [] };
    bucket.labeled += 1;
    if (row.correct) bucket.correct += 1;

    if (
      row.probUp !== null &&
      row.probSideways !== null &&
      row.probDown !== null &&
      row.outcome
    ) {
      const probs: [number, number, number] = [
        row.probUp,
        row.probSideways,
        row.probDown,
      ];
      const idx = outcomeIndex(row.outcome);
      bucket.probs.push(probs);
      bucket.outcomes.push(idx);
      allProbs.push(probs);
      allOutcomes.push(idx);
    }
    byHorizon.set(row.horizon, bucket);

    const bin = bins.find((b) => row.confidence >= b.lo && row.confidence < b.hi);
    if (bin) {
      bin.confSum += row.confidence;
      bin.correct += row.correct ? 1 : 0;
      bin.count += 1;
    }
  }

  const horizons: HorizonCalibration[] = ALL_HORIZONS.map((horizon) => {
    const bucket = byHorizon.get(horizon);
    if (!bucket || bucket.labeled === 0) {
      return { horizon, labeled: 0, accuracy: null, brier: null };
    }
    return {
      horizon,
      labeled: bucket.labeled,
      accuracy: bucket.correct / bucket.labeled,
      brier: brierScore(bucket.probs, bucket.outcomes),
    };
  });

  const reliability: ReliabilityBin[] = bins.map((bin) => ({
    label: bin.label,
    predicted: bin.count > 0 ? bin.confSum / bin.count : null,
    empirical: bin.count > 0 ? bin.correct / bin.count : null,
    count: bin.count,
  }));

  // Abstention: assess the latest-run active-model signals through the gate.
  const latest = await prisma.prediction.findFirst({
    where: { insufficientData: false, mlModel: { status: "ACTIVE" } },
    orderBy: { asOf: "desc" },
    select: { asOf: true },
  });
  const abstention = {
    assessed: 0,
    standAside: 0,
    researchOnly: 0,
    rate: 0,
    topReasons: [] as { reason: AbstainReason; count: number }[],
  };

  if (latest) {
    const dayStart = new Date(latest.asOf);
    dayStart.setUTCHours(0, 0, 0, 0);
    const current = await prisma.prediction.findMany({
      where: {
        asOf: { gte: dayStart },
        insufficientData: false,
        mlModel: { status: "ACTIVE" },
      },
      include: { mlModel: true },
      take: 5_000,
    });

    const reasonCounts = new Map<AbstainReason, number>();
    for (const row of current) {
      const metrics = parseModelMetrics(row.mlModel.metrics);
      const sampleCount = metrics?.samples?.[row.horizon] ?? 0;
      const decision = assessDecisionSupport({
        direction: row.direction,
        horizon: row.horizon,
        confidence: row.confidence,
        calibrated: row.calibrated,
        expectedReturn: row.expectedReturn,
        freshness: "eod",
        dataCompleteness: 1,
        sampleCount,
        transactionCostRate: transactionCostAssumption("EQUITY"),
        modelProbabilities: [
          row.probUp ?? 0,
          row.probSideways ?? 0,
          row.probDown ?? 0,
        ],
      });
      abstention.assessed += 1;
      if (decision.state === "STAND_ASIDE") abstention.standAside += 1;
      else abstention.researchOnly += 1;
      for (const reason of decision.reasons) {
        reasonCounts.set(reason, (reasonCounts.get(reason) ?? 0) + 1);
      }
    }
    abstention.rate =
      abstention.assessed > 0 ? abstention.standAside / abstention.assessed : 0;
    abstention.topReasons = [...reasonCounts.entries()]
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count);
  }

  // Model bench: compare every registered model (ACTIVE ensemble vs SHADOW).
  const models = await prisma.mlModel.findMany({
    orderBy: [{ status: "asc" }, { key: "asc" }],
  });
  const bench: ModelBenchRow[] = models.map((model) => {
    const metrics = parseModelMetrics(model.metrics);
    const raw =
      model.metrics && typeof model.metrics === "object" && !Array.isArray(model.metrics)
        ? (model.metrics as Record<string, unknown>)
        : {};
    const accuracyValues = metrics?.accuracy
      ? Object.values(metrics.accuracy)
      : [];
    const sampleValues = metrics?.samples ? Object.values(metrics.samples) : [];
    const avgAccuracy =
      accuracyValues.length > 0
        ? accuracyValues.reduce((a, b) => a + b, 0) / accuracyValues.length
        : null;
    const totalSamples =
      sampleValues.length > 0 ? sampleValues.reduce((a, b) => a + b, 0) : null;
    return {
      key: model.key,
      version: model.version,
      kind: model.kind,
      status: model.status,
      accuracy: avgAccuracy,
      samples: totalSamples,
      brier: typeof raw.brier === "number" ? raw.brier : null,
      baselineAccuracy:
        typeof raw.baselineAccuracy === "number" ? raw.baselineAccuracy : null,
      note: typeof raw.note === "string" ? raw.note : null,
    };
  });

  return {
    latestRunAt: latest?.asOf.toISOString() ?? null,
    totalLabeled: matured.length,
    overallBrier: brierScore(allProbs, allOutcomes),
    horizons,
    reliability,
    bench,
    abstention,
  };
}
