"use client";

import { useMemo } from "react";

import { useLiveSubscription } from "@/components/live/LiveMarketProvider";
import { formatInr, formatPct } from "@/lib/format";
import { cn } from "@/lib/utils";

export function LivePriceCell({
  symbol,
  eodClose,
  eodChangePct,
  compact = false,
}: {
  symbol: string;
  eodClose: number | null;
  eodChangePct: number | null;
  compact?: boolean;
}) {
  const keys = useMemo(() => [symbol], [symbol]);
  const { quotes } = useLiveSubscription(keys);
  const quote = quotes[symbol];
  const live = quote?.state === "live";
  const price = live ? quote.price : eodClose;
  const change = live ? quote.changePercent : eodChangePct;

  return (
    <div className={compact ? "" : "text-right"}>
      <p className="num text-sm font-medium text-ink">
        {price === null ? "—" : formatInr(price)}
        {live ? (
          <span
            aria-label="Live prototype quote"
            title="Yahoo unofficial live prototype quote"
            className="ml-1 text-[7px] text-positive"
          >
            ●
          </span>
        ) : null}
      </p>
      <p
        className={cn(
          "num text-xs",
          change === null
            ? "text-muted"
            : change >= 0
              ? "text-positive"
              : "text-negative",
        )}
      >
        {change === null ? "—" : formatPct(change)} · {live ? "Live" : "EOD"}
      </p>
    </div>
  );
}
