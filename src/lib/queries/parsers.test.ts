import { describe, expect, it } from "vitest";

import { parseBreakdown, parseModelMetrics } from "./parsers";

describe("parseBreakdown", () => {
  it("parses a valid breakdown array", () => {
    const items = parseBreakdown([
      {
        key: "trend_ma",
        name: "Trend",
        category: "TECHNICAL",
        weight: 0.15,
        normalizedScore: 40,
        impactPoints: 3,
        reasonText: "Price above 50DMA: +3.0 pts",
      },
    ]);
    expect(items).toHaveLength(1);
    expect(items[0]?.key).toBe("trend_ma");
  });

  it("returns empty array for malformed JSON", () => {
    expect(parseBreakdown(null)).toEqual([]);
    expect(parseBreakdown("nonsense")).toEqual([]);
    expect(parseBreakdown([{ key: 1 }])).toEqual([]);
    expect(parseBreakdown({ not: "an array" })).toEqual([]);
  });
});

describe("parseModelMetrics", () => {
  it("parses seeded metrics shape", () => {
    const metrics = parseModelMetrics({
      accuracy: { D1: 0.52, W1: 0.54, M1: 0.51 },
      note: "synthetic",
    });
    expect(metrics?.accuracy?.D1).toBe(0.52);
  });

  it("returns null for malformed input", () => {
    expect(parseModelMetrics("bad")).toBeNull();
    expect(parseModelMetrics({ accuracy: "high" })).toBeNull();
  });
});
