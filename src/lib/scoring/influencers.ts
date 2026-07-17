import {
  clampNormalized,
  decayWeightedAverage,
  mean,
  median,
  percentChange,
  sma,
  wilderRsi,
  zScore,
} from "@/lib/scoring/indicators";
import type { MacroSensitivity } from "@/lib/scoring/sensitivity";

export type SignalResult = {
  rawValue: number;
  normalizedScore: number;
  reasonText: string;
  dataQuality: number;
  provenance: string[];
  isFallback: boolean;
};

function unavailable(reason: string): SignalResult {
  return {
    rawValue: 0,
    normalizedScore: 0,
    reasonText: `${reason}; neutral contribution`,
    dataQuality: 0,
    provenance: [],
    isFallback: true,
  };
}

export function trendMaSignal(closes: number[]): SignalResult {
  if (closes.length < 20) return unavailable("Fewer than 20 real price sessions");
  const close = closes.at(-1) ?? 0;
  const fastPeriod = Math.min(50, closes.length);
  const slowPeriod = Math.min(200, closes.length);
  const fast = sma(closes, fastPeriod);
  const slow = sma(closes, slowPeriod);
  if (fast === null || slow === null) return unavailable("Moving averages unavailable");

  const priceVsFast = percentChange(close, fast);
  const fastVsSlow = percentChange(fast, slow);
  const normalizedScore = clampNormalized(priceVsFast * 8 + fastVsSlow * 10);
  const quality = Math.min(1, closes.length / 200);
  return {
    rawValue: priceVsFast,
    normalizedScore,
    reasonText: `Close is ${Math.abs(priceVsFast).toFixed(1)}% ${priceVsFast >= 0 ? "above" : "below"} the ${fastPeriod}-session average; ${fastPeriod}/${slowPeriod} trend ${fastVsSlow >= 0 ? "supportive" : "weakening"}`,
    dataQuality: quality,
    provenance: ["NSE_BHAVCOPY"],
    isFallback: closes.length < 200,
  };
}

export function rsiSignal(closes: number[]): SignalResult {
  const rsi = wilderRsi(closes, 14);
  if (rsi === null) return unavailable("RSI needs at least 15 real sessions");

  // Per product rules: oversold is mildly positive for mean reversion,
  // overbought is mildly negative, and the 30–70 band is neutral.
  const normalizedScore =
    rsi < 30
      ? clampNormalized((30 - rsi) * 2)
      : rsi > 70
        ? clampNormalized(-(rsi - 70) * 2)
        : 0;
  return {
    rawValue: rsi,
    normalizedScore,
    reasonText:
      rsi < 30
        ? `RSI ${rsi.toFixed(1)} is oversold, adding a cautious mean-reversion signal`
        : rsi > 70
          ? `RSI ${rsi.toFixed(1)} is overbought, adding a caution signal`
          : `RSI ${rsi.toFixed(1)} is in the balanced 30–70 range`,
    dataQuality: Math.min(1, (closes.length - 1) / 14),
    provenance: ["NSE_BHAVCOPY"],
    isFallback: false,
  };
}

export function volumeDeliverySignal(
  rows: { volume: number; deliveryPct: number | null }[],
): SignalResult {
  if (rows.length < 5) return unavailable("Volume history is too short");
  const latest = rows.at(-1);
  if (!latest) return unavailable("Latest volume is unavailable");
  const history = rows.slice(-21, -1);
  const avgVolume = mean(history.map((r) => r.volume));
  if (avgVolume === null || avgVolume === 0) {
    return unavailable("Average volume is unavailable");
  }
  const volumeRatio = latest.volume / avgVolume;
  const volumePart = (volumeRatio - 1) * 50;
  const deliveryPart =
    latest.deliveryPct === null ? 0 : (latest.deliveryPct - 40) * 1.5;
  return {
    rawValue: volumeRatio,
    normalizedScore: clampNormalized(volumePart + deliveryPart),
    reasonText: `${volumeRatio.toFixed(1)}× normal volume${latest.deliveryPct === null ? "; delivery percentage unavailable" : ` with ${latest.deliveryPct.toFixed(1)}% delivery`}`,
    dataQuality: Math.min(1, rows.length / 20) * (latest.deliveryPct === null ? 0.65 : 1),
    provenance: ["NSE_BHAVCOPY"],
    isFallback: latest.deliveryPct === null || rows.length < 20,
  };
}

