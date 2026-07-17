import { describe, expect, it } from "vitest";

import {
  dayChangePct,
  formatCrore,
  formatMarketCap,
  formatPct,
} from "./format";

describe("formatPct", () => {
  it("signs positive values and keeps negatives", () => {
    expect(formatPct(1.234)).toBe("+1.23%");
    expect(formatPct(-2.5)).toBe("-2.50%");
    expect(formatPct(5, false)).toBe("5.00%");
  });
});

describe("formatCrore", () => {
  it("formats signed crore values", () => {
    expect(formatCrore(1234.5)).toBe("+₹1235 Cr");
    expect(formatCrore(-800)).toBe("-₹800 Cr");
  });
});

describe("formatMarketCap", () => {
  it("handles null as em dash", () => {
    expect(formatMarketCap(null)).toBe("—");
  });
});

describe("dayChangePct", () => {
  it("computes percentage change", () => {
    expect(dayChangePct(110, 100)).toBeCloseTo(10);
    expect(dayChangePct(90, 100)).toBeCloseTo(-10);
  });

  it("guards divide-by-zero", () => {
    expect(dayChangePct(100, 0)).toBe(0);
  });
});
