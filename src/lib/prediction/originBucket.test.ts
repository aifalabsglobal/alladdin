import { describe, expect, it } from "vitest";

import { originBucketFor } from "@/lib/prediction/originBucket";

describe("originBucketFor", () => {
  it("floors M15 to 15-minute UTC buckets", () => {
    const asOf = new Date("2026-07-17T10:17:44.000Z");
    expect(originBucketFor("M15", asOf).toISOString()).toBe(
      "2026-07-17T10:15:00.000Z",
    );
  });

  it("uses calendar day for D1", () => {
    const asOf = new Date("2026-07-17T18:22:00.000Z");
    expect(originBucketFor("D1", asOf).toISOString()).toBe(
      "2026-07-17T00:00:00.000Z",
    );
  });
});
