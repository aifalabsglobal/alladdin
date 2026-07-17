import "server-only";

import { ingestCoinGeckoQuotes } from "@/lib/market/providers/coinGecko";
import { ingestReferenceFxQuotes } from "@/lib/market/providers/frankfurter";

export async function ingestGlobalQuotes() {
  const [crypto, fx] = await Promise.allSettled([
    ingestCoinGeckoQuotes(),
    ingestReferenceFxQuotes(),
  ]);

  const serialize = <T>(result: PromiseSettledResult<T>) =>
    result.status === "fulfilled"
      ? { status: "ok" as const, result: result.value }
      : {
          status: "failed" as const,
          error:
            result.reason instanceof Error
              ? result.reason.message
              : "Unknown provider failure",
        };

  return {
    crypto: serialize(crypto),
    fx: serialize(fx),
    failedProviders: [crypto, fx].filter((result) => result.status === "rejected")
      .length,
  };
}
