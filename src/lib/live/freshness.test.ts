import { describe, expect, it } from "vitest";

import {
  classifyTickFreshness,
  freshnessLabel,
  isNseCashSession,
  STALE_TICK_MS,
} from "./freshness";

describe("classifyTickFreshness", () => {
  it("returns unavailable when disconnected with no ticks", () => {
    expect(
      classifyTickFreshness({ connected: false, tickTimeMs: null }),
    ).toBe("unavailable");
  });

  it("returns live for a fresh connected tick", () => {
    const now = 1_000_000;
    expect(
      classifyTickFreshness({
        connected: true,
        tickTimeMs: now - 1_000,
        nowMs: now,
      }),
    ).toBe("live");
  });

  it("returns stale when tick age exceeds threshold", () => {
    const now = 1_000_000;
    expect(
      classifyTickFreshness({
        connected: true,
        tickTimeMs: now - STALE_TICK_MS - 1,
        nowMs: now,
      }),
    ).toBe("stale");
  });

  it("returns delayed when connected but waiting for first tick", () => {
    expect(
      classifyTickFreshness({ connected: true, tickTimeMs: null }),
    ).toBe("delayed");
  });
});

describe("freshnessLabel", () => {
  it("labels all states", () => {
    expect(freshnessLabel("live")).toBe("Live");
    expect(freshnessLabel("eod")).toBe("EOD");
    expect(freshnessLabel("synthetic")).toBe("Synthetic");
  });
});

describe("isNseCashSession", () => {
  it("detects a weekday mid-session IST moment", () => {
    // 2026-07-17 10:00 IST = 04:30 UTC Friday
    expect(isNseCashSession(new Date("2026-07-17T04:30:00.000Z"))).toBe(true);
  });

  it("returns false on weekend", () => {
    expect(isNseCashSession(new Date("2026-07-18T04:30:00.000Z"))).toBe(false);
  });
});
