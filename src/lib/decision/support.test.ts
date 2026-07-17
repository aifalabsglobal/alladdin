import { describe, expect, it } from "vitest";

import {
  assessDecisionSupport,
  brierScore,
  conformalInterval,
  modelDisagreement,
} from "./support";

describe("assessDecisionSupport", () => {
  it("abstains on delayed short-horizon uncalibrated output", () => {
    const result = assessDecisionSupport({
      direction: "UP",
      horizon: "M15",
      confidence: 0.8,
      calibrated: false,
      expectedReturn: 0.002,
      freshness: "delayed",
      dataCompleteness: 1,
      sampleCount: 500,
      transactionCostRate: 0.001,
    });
    expect(result.state).toBe("STAND_ASIDE");
    expect(result.reasons).toContain("DELAYED_SHORT_HORIZON");
    expect(result.reasons).toContain("UNCALIBRATED");
  });

  it("permits research-only output when all gates pass", () => {
    const result = assessDecisionSupport({
      direction: "UP",
      horizon: "D1",
      confidence: 0.7,
      calibrated: true,
      expectedReturn: 0.012,
      freshness: "eod",
      dataCompleteness: 0.95,
      sampleCount: 600,
      transactionCostRate: 0.001,
      modelProbabilities: [0.68, 0.7, 0.72],
    });
    expect(result.state).toBe("RESEARCH_ONLY");
    expect(result.afterCostEv).toBeCloseTo(0.011);
    expect(result.reasons).toEqual([]);
  });

  it("treats model disagreement as a reason to abstain", () => {
    expect(modelDisagreement([0.2, 0.65, 0.4])).toBeCloseTo(0.45);
  });
});

describe("validation metrics", () => {
  it("calculates multiclass Brier score", () => {
    expect(brierScore([[0.8, 0.1, 0.1]], [0])).toBeCloseTo(0.06);
  });

  it("requires enough residuals for a conformal interval", () => {
    expect(conformalInterval({ estimate: 0, residuals: [0.1, 0.2] })).toBeNull();
    const residuals = Array.from({ length: 100 }, (_, index) => index / 1000);
    const interval = conformalInterval({ estimate: 0.01, residuals });
    expect(interval).not.toBeNull();
    expect(interval!.low).toBeLessThan(0.01);
    expect(interval!.high).toBeGreaterThan(0.01);
  });
});
