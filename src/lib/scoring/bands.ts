import type { HealthBand } from "@prisma/client";

export function bandFromScore(score: number): HealthBand {
  if (score >= 80) return "STRONG";
  if (score >= 65) return "HEALTHY";
  if (score >= 45) return "NEUTRAL";
  if (score >= 30) return "WEAK";
  return "CRITICAL";
}

export function clampHealthScore(score: number): number {
  if (Number.isNaN(score)) return 50;
  return Math.min(100, Math.max(0, score));
}

export function bandLabel(band: HealthBand): string {
  switch (band) {
    case "STRONG":
      return "Strong health";
    case "HEALTHY":
      return "Healthy";
    case "NEUTRAL":
      return "Neutral";
    case "WEAK":
      return "Weakening health";
    case "CRITICAL":
      return "Critical health";
  }
}