export function epsGrowthSignal(
  value: number | null,
  sectorValues: number[],
): SignalResult {
  if (value === null) return unavailable("Real EPS growth is unavailable");
  const score =
    sectorValues.length >= 3
      ? clampNormalized(zScore(value, sectorValues) * 35)
      : clampNormalized(value * 2);
  const sectorMedian = median(sectorValues);
  return {
    rawValue: value,
    normalizedScore: score,
    reasonText:
      sectorMedian === null
        ? `EPS grew ${value.toFixed(1)}% year over year`
        : `EPS growth ${value.toFixed(1)}% versus sector median ${sectorMedian.toFixed(1)}%`,
    dataQuality: sectorValues.length >= 3 ? 1 : 0.65,
    provenance: ["YAHOO_FINANCE"],
    isFallback: sectorValues.length < 3,
  };
}

export function valuationPeSignal(
  pe: number | null,
  sectorPes: number[],
): SignalResult {
  const sectorMedian = median(sectorPes.filter((value) => value > 0));
  if (pe === null || pe <= 0 || sectorMedian === null) {
    return unavailable("Real P/E or sector comparison is unavailable");
  }
  const discount = percentChange(sectorMedian, pe);
  return {
    rawValue: pe,
    normalizedScore: clampNormalized(discount * 3),
    reasonText: `P/E ${pe.toFixed(1)} versus sector median ${sectorMedian.toFixed(1)} (${Math.abs(discount).toFixed(1)}% ${discount >= 0 ? "cheaper" : "richer"})`,
    dataQuality: Math.min(1, sectorPes.length / 5),
    provenance: ["YAHOO_FINANCE"],
    isFallback: sectorPes.length < 5,
  };
}

export function leverageSignal(
  debtToEquity: number | null,
  sectorValues: number[],
): SignalResult {
  const sectorMedian = median(sectorValues.filter((value) => value >= 0));
  if (debtToEquity === null || sectorMedian === null) {
    return unavailable("Real debt-to-equity data is unavailable");
  }
  const difference = sectorMedian - debtToEquity;
  return {
    rawValue: debtToEquity,
    normalizedScore: clampNormalized(difference * 60),
    reasonText: `Debt/equity ${debtToEquity.toFixed(2)} versus sector median ${sectorMedian.toFixed(2)}`,
    dataQuality: Math.min(1, sectorValues.length / 5),
    provenance: ["YAHOO_FINANCE"],
    isFallback: sectorValues.length < 5,
  };
}

export function newsSentimentSignal(
  points: { sentiment: number; ageDays: number }[],
): SignalResult {
  const average = decayWeightedAverage(
    points.map((p) => ({ value: p.sentiment, ageDays: p.ageDays })),
    3,
  );
  if (average === null) return unavailable("No real scored news in the last 7 days");
  return {
    rawValue: average,
    normalizedScore: clampNormalized(average * 100),
    reasonText: `Seven-day decay-weighted news sentiment is ${average >= 0 ? "positive" : "negative"} at ${average.toFixed(2)}`,
    dataQuality: Math.min(1, points.length / 3),
    provenance: ["NEWS_RSS"],
    isFallback: points.length < 3,
  };
}

