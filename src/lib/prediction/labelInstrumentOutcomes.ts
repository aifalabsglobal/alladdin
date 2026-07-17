import "server-only";

import type { InstrumentInterval, PredictionHorizon } from "@prisma/client";

import { prisma } from "@/lib/db";
import { directionFromReturn } from "@/lib/prediction/types";

function intervalForHorizon(
  horizon: PredictionHorizon,
): InstrumentInterval {
  if (horizon === "H1") return "H1";
  if (horizon === "M15" || horizon === "EOD") return "M15";
  return "D1";
}

export type InstrumentLabelSummary = {
  examined: number;
  labeled: number;
  correct: number;
  byHorizon: Record<string, { labeled: number; correct: number }>;
};

/**
 * Mature instrument predictions from the first observed bar at or after
 * targetAt, using the interval that matches the horizon. Time-based so it works
 * across every asset class and session type.
 */
export async function labelInstrumentOutcomes(
  limit = 2000,
): Promise<InstrumentLabelSummary> {
  const pending = await prisma.instrumentPrediction.findMany({
    where: { outcome: null, targetAt: { not: null } },
    orderBy: { date: "asc" },
    take: limit,
    select: {
      id: true,
      instrumentId: true,
      horizon: true,
      direction: true,
      asOf: true,
      targetAt: true,
    },
  });

  const summary: InstrumentLabelSummary = {
    examined: pending.length,
    labeled: 0,
    correct: 0,
    byHorizon: {},
  };

  for (const pred of pending) {
    if (!pred.targetAt) continue;
    const interval = intervalForHorizon(pred.horizon);
    const [entry, exit] = await Promise.all([
      prisma.instrumentBar.findFirst({
        where: {
          instrumentId: pred.instrumentId,
          interval,
          quality: { not: "INCOMPLETE" },
          closeTime: { lte: pred.asOf },
        },
        orderBy: { closeTime: "desc" },
        select: { close: true },
      }),
      prisma.instrumentBar.findFirst({
        where: {
          instrumentId: pred.instrumentId,
          interval,
          quality: { not: "INCOMPLETE" },
          closeTime: { gte: pred.targetAt },
        },
        orderBy: { closeTime: "asc" },
        select: { close: true },
      }),
    ]);
    if (!entry || !exit || entry.close === 0) continue;

    const realizedReturn = (exit.close - entry.close) / entry.close;
    const outcome = directionFromReturn(realizedReturn, pred.horizon);
    const correct = outcome === pred.direction;
    await prisma.instrumentPrediction.update({
      where: { id: pred.id },
      data: { outcome, correct, realizedReturn },
    });

    summary.labeled += 1;
    if (correct) summary.correct += 1;
    const bucket = summary.byHorizon[pred.horizon] ?? { labeled: 0, correct: 0 };
    bucket.labeled += 1;
    if (correct) bucket.correct += 1;
    summary.byHorizon[pred.horizon] = bucket;
  }

  return summary;
}
