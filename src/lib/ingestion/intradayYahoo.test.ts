import { describe, expect, it } from "vitest";

import { normalizeYahooCandles } from "./candles";

describe("normalizeYahooCandles", () => {
  it("normalizes complete 15m candles and marks in-progress bar incomplete", () => {
    const open = new Date("2026-07-17T03:45:00.000Z");
    const now = new Date("2026-07-17T04:00:30.000Z");
    const candles = normalizeYahooCandles(
      [
        {
          date: open,
          open: 100,
          high: 102,
          low: 99,
          close: 101,
          volume: 1000,
        },
        {
          date: new Date("2026-07-17T04:00:00.000Z"),
          open: 101,
          high: 103,
          low: 100.5,
          close: 102.5,
          volume: 500,
        },
      ],
      "15m",
      now,
    );

    expect(candles).toHaveLength(2);
    expect(candles[0]!.complete).toBe(true);
    expect(candles[0]!.closeTime.toISOString()).toBe("2026-07-17T04:00:00.000Z");
    expect(candles[1]!.complete).toBe(false);
    expect(candles[1]!.close).toBe(102.5);
  });

  it("skips bars with null OHLC", () => {
    const candles = normalizeYahooCandles(
      [
        {
          date: new Date("2026-07-17T03:45:00.000Z"),
          open: null,
          high: 1,
          low: 1,
          close: 1,
          volume: 1,
        },
      ],
      "15m",
      new Date("2026-07-17T05:00:00.000Z"),
    );
    expect(candles).toHaveLength(0);
  });
});
