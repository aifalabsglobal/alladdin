export type CoverageTier = "HOT" | "WARM" | "COLD";

export type ProviderPolicy = {
  provider: string;
  dailyCredits: number | null;
  minuteCredits: number | null;
  displayAllowedByDefault: boolean;
  official: boolean;
  role: string;
};

export const PROVIDER_POLICIES: Record<string, ProviderPolicy> = {
  COINGECKO: {
    provider: "COINGECKO",
    dailyCredits: 333,
    minuteCredits: 100,
    displayAllowedByDefault: true,
    official: true,
    role: "Crypto quotes and historical aggregates",
  },
  FRANKFURTER: {
    provider: "FRANKFURTER",
    dailyCredits: null,
    minuteCredits: null,
    displayAllowedByDefault: true,
    official: true,
    role: "Daily central-bank reference FX; never a live FX ticker",
  },
  TWELVE_DATA: {
    provider: "TWELVE_DATA",
    dailyCredits: 800,
    minuteCredits: 8,
    displayAllowedByDefault: false,
    official: true,
    role: "Keyed prototype quotes; display rights depend on plan",
  },
  ALPHA_VANTAGE: {
    provider: "ALPHA_VANTAGE",
    dailyCredits: 25,
    minuteCredits: 5,
    displayAllowedByDefault: false,
    official: true,
    role: "Low-frequency research and fallback",
  },
  YAHOO_FINANCE: {
    provider: "YAHOO_FINANCE",
    dailyCredits: null,
    minuteCredits: null,
    displayAllowedByDefault: false,
    official: false,
    role: "Unofficial prototype overlay; never production truth",
  },
  NSE_BHAVCOPY: {
    provider: "NSE_BHAVCOPY",
    dailyCredits: null,
    minuteCredits: null,
    displayAllowedByDefault: true,
    official: true,
    role: "Official India cash-equity end-of-day observations",
  },
};

export const TIER_CADENCE_SECONDS: Record<CoverageTier, number> = {
  HOT: 60,
  WARM: 900,
  COLD: 86_400,
};

export type DegradedAction =
  | "show-last-good"
  | "show-delayed"
  | "hide-panel"
  | "block-signal";

export function degradedAction(args: {
  stale: boolean;
  synthetic: boolean;
  hasLastGood: boolean;
  panel: "quote" | "chart" | "prediction" | "order-flow";
}): DegradedAction {
  if (args.panel === "prediction" && (args.stale || args.synthetic)) {
    return "block-signal";
  }
  if (args.panel === "order-flow" && (args.stale || args.synthetic)) {
    return "hide-panel";
  }
  if (args.hasLastGood) return "show-last-good";
  return "show-delayed";
}

export function configuredTierCapacity(args: {
  twelveDataEnabled: boolean;
  coinGeckoEnabled: boolean;
}): Record<CoverageTier, number> {
  return {
    HOT: args.twelveDataEnabled ? 48 : args.coinGeckoEnabled ? 12 : 8,
    WARM: args.twelveDataEnabled ? 240 : 80,
    COLD: 1_500,
  };
}
