import { describe, expect, it } from "vitest";

import { SEED_SECTORS, SEED_STOCKS, createRng, hashString } from "./seed-data";

describe("seed data catalog", () => {
  it("covers ~50 stocks across 8 sectors", () => {
    expect(SEED_SECTORS).toHaveLength(8);
    expect(SEED_STOCKS.length).toBeGreaterThanOrEqual(48);
    expect(SEED_STOCKS.length).toBeLessThanOrEqual(55);

    const sectorsUsed = new Set(SEED_STOCKS.map((s) => s.sector));
    for (const sector of SEED_SECTORS) {
      expect(sectorsUsed.has(sector)).toBe(true);
    }
  });

  it("has unique symbols", () => {
    const symbols = SEED_STOCKS.map((s) => s.symbol);
    expect(new Set(symbols).size).toBe(symbols.length);
  });
});

describe("deterministic RNG", () => {
  it("returns the same sequence for the same seed", () => {
    const a = createRng(hashString("alladin"));
    const b = createRng(hashString("alladin"));
    const seqA = [a(), a(), a(), a(), a()];
    const seqB = [b(), b(), b(), b(), b()];
    expect(seqA).toEqual(seqB);
  });

  it("differs across seeds", () => {
    const a = createRng(1);
    const b = createRng(2);
    expect(a()).not.toEqual(b());
  });
});
