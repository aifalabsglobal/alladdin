import "server-only";

import type { Direction, PredictionHorizon } from "@prisma/client";

import { prisma } from "@/lib/db";
import { directionFromReturn } from "@/lib/prediction/types";

function tradingDaysAhead(horizon: PredictionHorizon): number | null {
  switch (horizon) {
    case "D1":
    case "EOD":
      return 1;
    case "W1":
      return 5;
    case "M1":
      return 21;
    default:
      return null; // intraday horizons labeled separately when bars exist
  }
}

export type LabelSummary = {
  examined: number;
  labeled: number;
  correct: number;
  byHorizon: Record<string, { labeled: number; correct: number }>;
};

/**
 * Mature outcomes from the first eligible intraday bar at targetAt for
 * M15/H1/EOD, and future EOD closes for D1/W1/M1.
 */
export async function labelPredictionOutcomes(limit = 2000): Promise<LabelSummary> {
  const pending = await prisma.prediction.findMany({
    where: {
      outcome: null,
    },
    orderBy: { date: "asc" },
    take: limit,
    select: {
      id: true,
      stockId: true,
      date: true,
      horizon: true,
      direction: true,
      asOf: true,
      targetAt: true,
    },
  });

  const summary: LabelSummary = {
    examined: pending.length,
    labeled: 0,
    correct: 0,
    byHorizon: {},
  };

  for (const pred of pending) {
    if (
      (pred.horizon === "M15" ||
        pred.horizon === "H1" ||
        pred.horizon === "EOD") &&
      pred.targetAt
    ) {
      const interval = pred.horizon === "H1" ? "H1" : "M15";
      const [entry, exit] = await Promise.all([
        prisma.intradayBar.findFirst({
          where: {
            stockId: pred.stockId,
            interval,
            complete: true,
            closeTime: { lte: pred.asOf },
          },
          orderBy: { closeTime: "desc" },
          select: { close: true },
        }),
        prisma.intradayBar.findFirst({
          where: {
            stockId: pred.stockId,
            interval,
            complete: true,
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
      await prisma.prediction.update({
        where: { id: pred.id },
        data: { outcome, correct, realizedReturn },
      });

      summary.labeled += 1;
      if (correct) summary.correct += 1;
      const bucket = summary.byHorizon[pred.horizon] ?? {
        labeled: 0,
        correct: 0,
      };
      bucket.labeled += 1;
      if (correct) bucket.correct += 1;
      summary.byHorizon[pred.horizon] = bucket;
      continue;
    }

    const days = tradingDaysAhead(pred.horizon);
    if (days === null) continue;

    const bars = await prisma.priceBar.findMany({
      where: {
        stockId: pred.stockId,
        date: { gte: pred.date },
      },
      orderBy: { date: "asc" },
      take: days + 1,
      select: { date: true, close: true },
    });

    if (bars.length < days + 1) continue;
    const entry = bars[0]!;
    const exit = bars[days]!;
    if (entry.close === 0) continue;

    const realizedReturn = (exit.close - entry.close) / entry.close;
    const outcome: Direction = directionFromReturn(realizedReturn, pred.horizon);
    const correct = outcome === pred.direction;

    await prisma.prediction.update({
      where: { id: pred.id },
      data: {
        outcome,
        correct,
        realizedReturn,
      },
    });

    summary.labeled += 1;
    if (correct) summary.correct += 1;
    const bucket = summary.byHorizon[pred.horizon] ?? { labeled: 0, correct: 0 };
    bucket.labeled += 1;
    if (correct) bucket.correct += 1;
    summary.byHorizon[pred.horizon] = bucket;
  }

  // Refresh active model metrics from realized outcomes.
  const active = await prisma.mlModel.findMany({
    where: { status: "ACTIVE" },
  });
  for (const model of active) {
    const rows = await prisma.prediction.findMany({
      where: { mlModelId: model.id, correct: { not: null } },
      select: { horizon: true, correct: true },
    });
    const accuracy: Record<string, number> = {};
    const counts: Record<string, { n: number; c: number }> = {};
    for (const row of rows) {
      const bucket = counts[row.horizon] ?? { n: 0, c: 0 };
      bucket.n += 1;
      if (row.correct) bucket.c += 1;
      counts[row.horizon] = bucket;
    }
    for (const [h, v] of Object.entries(counts)) {
      accuracy[h] = v.n > 0 ? v.c / v.n : 0;
    }
    await prisma.mlModel.update({
      where: { id: model.id },
      data: {
        metrics: {
          accuracy,
          samples: Object.fromEntries(
            Object.entries(counts).map(([h, v]) => [h, v.n]),
          ),
          updatedAt: new Date().toISOString(),
          source: "realized_outcomes",
        },
      },
    });
  }

  return summary;
}
