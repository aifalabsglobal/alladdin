import "server-only";

import type { Direction, HealthBand, PredictionHorizon } from "@prisma/client";

import { prisma } from "@/lib/db";
import { parseModelMetrics } from "@/lib/queries/parsers";

export type DashboardPrediction = {
  id: string;
  symbol: string;
  name: string;
  sectorName: string;
  horizon: PredictionHorizon;
  direction: Direction;
  confidence: number;
  probUp: number | null;
  probSideways: number | null;
  probDown: number | null;
  expectedReturn: number | null;
  uncertainty: number | null;
  insufficientData: boolean;
  calibrated: boolean;
  modelKey: string;
  modelVersion: string;
  accuracy: number | null;
  score: number | null;
  band: HealthBand | null;
};

export async function getHighConfidencePredictions(
  limit = 8,
): Promise<DashboardPrediction[]> {
  const latest = await prisma.prediction.findFirst({
    where: { insufficientData: false },
    orderBy: { asOf: "desc" },
    select: { asOf: true },
  });
  if (!latest) return [];

  // Window: same calendar day as latest run.
  const dayStart = new Date(latest.asOf);
  dayStart.setUTCHours(0, 0, 0, 0);

  const rows = await prisma.prediction.findMany({
    where: {
      asOf: { gte: dayStart },
      insufficientData: false,
      confidence: { gte: 0.45 },
      mlModel: { status: "ACTIVE" },
    },
    include: {
      stock: {
        include: {
          sector: true,
          healthScores: { orderBy: { date: "desc" }, take: 1 },
        },
      },
      mlModel: true,
    },
    orderBy: [{ confidence: "desc" }, { asOf: "desc" }],
    take: limit * 3,
  });

  // Prefer one row per symbol (highest confidence).
  const seen = new Set<string>();
  const out: DashboardPrediction[] = [];
  for (const row of rows) {
    if (seen.has(row.stock.symbol)) continue;
    seen.add(row.stock.symbol);
    const metrics = parseModelMetrics(row.mlModel.metrics);
    out.push({
      id: row.id,
      symbol: row.stock.symbol,
      name: row.stock.name,
      sectorName: row.stock.sector.name,
      horizon: row.horizon,
      direction: row.direction,
      confidence: row.confidence,
      probUp: row.probUp,
      probSideways: row.probSideways,
      probDown: row.probDown,
      expectedReturn: row.expectedReturn,
      uncertainty: row.uncertainty,
      insufficientData: row.insufficientData,
      calibrated: row.calibrated,
      modelKey: row.mlModel.key,
      modelVersion: row.mlModel.version,
      accuracy: metrics?.accuracy?.[row.horizon] ?? null,
      score: row.stock.healthScores[0]?.score ?? null,
      band: row.stock.healthScores[0]?.band ?? null,
    });
    if (out.length >= limit) break;
  }
  return out;
}

export async function getServiceHealthItems(): Promise<
  {
    key: string;
    label: string;
    status: "ok" | "degraded" | "down" | "unknown";
    detail?: string;
  }[]
> {
  const [ingest, score, predict, livePred] = await Promise.all([
    prisma.ingestionRun.findFirst({ orderBy: { startedAt: "desc" } }),
    prisma.healthScore.findFirst({
      where: { dataSource: "COMPUTED" },
      orderBy: { date: "desc" },
    }),
    prisma.prediction.findFirst({
      where: { mlModel: { key: "ensemble_v1" } },
      orderBy: { asOf: "desc" },
    }),
    prisma.mlModel.findFirst({
      where: { status: "ACTIVE" },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const ageHours = (d: Date | null | undefined) =>
    d ? (Date.now() - d.getTime()) / 3_600_000 : null;

  const ingestAge = ageHours(ingest?.startedAt);
  const scoreAge = ageHours(score?.date);
  const predAge = ageHours(predict?.asOf);

  return [
    {
      key: "ingest",
      label: "EOD / intraday ingestion",
      status:
        !ingest
          ? "unknown"
          : ingest.status === "FAILED"
            ? "down"
            : ingestAge !== null && ingestAge > 36
              ? "degraded"
              : "ok",
      detail: ingest
        ? `${ingest.adapter} · ${ingest.status} · ${ingest.startedAt.toISOString()}`
        : "No runs yet",
    },
    {
      key: "scoring",
      label: "Health scoring engine",
      status:
        !score
          ? "unknown"
          : scoreAge !== null && scoreAge > 48
            ? "degraded"
            : "ok",
      detail: score
        ? `Latest computed score date ${score.date.toISOString().slice(0, 10)}`
        : "No computed scores",
    },
    {
      key: "predictions",
      label: "Prediction ensemble",
      status:
        !predict
          ? "unknown"
          : predAge !== null && predAge > 36
            ? "degraded"
            : "ok",
      detail: predict
        ? `Last run ${predict.asOf.toISOString()} · model ${livePred?.key ?? "—"}@${livePred?.version ?? "—"}`
        : "No ensemble predictions yet — run /api/jobs/predict",
    },
    {
      key: "yahoo",
      label: "Yahoo prototype stream",
      status: "degraded",
      detail:
        "Unofficial browser WebSocket — not licensed redistribution; EOD fallback active off-hours",
    },
  ];
}
