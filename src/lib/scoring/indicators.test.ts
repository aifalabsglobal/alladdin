import { describe, expect, it } from "vitest";

import {
  clampNormalized,
  decayWeightedAverage,
  mean,
  median,
  percentChange,
  sma,
  wilderRsi,
  zScore,
} from "./indicators";

describe("indicator math", () => {
  it("calculates means, medians and moving averages", () => {
    expect(mean([1, 2, 3])).toBe(2);
    expect(mean([])).toBeNull();
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(sma([1, 2, 3, 4, 5], 3)).toBe(4);
    expect(sma([1, 2], 3)).toBeNull();
  });

  it("calculates percent change and guards zero denominators", () => {
    expect(percentChange(110, 100)).toBeCloseTo(10);
    expect(percentChange(90, 100)).toBeCloseTo(-10);
    expect(percentChange(1, 0)).toBe(0);
  });

  it("calculates Wilder RSI for known directional vectors", () => {
    const rising = Array.from({ length: 20 }, (_, i) => i + 1);
    const falling = Array.from({ length: 20 }, (_, i) => 20 - i);
    const flat = Array.from({ length: 20 }, () => 10);
    expect(wilderRsi(rising)).toBe(100);
    expect(wilderRsi(falling)).toBe(0);
    expect(wilderRsi(flat)).toBe(50);
    expect(wilderRsi([1, 2, 3])).toBeNull();
  });

  it("bounds normalized scores", () => {
    expect(clampNormalized(130)).toBe(100);
    expect(clampNormalized(-130)).toBe(-100);
    expect(clampNormalized(Number.NaN)).toBe(0);
  });

  it("calculates z-scores and decay weighting", () => {
    expect(zScore(3, [1, 2, 3])).toBeCloseTo(1.2247, 3);
    expect(zScore(2, [2, 2, 2])).toBe(0);
    expect(
      decayWeightedAverage([
        { value: 1, ageDays: 0 },
        { value: -1, ageDays: 3 },
      ]),
    ).toBeCloseTo(1 / 3);
    expect(decayWeightedAverage([])).toBeNull();
  });
});
