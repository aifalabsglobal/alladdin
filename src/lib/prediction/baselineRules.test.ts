import { describe, expect, it } from "vitest";

import { baselineRulesHandler } from "./baselineRules";
import { buildPredictionFeatures, featureCompleteness } from "./features";
import { ensembleHandler } from "./ensemble";
import { directionFromReturn } from "./types";

describe("buildPredictionFeatures", () => {
  it("builds leakage-safe features from closes only", () => {
    const closes = Array.from({ length: 40 }, (_, i) => 100 + i * 0.5);
    const features = buildPredictionFeatures({ closes, healthScore: 62 });
    expect(featureCompleteness(features)).toBeGreaterThan(0.5);
    expect(features.ret_1).not.toBeNull();
    expect(features.rsi_14).not.toBeNull();
    expect(features.health_score).toBeCloseTo(0.62, 5);
  });

  it("returns nulls when history is thin", () => {
    const features = buildPredictionFeatures({ closes: [100, 101] });
    expect(features.ret_20).toBeNull();
    expect(features.rsi_14).toBeNull();
    expect(featureCompleteness(features)).toBeLessThan(0.45);
  });
});

describe("baselineRulesHandler", () => {
  it("returns bounded probabilities that sum to ~1", () => {
    const closes = Array.from({ length: 40 }, (_, i) => 100 + Math.sin(i) * 2 + i * 0.2);
    const features = buildPredictionFeatures({
      closes,
      healthScore: 70,
      indiaVix: 14,
      newsSentiment: 0.2,
    });
    const pred = baselineRulesHandler.predict({
      horizon: "D1",
      features,
      asOf: new Date("2026-07-17T10:00:00.000Z"),
      closes,
    });
    const sum = pred.probUp + pred.probSideways + pred.probDown;
    expect(sum).toBeCloseTo(1, 3);
    expect(pred.confidence).toBeGreaterThan(0);
    expect(pred.confidence).toBeLessThanOrEqual(1);
    expect(pred.insufficientData).toBe(false);
  });

  it("marks insufficient data and forces SIDEWAYS on thin history", () => {
    const closes = [100, 100.5];
    const features = buildPredictionFeatures({ closes });
    const pred = baselineRulesHandler.predict({
      horizon: "M15",
      features,
      asOf: new Date(),
      closes,
    });
    expect(pred.insufficientData).toBe(true);
    expect(pred.direction).toBe("SIDEWAYS");
    expect(pred.confidence).toBeLessThanOrEqual(0.34);
  });
});

describe("ensembleHandler", () => {
  it("produces a prediction for each supported horizon", () => {
    const closes = Array.from({ length: 50 }, (_, i) => 200 - i * 0.3);
    const features = buildPredictionFeatures({ closes, healthScore: 40 });
    for (const horizon of ensembleHandler.supports) {
      const pred = ensembleHandler.predict({
        horizon,
        features,
        asOf: new Date(),
        closes,
      });
      expect(["UP", "DOWN", "SIDEWAYS"]).toContain(pred.direction);
      expect(pred.targetAt.getTime()).toBeGreaterThan(Date.now() - 1000);
    }
  });
});

describe("directionFromReturn", () => {
  it("classifies using horizon thresholds", () => {
    expect(directionFromReturn(0.01, "D1")).toBe("UP");
    expect(directionFromReturn(-0.01, "D1")).toBe("DOWN");
    expect(directionFromReturn(0.001, "D1")).toBe("SIDEWAYS");
  });
});