export function fiiFlowSignal(
  values: number[],
  sensitivity: MacroSensitivity,
): SignalResult {
  if (values.length === 0) return unavailable("Real FII flow is unavailable");
  const fiveDayNet = values.slice(-5).reduce((sum, value) => sum + value, 0);
  return {
    rawValue: fiveDayNet,
    normalizedScore: clampNormalized((fiveDayNet / 5_000) * 100 * sensitivity.fiiBeta),
    reasonText: `${values.length}-session FII net flow is ${fiveDayNet >= 0 ? "an inflow" : "an outflow"} of ₹${Math.abs(fiveDayNet).toFixed(0)} Cr`,
    dataQuality: Math.min(1, values.length / 5),
    provenance: ["FII_DII"],
    isFallback: values.length < 5,
  };
}

export function sectorMomentumSignal(
  sectorIndex: number[],
  benchmark: number[],
  benchmarkIsProxy: boolean,
): SignalResult {
  const count = Math.min(sectorIndex.length, benchmark.length, 21);
  if (count < 5) return unavailable("Real sector history is too short");
  const sectorSlice = sectorIndex.slice(-count);
  const benchmarkSlice = benchmark.slice(-count);
  const sectorReturn = percentChange(
    sectorSlice.at(-1) ?? 0,
    sectorSlice[0] ?? 0,
  );
  const benchmarkReturn = percentChange(
    benchmarkSlice.at(-1) ?? 0,
    benchmarkSlice[0] ?? 0,
  );
  const excess = sectorReturn - benchmarkReturn;
  return {
    rawValue: excess,
    normalizedScore: clampNormalized(excess * 12),
    reasonText: `Sector returned ${sectorReturn.toFixed(1)}% versus ${benchmarkIsProxy ? "equal-weight market proxy" : "Nifty"} ${benchmarkReturn.toFixed(1)}% over ${count - 1} sessions`,
    dataQuality: Math.min(1, (count - 1) / 20) * (benchmarkIsProxy ? 0.8 : 1),
    provenance: benchmarkIsProxy
      ? ["NSE_BHAVCOPY", "MARKET_PROXY"]
      : ["NSE_BHAVCOPY", "MACRO"],
    isFallback: benchmarkIsProxy || count < 21,
  };
}

export function indiaVixSignal(value: number | null, staleDays = 0): SignalResult {
  if (value === null) return unavailable("Real India VIX is unavailable");
  const normalizedScore = clampNormalized((16 - value) * 8);
  return {
    rawValue: value,
    normalizedScore,
    reasonText: `India VIX is ${value.toFixed(1)}${value > 18 ? ", indicating elevated fear" : ", within a calmer range"}`,
    dataQuality: Math.max(0.2, 1 - staleDays / 10),
    provenance: ["MACRO"],
    isFallback: staleDays > 1,
  };
}

export function currencyCrudeSignal(
  usdInrChanges: number[],
  crudeChanges: number[],
  sensitivity: MacroSensitivity,
): SignalResult {
  if (usdInrChanges.length === 0 && crudeChanges.length === 0) {
    return unavailable("Real USD/INR and crude changes are unavailable");
  }
  const usdChange = usdInrChanges.at(-1) ?? 0;
  const crudeChange = crudeChanges.at(-1) ?? 0;
  const score =
    usdChange * sensitivity.usdInr * 18 + crudeChange * sensitivity.crude * 12;
  const sources = [
    ...(usdInrChanges.length ? ["USD_INR"] : []),
    ...(crudeChanges.length ? ["CRUDE_BRENT"] : []),
  ];
  return {
    rawValue: usdChange * sensitivity.usdInr + crudeChange * sensitivity.crude,
    normalizedScore: clampNormalized(score),
    reasonText: `USD/INR moved ${usdChange.toFixed(2)}% and crude ${crudeChange.toFixed(2)}%, adjusted for sector sensitivity`,
    dataQuality:
      (usdInrChanges.length > 0 ? 0.5 : 0) +
      (crudeChanges.length > 0 ? 0.5 : 0),
    provenance: sources,
    isFallback: sources.length < 2,
  };
}
