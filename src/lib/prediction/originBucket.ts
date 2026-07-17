import type { PredictionHorizon } from "@prisma/client";

/**
 * Floor `asOf` into a stable forecast-origin bucket so repeated same-day
 * intraday runs do not overwrite each other, while daily horizons still share
 * one row per calendar day.
 */
export function originBucketFor(
  horizon: PredictionHorizon,
  asOf: Date,
): Date {
  const d = new Date(asOf.getTime());
  if (horizon === "M15") {
    const minutes = d.getUTCMinutes();
    d.setUTCMinutes(minutes - (minutes % 15), 0, 0);
    return d;
  }
  if (horizon === "H1") {
    d.setUTCMinutes(0, 0, 0);
    return d;
  }
  if (horizon === "EOD") {
    d.setUTCHours(12, 0, 0, 0);
    return d;
  }
  // D1/W1/M1 — one bucket per UTC calendar day
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
