import "server-only";

import { ingestAlphaVantageQuotes } from "@/lib/market/providers/alphaVantage";
import { ingestCoinGeckoQuotes } from "@/lib/market/providers/coinGecko";
import { ingestReferenceFxQuotes } from "@/lib/market/providers/frankfurter";
import { ingestTwelveDataQuotes } from "@/lib/market/providers/twelveData";
import { ingestGlobalYahooBars } from "@/lib/market/providers/yahooBars";

type ProviderResult =
  | { status: "ok"; result: { attempted: number; upserted: number; skipped?: string; failures?: number } }
  | { status: "failed"; error: string };

const PROVIDERS = [
  { key: "crypto", run: ingestCoinGeckoQuotes },
  { key: "fx", run: ingestReferenceFxQuotes },
  { key: "twelveData", run: ingestTwelveDataQuotes },
  { key: "alphaVantage", run: ingestAlphaVantageQuotes },
  { key: "yahooBars", run: () => ingestGlobalYahooBars({ lookbackDays: 90, instrumentLimit: 24 }) },
] as const;

export type GlobalIngestionSummary = {
  providers: Record<string, ProviderResult>;
  attemptedProviders: number;
  failedProviders: number;
  rowsUpserted: number;
};

export async function ingestGlobalQuotes(): Promise<GlobalIngestionSummary> {
  const settled = await Promise.allSettled(PROVIDERS.map((p) => p.run()));

  const providers: Record<string, ProviderResult> = {};
  let failedProviders = 0;
  let rowsUpserted = 0;

  settled.forEach((result, index) => {
    const key = PROVIDERS[index]?.key ?? `provider_${index}`;
    if (result.status === "fulfilled") {
      providers[key] = { status: "ok", result: result.value };
      rowsUpserted += result.value.upserted ?? 0;
    } else {
      failedProviders += 1;
      providers[key] = {
        status: "failed",
        error:
          result.reason instanceof Error
            ? result.reason.message
            : "Unknown provider failure",
      };
    }
  });

  return {
    providers,
    attemptedProviders: PROVIDERS.length,
    failedProviders,
    rowsUpserted,
  };
}
