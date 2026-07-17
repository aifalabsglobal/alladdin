import { describe, expect, it } from "vitest";

import { resolveNseTargetAt } from "./types";

describe("resolveNseTargetAt", () => {
  it("resolves EOD to the same NSE close when still open", () => {
    const target = resolveNseTargetAt("EOD", new Date("2026-07-17T06:00:00Z"));
    expect(target.toISOString()).toBe("2026-07-17T10:00:00.000Z");
  });

  it("rolls EOD after Friday close to Monday", () => {
    const target = resolveNseTargetAt("EOD", new Date("2026-07-17T11:00:00Z"));
    expect(target.toISOString()).toBe("2026-07-20T10:00:00.000Z");
  });

  it("uses elapsed time only for intraday horizons", () => {
    const asOf = new Date("2026-07-17T06:00:00Z");
    expect(resolveNseTargetAt("M15", asOf).getTime() - asOf.getTime()).toBe(
      15 * 60_000,
    );
  });
});
