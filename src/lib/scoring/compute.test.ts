import { describe, expect, it } from "vitest";

import {
  computeHealthScore,
  influencerWeightTotal,
  V1_INFLUENCERS,
} from "@/lib/scoring/compute";

describe("V1 influencers", () => {
  it("weights sum to 1.0", () => {
    expect(influencerWeightTotal()).toBeCloseTo(1.0, 8);
    expect(V1_INFLUENCERS).toHaveLength(11);
  });
});

describe("computeHealthScore", () => {
  it("starts at 50 with zero contributions", () => {
    const result = computeHealthScore([]);
    expect(result.score).toBe(50);
    expect(result.band).toBe("NEUTRAL");
  });

  it("applies weighted impact and keeps explainable breakdown", () => {
    const result = computeHealthScore([
      {
        key: "trend_ma",
        name: "Trend",
        category: "TECHNICAL",
        weight: 0.15,
        normalizedScore: 80,
        reasonText: "Price holding above the 50-day average: +6 pts",
      },
      {
        key: "fii_flow",
        name: "FII Flow",
        category: "FLOW",
        weight: 0.1,
        normalizedScore: -60,
        reasonText: "FII selling for several sessions: −3 pts",
      },
    ]);

    expect(result.score).toBeCloseTo(50 + 6 - 3, 1);
    expect(result.breakdown).toHaveLength(2);
    expect(result.breakdown[0]?.reasonText).toContain("pts");
    expect(result.topPositiveKey).toBe("trend_ma");
    expect(result.topNegativeKey).toBe("fii_flow");
  });

  it("clamps extreme scores", () => {
    const result = computeHealthScore([
      {
        key: "trend_ma",
        name: "Trend",
        category: "TECHNICAL",
        weight: 1,
        normalizedScore: 100,
        reasonText: "Max bullish technical stack: +50 pts",
      },
    ]);
    expect(result.score).toBe(100);
    expect(result.band).toBe("STRONG");
  });
});
