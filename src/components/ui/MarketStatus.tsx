"use client";

import { FreshnessBadge } from "@/components/ui/FreshnessBadge";
import { useLiveMarket } from "@/components/live/LiveMarketProvider";
import { cn } from "@/lib/utils";

export function MarketStatus({ className }: { className?: string }) {
  const { connected, sessionOpen, globalState, lastMessageAt } = useLiveMarket();

  const asOf =
    lastMessageAt === null
      ? undefined
      : new Date(lastMessageAt).toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 text-xs text-muted",
        className,
      )}
    >
      <span
        className={cn(
          "rounded-full border px-2.5 py-1 font-medium",
          sessionOpen
            ? "border-positive/40 bg-positive/10 text-positive"
            : "border-line bg-card text-muted",
        )}
      >
        {sessionOpen ? "NSE session open" : "NSE session closed"}
      </span>
      <FreshnessBadge
        state={globalState}
        asOf={asOf}
        title={
          connected
            ? "Yahoo prototype stream connected"
            : "Stream disconnected — showing EOD fallback where available"
        }
      />
      <span className="hidden sm:inline text-[11px]">
        Yahoo prototype feed · not licensed redistribution
      </span>
    </div>
  );
}
