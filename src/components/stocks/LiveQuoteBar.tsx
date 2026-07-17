"use client";

import { useLiveSubscription } from "@/components/live/LiveMarketProvider";
import { FreshnessBadge } from "@/components/ui/FreshnessBadge";
import { formatInr, formatPct } from "@/lib/format";
import { cn } from "@/lib/utils";

export function LiveQuoteBar({
  symbol,
  eodClose,
  eodChangePct,
}: {
  symbol: string;
  eodClose: number | null;
  eodChangePct: number | null;
}) {
  const { quotes } = useLiveSubscription([symbol]);
  const live = quotes[symbol];
  const price = live?.price ?? eodClose;
  const change = live?.changePercent ?? eodChangePct;
  const state = live?.state ?? "eod";

  return (
    <div className="sticky top-[4.5rem] z-20 -mx-4 mb-4 border-b border-line bg-canvas/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 md:top-0">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs text-muted">{symbol} last price</p>
          <p className="num text-2xl font-semibold text-ink">
            {price === null ? "—" : formatInr(price)}
          </p>
          {change !== null ? (
            <p
              className={cn(
                "num text-sm font-medium",
                change >= 0 ? "text-positive" : "text-negative",
              )}
            >
              {formatPct(change)}
            </p>
          ) : null}
        </div>
        <FreshnessBadge
          state={state}
          title="Yahoo prototype stream overlays EOD when live ticks arrive"
        />
      </div>
    </div>
  );
}
