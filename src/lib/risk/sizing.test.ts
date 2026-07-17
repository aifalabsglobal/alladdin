import { describe, expect, it } from "vitest";

import { simulatePaperSizing } from "./sizing";

describe("simulatePaperSizing", () => {
  it("caps loss at the configured paper risk budget", () => {
    const result = simulatePaperSizing({
      accountEquity: 100_000,
      maxRiskPct: 0.5,
      entryPrice: 100,
      stopDistancePct: 2,
    });
    expect(result.units).toBe(250);
    expect(result.maxLoss).toBe(500);
  });

  it("reduces size to zero for non-positive Kelly edge", () => {
    const result = simulatePaperSizing({
      accountEquity: 100_000,
      maxRiskPct: 0.5,
      entryPrice: 100,
      stopDistancePct: 2,
      winProbability: 0.4,
      payoffRatio: 1,
    });
    expect(result.units).toBe(0);
    expect(result.warnings[0]).toContain("No positive Kelly edge");
  });
});
