import { describe, expect, it } from "vitest";

import { bandFromScore, clampHealthScore } from "@/lib/scoring/bands";

describe("bandFromScore", () => {
  it("maps score boundaries to health bands", () => {
    expect(bandFromScore(100)).toBe("STRONG");
    expect(bandFromScore(80)).toBe("STRONG");
    expect(bandFromScore(79.9)).toBe("HEALTHY");
    expect(bandFromScore(65)).toBe("HEALTHY");
    expect(bandFromScore(64.9)).toBe("NEUTRAL");
    expect(bandFromScore(45)).toBe("NEUTRAL");
    expect(bandFromScore(44.9)).toBe("WEAK");
    expect(bandFromScore(30)).toBe("WEAK");
    expect(bandFromScore(29.9)).toBe("CRITICAL");
    expect(bandFromScore(0)).toBe("CRITICAL");
  });
});

describe("clampHealthScore", () => {
  it("clamps outside the 0–100 range", () => {
    expect(clampHealthScore(-10)).toBe(0);
    expect(clampHealthScore(150)).toBe(100);
    expect(clampHealthScore(72.4)).toBe(72.4);
  });
});
