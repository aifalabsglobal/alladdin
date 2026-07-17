export function clampNormalized(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(-100, Math.min(100, value));
}

export function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle] ?? null;
  return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}

export function sma(values: number[], period: number): number | null {
  if (period <= 0 || values.length < period) return null;
  return mean(values.slice(-period));
}

export function percentChange(current: number, previous: number): number {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) {
    return 0;
  }
  return ((current - previous) / Math.abs(previous)) * 100;
}

/** Wilder RSI. Input must be chronological. */
export function wilderRsi(values: number[], period = 14): number | null {
  if (values.length < period + 1 || period <= 0) return null;

  let gains = 0;
  let losses = 0;
  for (let i = 1; i <= period; i += 1) {
    const delta = (values[i] ?? 0) - (values[i - 1] ?? 0);
    if (delta >= 0) gains += delta;
    else losses -= delta;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < values.length; i += 1) {
    const delta = (values[i] ?? 0) - (values[i - 1] ?? 0);
    const gain = Math.max(0, delta);
    const loss = Math.max(0, -delta);
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return avgGain === 0 ? 50 : 100;
  const relativeStrength = avgGain / avgLoss;
  return 100 - 100 / (1 + relativeStrength);
}

export function standardDeviation(values: number[]): number | null {
  const avg = mean(values);
  if (avg === null || values.length < 2) return null;
  const variance =
    values.reduce((sum, value) => sum + (value - avg) ** 2, 0) /
    values.length;
  return Math.sqrt(variance);
}

export function zScore(value: number, population: number[]): number {
  const avg = mean(population);
  const sd = standardDeviation(population);
  if (avg === null || sd === null || sd === 0) return 0;
  return (value - avg) / sd;
}

export function decayWeightedAverage(
  points: { value: number; ageDays: number }[],
  halfLifeDays = 3,
): number | null {
  if (points.length === 0 || halfLifeDays <= 0) return null;
  let weighted = 0;
  let totalWeight = 0;
  for (const point of points) {
    const weight = 0.5 ** (Math.max(0, point.ageDays) / halfLifeDays);
    weighted += point.value * weight;
    totalWeight += weight;
  }
  return totalWeight === 0 ? null : weighted / totalWeight;
}

export function dateDiffDays(later: Date, earlier: Date): number {
  return Math.max(
    0,
    Math.round((later.getTime() - earlier.getTime()) / 86_400_000),
  );
}
