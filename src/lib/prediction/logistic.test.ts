import { describe, expect, it } from "vitest";

import {
  binaryBrier,
  fitLogistic,
  predictLogisticProb,
  sigmoid,
} from "@/lib/prediction/logistic";

describe("sigmoid", () => {
  it("is symmetric around 0.5", () => {
    expect(sigmoid(0)).toBeCloseTo(0.5, 6);
    expect(sigmoid(10)).toBeGreaterThan(0.99);
    expect(sigmoid(-10)).toBeLessThan(0.01);
  });
});

describe("fitLogistic", () => {
  it("learns a separable single-feature boundary", () => {
    const X: number[][] = [];
    const y: number[] = [];
    for (let i = 0; i < 200; i += 1) {
      const x = (i - 100) / 20;
      X.push([x]);
      y.push(x > 0 ? 1 : 0);
    }
    const model = fitLogistic(X, y, ["x"], { epochs: 800, lr: 0.3 });
    expect(predictLogisticProb(model, { x: 5 })).toBeGreaterThan(0.8);
    expect(predictLogisticProb(model, { x: -5 })).toBeLessThan(0.2);
  });

  it("falls back to feature mean for missing inputs", () => {
    const X = [[1], [2], [3], [4]];
    const y = [0, 0, 1, 1];
    const model = fitLogistic(X, y, ["x"]);
    const prob = predictLogisticProb(model, {});
    expect(prob).toBeGreaterThanOrEqual(0);
    expect(prob).toBeLessThanOrEqual(1);
  });
});

describe("binaryBrier", () => {
  it("returns 0 for perfect predictions", () => {
    expect(binaryBrier([1, 0, 1], [1, 0, 1])).toBe(0);
  });

  it("returns null on mismatched lengths", () => {
    expect(binaryBrier([1, 0], [1])).toBeNull();
  });
});
