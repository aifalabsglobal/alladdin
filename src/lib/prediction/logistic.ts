/**
 * Minimal, dependency-free binary logistic regression with L2 regularization,
 * feature standardization, and batch gradient descent. Deterministic given the
 * same inputs. Used only for the SHADOW model bench — never for live signals.
 */

export type LogisticModel = {
  featureKeys: string[];
  weights: number[];
  bias: number;
  mean: number[];
  std: number[];
};

export function sigmoid(z: number): number {
  if (z >= 0) return 1 / (1 + Math.exp(-z));
  const e = Math.exp(z);
  return e / (1 + e);
}

function standardize(
  rows: number[][],
): { mean: number[]; std: number[]; scaled: number[][] } {
  const cols = rows[0]?.length ?? 0;
  const mean = new Array(cols).fill(0);
  const std = new Array(cols).fill(0);
  for (const row of rows) {
    for (let j = 0; j < cols; j += 1) mean[j] += row[j]! / rows.length;
  }
  for (const row of rows) {
    for (let j = 0; j < cols; j += 1) {
      std[j] += (row[j]! - mean[j]) ** 2 / rows.length;
    }
  }
  for (let j = 0; j < cols; j += 1) std[j] = Math.sqrt(std[j]) || 1;
  const scaled = rows.map((row) =>
    row.map((value, j) => (value - mean[j]!) / std[j]!),
  );
  return { mean, std, scaled };
}

export function fitLogistic(
  X: number[][],
  y: number[],
  featureKeys: string[],
  opts?: { epochs?: number; lr?: number; l2?: number },
): LogisticModel {
  const epochs = opts?.epochs ?? 400;
  const lr = opts?.lr ?? 0.1;
  const l2 = opts?.l2 ?? 0.001;
  const cols = featureKeys.length;
  const { mean, std, scaled } = standardize(X);

  const weights = new Array(cols).fill(0);
  let bias = 0;
  const n = scaled.length || 1;

  for (let epoch = 0; epoch < epochs; epoch += 1) {
    const gradW = new Array(cols).fill(0);
    let gradB = 0;
    for (let i = 0; i < scaled.length; i += 1) {
      const row = scaled[i]!;
      let z = bias;
      for (let j = 0; j < cols; j += 1) z += weights[j]! * row[j]!;
      const pred = sigmoid(z);
      const err = pred - y[i]!;
      for (let j = 0; j < cols; j += 1) gradW[j] += (err * row[j]!) / n;
      gradB += err / n;
    }
    for (let j = 0; j < cols; j += 1) {
      weights[j] -= lr * (gradW[j]! + l2 * weights[j]!);
    }
    bias -= lr * gradB;
  }

  return { featureKeys, weights, bias, mean, std };
}

export function predictLogisticProb(
  model: LogisticModel,
  features: Record<string, number | null | undefined>,
): number {
  let z = model.bias;
  for (let j = 0; j < model.featureKeys.length; j += 1) {
    const key = model.featureKeys[j]!;
    const raw = features[key];
    const value = raw === null || raw === undefined || !Number.isFinite(raw) ? model.mean[j]! : raw;
    const scaled = (value - model.mean[j]!) / (model.std[j]! || 1);
    z += model.weights[j]! * scaled;
  }
  return sigmoid(z);
}

/** Binary Brier score (mean squared error of probabilities). */
export function binaryBrier(probs: number[], outcomes: number[]): number | null {
  if (probs.length === 0 || probs.length !== outcomes.length) return null;
  const total = probs.reduce(
    (sum, p, i) => sum + (p - outcomes[i]!) ** 2,
    0,
  );
  return total / probs.length;
}
