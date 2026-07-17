"use client";

import { useMemo } from "react";

import { useLiveSubscription } from "@/components/live/LiveMarketProvider";
import { FreshnessBadge } from "@/components/ui/FreshnessBadge";
import { formatInr, formatPct } from "@/lib/format";
import { cn } from "@/lib/utils";

export function LiveStockSummary({
  symbol,
  eodClose,
  eodChangePct,
}: {
  symbol: string;
  eodClose: number | null;
  eodChangePct: number | null;
}) {
  const keys = useMemo(() => [symbol], [symbol]);
  const { quotes } = useLiveSubscription(keys);
  const quote = quotes[symbol];
  const usable = quote && quote.state === "live";
  const price = usable ? quote.price : eodClose;
  const change = usable ? quote.changePercent : eodChangePct;
  const observedAt =
    usable && quote.timeMs
      ? new Date(quote.timeMs).toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      : undefined;

  return (
    <div aria-live="polite">
      <div className="flex items-center gap-2">
        <p className="text-xs text-muted">{usable ? "Live quote" : "Last close"}</p>
        <FreshnessBadge state={usable ? "live" : "eod"} asOf={observedAt} />
      </div>
      <p className="num mt-2 text-3xl font-semibold text-ink">
        {price === null ? "—" : formatInr(price)}
      </p>
      {change !== null ? (
        <p
          className={cn(
            "num mt-1 text-sm font-medium",
            change >= 0 ? "text-positive" : "text-negative",
          )}
        >
          {formatPct(change)} {usable ? "intraday" : "EOD"}
        </p>
      ) : null}
      <p className="mt-2 text-[11px] leading-relaxed text-muted">
        {usable
          ? "Yahoo unofficial prototype stream; not licensed exchange redistribution."
          : "Official/durable EOD fallback. Live stream is closed, stale, or unavailable."}
      </p>
    </div>
  );
}
