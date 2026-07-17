import type { FeatureVector } from "@/lib/prediction/types";
import {
  mean,
  percentChange,
  sma,
  standardDeviation,
  wilderRsi,
} from "@/lib/scoring/indicators";

export type FeatureInputs = {
  closes: number[];
  volumes?: number[];
  healthScore?: number | null;
  indiaVix?: number | null;
  fiiNet?: number | null;
  newsSentiment?: number | null;
  sectorMomentum?: number | null;
};

/**
 * Leakage-safe feature builder: uses only data available at asOf.
 * Returns nulls when history is insufficient for a given feature.
 */
export function buildPredictionFeatures(input: FeatureInputs): FeatureVector {
  const closes = input.closes;
  const n = closes.length;
  const last = n > 0 ? closes[n - 1]! : null;
  const prev = n > 1 ? closes[n - 2]! : null;

  const ret1 =
    last !== null && prev !== null ? percentChange(last, prev) / 100 : null;
  const ret5 =
    n >= 6 ? percentChange(closes[n - 1]!, closes[n - 6]!) / 100 : null;
  const ret20 =
    n >= 21 ? percentChange(closes[n - 1]!, closes[n - 21]!) / 100 : null;

  const ma5 = n >= 5 ? sma(closes, 5) : null;
  const ma20 = n >= 20 ? sma(closes, 20) : null;
  const trend =
    last !== null && ma20 !== null && ma20 !== 0
      ? (last - ma20) / ma20
      : null;

  const rsi = n >= 15 ? wilderRsi(closes, 14) : null;
  const vol20 =
    n >= 21
      ? standardDeviation(
          closes
            .slice(-21)
            .map((c, i, arr) =>
              i === 0 ? 0 : percentChange(c, arr[i - 1]!) / 100,
            )
            .slice(1),
        )
      : null;

  const vols = input.volumes ?? [];
  const avgVolume = vols.length >= 21 ? mean(vols.slice(-21)) : null;
  const volRatio =
    vols.length >= 21 && avgVolume !== null
      ? vols[vols.length - 1]! / Math.max(avgVolume, 1e-9)
      : null;

  return {
    ret_1: ret1,
    ret_5: ret5,
    ret_20: ret20,
    trend_ma20: trend,
    ma5_ma20:
      ma5 !== null && ma20 !== null && ma20 !== 0 ? (ma5 - ma20) / ma20 : null,
    rsi_14: rsi,
    vol_20: vol20,
    volume_ratio: volRatio,
    health_score:
      input.healthScore === null || input.healthScore === undefined
        ? null
        : input.healthScore / 100,
    india_vix: input.indiaVix ?? null,
    fii_net_z:
      input.fiiNet === null || input.fiiNet === undefined
        ? null
        : Math.tanh(input.fiiNet / 2000),
    news_sentiment: input.newsSentiment ?? null,
    sector_momentum: input.sectorMomentum ?? null,
  };
}

export function featureCompleteness(features: FeatureVector): number {
  const values = Object.values(features);
  if (values.length === 0) return 0;
  const present = values.filter((v) => v !== null && Number.isFinite(v)).length;
  return present / values.length;
}
