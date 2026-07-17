import { describe, expect, it } from "vitest";

import {
  containsAdviceLanguage,
  explanationSchema,
  sanitizeExplanation,
} from "./explanationSchema";

describe("explanationSchema", () => {
  it("accepts a valid educational explanation", () => {
    const parsed = explanationSchema.safeParse({
      summary:
        "The ensemble leans sideways over one day because recent momentum and health inputs are mixed.",
      bullishDrivers: ["Health score above neutral"],
      bearishDrivers: ["Short-term return soft"],
      risks: ["Prototype model may misclassify regime shifts"],
      caveats: ["Yahoo feed is unofficial"],
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects advice language via sanitize", () => {
    expect(containsAdviceLanguage("You should buy now")).toBe(true);
    const cleaned = sanitizeExplanation({
      summary: "Strong buy this stock for guaranteed gains over the week ahead.",
      bullishDrivers: ["Momentum"],
      bearishDrivers: [],
      risks: ["Volatility"],
      caveats: ["Educational only"],
    });
    expect(cleaned).toBeNull();
  });
});
