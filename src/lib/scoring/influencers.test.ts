import { describe, expect, it } from "vitest";

import {
  currencyCrudeSignal,
  epsGrowthSignal,
  fiiFlowSignal,
  indiaVixSignal,
  leverageSignal,
  newsSentimentSignal,
  rsiSignal,
  sectorMomentumSignal,
  trendMaSignal,
  valuationPeSignal,
  volumeDeliverySignal,
} from "./influencers";

const sensitivity = { usdInr: 0.8, crude: -0.2, fiiBeta: 1 };

describe("influencer normalizers", () => {
  const assertBounded = (score: number) => {
    expect(score).toBeGreaterThanOrEqual(-100);
    expect(score).toBeLessThanOrEqual(100);
  };

  it("computes technical signals and marks short histories", () => {
    const closes = Array.from({ length: 220 }, (_, i) => 100 + i * 0.5);
    const trend = trendMaSignal(closes);
    const rsi = rsiSignal(closes);
    const volume = volumeDeliverySignal(
      Array.from({ length: 21 }, (_, i) => ({
        volume: i === 20 ? 2_000_000 : 1_000_000,
        deliveryPct: 55,
      })),
    );
    assertBounded(trend.normalizedScore);
    assertBounded(rsi.normalizedScore);
    assertBounded(volume.normalizedScore);
    expect(trend.dataQuality).toBe(1);
    expect(volume.dataQuality).toBe(1);
  });

  it("computes fundamental signals", () => {
    const eps = epsGrowthSignal(20, [5, 10, 15, 20, 25]);
    const pe = valuationPeSignal(15, [15, 18, 20, 22, 25]);
    const leverage = leverageSignal(0.3, [0.3, 0.5, 0.7, 0.8, 1]);
    [eps, pe, leverage].forEach((s) => assertBounded(s.normalizedScore));
    expect(pe.normalizedScore).toBeGreaterThan(0);
  });

  it("computes sentiment, flow and macro signals", () => {
    const news = newsSentimentSignal([
      { sentiment: 0.8, ageDays: 0 },
      { sentiment: 0.2, ageDays: 2 },
    ]);
    const fii = fiiFlowSignal([-1000, -800, -400], sensitivity);
    const momentum = sectorMomentumSignal(
      [100, 101, 104, 106, 110],
      [100, 100.5, 101, 102, 103],
      false,
    );
    const vix = indiaVixSignal(22);
    const macro = currencyCrudeSignal([1], [2], sensitivity);
    [news, fii, momentum, vix, macro].forEach((s) =>
      assertBounded(s.normalizedScore),
    );
    expect(news.normalizedScore).toBeGreaterThan(0);
    expect(fii.normalizedScore).toBeLessThan(0);
    expect(vix.normalizedScore).toBeLessThan(0);
  });

  it("uses explicit neutral, low-quality fallbacks", () => {
    const signals = [
      trendMaSignal([]),
      rsiSignal([]),
      epsGrowthSignal(null, []),
      valuationPeSignal(null, []),
      leverageSignal(null, []),
      newsSentimentSignal([]),
      fiiFlowSignal([], sensitivity),
      sectorMomentumSignal([], [], true),
      indiaVixSignal(null),
      currencyCrudeSignal([], [], sensitivity),
    ];
    for (const signal of signals) {
      expect(signal.normalizedScore).toBe(0);
      expect(signal.dataQuality).toBe(0);
      expect(signal.isFallback).toBe(true);
      expect(signal.reasonText).toContain("neutral");
    }
  });
});
