import "server-only";

import type { PredictionHorizon } from "@prisma/client";

import { prisma } from "@/lib/db";
import { calibrateLinear } from "@/lib/prediction/baselineRules";

type ReliabilityPoint = { x: number; y: number };

const HORIZONS: PredictionHorizon[] = ["M15", "H1", "EOD", "D1", "W1", "M1"];
const MIN_SAMPLES = 80;

function reliabilityBins(
  pairs: { confidence: number; correct: boolean }[],
): { mapping: ReliabilityPoint[]; ece: number } {
  const edges = [0, 0.5, 0.6, 0.7, 0.8, 0.9, 1.01];
  const mapping: ReliabilityPoint[] = [];
  let ece = 0;
  let total = 0;
  for (let i = 0; i < edges.length - 1; i += 1) {
    const lo = edges[i]!;
    const hi = edges[i + 1]!;
    const bin = pairs.filter((p) => p.confidence >= lo && p.confidence < hi);
    if (bin.length === 0) continue;
    const predicted = bin.reduce((s, p) => s + p.confidence, 0) / bin.length;
    const empirical = bin.filter((p) => p.correct).length / bin.length;
    mapping.push({ x: predicted, y: empirical });
    ece += (bin.length / pairs.length) * Math.abs(predicted - empirical);
    total += bin.length;
  }
  if (total === 0) return { mapping: [], ece: 0 };
  return { mapping, ece };
}

function applyMapping(confidence: number, mapping: ReliabilityPoint[]): number {
  if (mapping.length === 0) return confidence;
  const sorted = [...mapping].sort((a, b) => a.x - b.x);
  if (confidence <= sorted[0]!.x) return sorted[0]!.y;
  const last = sorted[sorted.length - 1]!;
  if (confidence >= last.x) return last.y;
  for (let i = 0; i < sorted.length - 1; i += 1) {
    const a = sorted[i]!;
    const b = sorted[i + 1]!;
    if (confidence >= a.x && confidence <= b.x) {
      const t = (confidence - a.x) / Math.max(1e-9, b.x - a.x);
      return a.y + t * (b.y - a.y);
    }
  }
  return confidence;
}

export async function fitCalibrationArtifacts(modelKey = "ensemble_v1") {
  const results: { horizon: PredictionHorizon; samples: number; ece: number | null }[] = [];
  for (const horizon of HORIZONS) {
    const rows = await prisma.prediction.findMany({
      where: {
        horizon,
        correct: { not: null },
        mlModel: { key: modelKey },
      },
      select: { confidence: true, correct: true },
      orderBy: { asOf: "asc" },
      take: 10_000,
    });
    if (rows.length < MIN_SAMPLES) {
      results.push({ horizon, samples: rows.length, ece: null });
      continue;
    }
    // Chronological holdout: fit on first 70%, evaluate ECE on last 30%.
    const cut = Math.floor(rows.length * 0.7);
    const train = rows.slice(0, cut).map((r) => ({
      confidence: r.confidence,
      correct: Boolean(r.correct),
    }));
    const test = rows.slice(cut).map((r) => ({
      confidence: r.confidence,
      correct: Boolean(r.correct),
    }));
    const { mapping } = reliabilityBins(train);
    const calibratedTest = test.map((r) => ({
      confidence: applyMapping(r.confidence, mapping),
      correct: r.correct,
    }));
    const { ece } = reliabilityBins(calibratedTest);
    await prisma.calibrationArtifact.upsert({
      where: {
        modelKey_horizon_method: {
          modelKey,
          horizon,
          method: "isotonic_bins",
        },
      },
      create: {
        modelKey,
        horizon,
        method: "isotonic_bins",
        mapping,
        samples: train.length,
        ece,
        trainedAt: new Date(),
      },
      update: {
        mapping,
        samples: train.length,
        ece,
        trainedAt: new Date(),
      },
    });
    results.push({ horizon, samples: train.length, ece });
  }
  return results;
}

export async function loadCalibrationMap(
  modelKey: string,
  horizon: PredictionHorizon,
): Promise<ReliabilityPoint[] | null> {
  const artifact = await prisma.calibrationArtifact.findUnique({
    where: {
      modelKey_horizon_method: {
        modelKey,
        horizon,
        method: "isotonic_bins",
      },
    },
  });
  if (!artifact || artifact.samples < MIN_SAMPLES) return null;
  const mapping = artifact.mapping;
  if (!Array.isArray(mapping)) return null;
  return mapping as ReliabilityPoint[];
}

export function applyCalibration(
  confidence: number,
  mapping: ReliabilityPoint[] | null,
  sampleAccuracy: number | null,
): { confidence: number; calibrated: boolean } {
  if (mapping && mapping.length > 0) {
    return {
      confidence: Number(applyMapping(confidence, mapping).toFixed(4)),
      calibrated: true,
    };
  }
  if (sampleAccuracy !== null) {
    return {
      confidence: Number(calibrateLinear(confidence, sampleAccuracy).toFixed(4)),
      calibrated: true,
    };
  }
  return { confidence, calibrated: false };
}
