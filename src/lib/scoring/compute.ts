import { bandFromScore, clampHealthScore } from "@/lib/scoring/bands";

export type InfluencerContribution = {
  key: string;
  name: string;
  category: string;
  weight: number;
  normalizedScore: number;
  impactPoints: number;
  reasonText: string;
};

export type HealthScoreResult = {
  score: number;
  band: ReturnType<typeof bandFromScore>;
  breakdown: InfluencerContribution[];
  topPositiveKey: string | null;
  topNegativeKey: string | null;
};

/**
 * HealthScore = 50 + Σ(normalizedScore_i × weight_i), clamped to 0–100.
 * normalizedScore is on -100..+100; impactPoints = (normalizedScore × weight) / 2
 * so that a full +100 at weight 1.0 contributes +50 pts to the base-50 score.
 */
export function computeHealthScore(
  contributions: Omit<InfluencerContribution, "impactPoints">[],
): HealthScoreResult {
  const breakdown: InfluencerContribution[] = contributions.map((c) => {
    const impactPoints = (c.normalizedScore * c.weight) / 2;
    return { ...c, impactPoints: round2(impactPoints) };
  });

  const raw = 50 + breakdown.reduce((sum, c) => sum + c.impactPoints, 0);
  const score = round2(clampHealthScore(raw));

  const sorted = [...breakdown].sort((a, b) => b.impactPoints - a.impactPoints);
  const topPositive = sorted.find((c) => c.impactPoints > 0) ?? null;
  const topNegative = [...sorted].reverse().find((c) => c.impactPoints < 0) ?? null;

  return {
    score,
    band: bandFromScore(score),
    breakdown,
    topPositiveKey: topPositive?.key ?? null,
    topNegativeKey: topNegative?.key ?? null,
  };
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export const V1_INFLUENCERS = [
  {
    key: "trend_ma",
    name: "Trend (Moving Averages)",
    category: "TECHNICAL" as const,
    scope: "STOCK" as const,
    defaultWeight: 0.15,
    description:
      "Compares price to the 50-day and 200-day moving averages to gauge trend strength.",
  },
  {
    key: "rsi_14",
    name: "RSI (14)",
    category: "TECHNICAL" as const,
    scope: "STOCK" as const,
    defaultWeight: 0.1,
    description:
      "Relative Strength Index: oversold can mean improving health via mean reversion; overbought can mean weakening health.",
  },
  {
    key: "volume_delivery",
    name: "Volume & Delivery",
    category: "TECHNICAL" as const,
    scope: "STOCK" as const,
    defaultWeight: 0.1,
    description:
      "Higher volume with strong delivery percentage signals conviction behind the move.",
  },
  {
    key: "eps_growth",
    name: "EPS Growth",
    category: "FUNDAMENTAL" as const,
    scope: "STOCK" as const,
    defaultWeight: 0.12,
    description: "Year-over-year EPS growth compared with the sector median.",
  },
  {
    key: "valuation_pe",
    name: "Valuation (P/E)",
    category: "FUNDAMENTAL" as const,
    scope: "STOCK" as const,
    defaultWeight: 0.08,
    description: "Price-to-earnings versus the sector median P/E.",
  },
  {
    key: "leverage",
    name: "Leverage",
    category: "FUNDAMENTAL" as const,
    scope: "STOCK" as const,
    defaultWeight: 0.05,
    description: "Debt-to-equity relative to the sector norm; higher leverage pressures health.",
  },
  {
    key: "news_sentiment",
    name: "News Sentiment",
    category: "SENTIMENT" as const,
    scope: "STOCK" as const,
    defaultWeight: 0.12,
    description: "Seven-day decay-weighted average of recent news sentiment.",
  },
  {
    key: "fii_flow",
    name: "FII Flow",
    category: "FLOW" as const,
    scope: "MARKET" as const,
    defaultWeight: 0.1,
    description: "Five-day foreign institutional investor net flow trend applied with sector sensitivity.",
  },
  {
    key: "sector_momentum",
    name: "Sector Momentum",
    category: "MACRO" as const,
    scope: "SECTOR" as const,
    defaultWeight: 0.08,
    description: "Sector 20-day return versus Nifty performance.",
  },
  {
    key: "india_vix",
    name: "India VIX",
    category: "MACRO" as const,
    scope: "MARKET" as const,
    defaultWeight: 0.05,
    description: "Elevated India VIX applies a market-wide fear penalty.",
  },
  {
    key: "usd_inr_crude",
    name: "USD/INR & Crude",
    category: "MACRO" as const,
    scope: "MARKET" as const,
    defaultWeight: 0.05,
    description:
      "Currency and crude oil moves applied via sector sensitivity (e.g. IT benefits from weaker INR).",
  },
] as const;

export function influencerWeightTotal(): number {
  return V1_INFLUENCERS.reduce((sum, i) => sum + i.defaultWeight, 0);
}
