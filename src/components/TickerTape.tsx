"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { useLiveSubscription } from "@/components/live/LiveMarketProvider";
import { FreshnessBadge } from "@/components/ui/FreshnessBadge";
import { cn } from "@/lib/utils";

type TickerItem = {
  key: string;
  label: string;
  href: string | null;
  value: number;
  changePct: number | null;
  kind: "index" | "stock";
};

type TickerResponse = {
  asOf: string | null;
  items: TickerItem[];
};

const POLL_MS = 60_000;

function formatValue(item: TickerItem): string {
  const digits = item.kind === "index" ? 0 : 2;
  return item.value.toLocaleString("en-IN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function TickerCell({
  item,
  isLive,
}: {
  item: TickerItem;
  isLive: boolean;
}) {
  const change = item.changePct;
  const tone =
    change === null
      ? "text-muted"
      : change > 0
        ? "text-positive"
        : change < 0
          ? "text-negative"
          : "text-muted";
  const arrow = change === null ? "" : change > 0 ? "▲" : change < 0 ? "▼" : "◆";

  const body = (
    <span className="inline-flex items-baseline gap-1.5 whitespace-nowrap px-4">
      <span className="text-xs font-semibold text-ink">
        {item.label}
        {isLive ? (
          <span aria-hidden className="ml-1 align-middle text-[7px] text-positive">
            ●
          </span>
        ) : null}
      </span>
      <span className="num text-xs text-muted">{formatValue(item)}</span>
      <span className={cn("num text-xs font-medium", tone)}>
        {arrow}
        {change === null ? "—" : `${Math.abs(change).toFixed(2)}%`}
      </span>
    </span>
  );

  if (item.href) {
    return (
      <Link href={item.href} className="transition hover:brightness-125">
        {body}
      </Link>
    );
  }
  return body;
}

export function TickerTape() {
  const [baseItems, setBaseItems] = useState<TickerItem[]>([]);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    async function load() {
      try {
        const res = await fetch("/api/ticker", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as TickerResponse;
        if (!mounted.current) return;
        setBaseItems(data.items);
        setError(null);
      } catch {
        if (mounted.current) setError("EOD tape unavailable");
      }
    }

    void load();
    const id = setInterval(load, POLL_MS);
    return () => {
      mounted.current = false;
      clearInterval(id);
    };
  }, []);

  const keys = useMemo(() => baseItems.map((i) => i.key), [baseItems]);
  const { quotes, globalState } = useLiveSubscription(keys);

  const { items, liveCount } = useMemo(() => {
    let count = 0;
    const merged = baseItems.map((item) => {
      const tick = quotes[item.key];
      if (!tick || tick.state === "stale" || tick.state === "unavailable") {
        return { item, isLive: false };
      }
      count += 1;
      return {
        item: {
          ...item,
          value: tick.price,
          changePct: tick.changePercent ?? item.changePct,
        },
        isLive: tick.state === "live",
      };
    });
    return { items: merged, liveCount: count };
  }, [baseItems, quotes]);

  if (items.length === 0) {
    return (
      <div className="flex h-9 items-center gap-3 border-b border-line bg-surface px-4 text-xs text-muted">
        <FreshnessBadge state={error ? "unavailable" : "delayed"} />
        {error ?? "Loading market tape…"}
      </div>
    );
  }

  const status =
    liveCount > 0 && globalState === "live"
      ? "live"
      : globalState === "delayed"
        ? "delayed"
        : globalState === "stale"
          ? "stale"
          : "eod";

  return (
    <div
      className="group relative flex h-9 items-center overflow-hidden border-b border-line bg-surface"
      role="region"
      aria-label="Market ticker"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <span className="z-10 flex h-full shrink-0 items-center gap-2 border-r border-line bg-card px-3">
        <FreshnessBadge state={status} />
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          className="rounded border border-line px-1.5 py-0.5 text-[10px] text-muted hover:text-ink"
          aria-pressed={paused}
        >
          {paused ? "Play" : "Pause"}
        </button>
      </span>

      <div
        className={cn(
          "flex min-w-full shrink-0 items-center will-change-transform",
          "animate-ticker",
          paused && "[animation-play-state:paused]",
        )}
      >
        {items.map(({ item, isLive }) => (
          <TickerCell key={`a-${item.key}`} item={item} isLive={isLive} />
        ))}
      </div>
      <div
        aria-hidden
        className={cn(
          "flex min-w-full shrink-0 items-center will-change-transform",
          "animate-ticker",
          paused && "[animation-play-state:paused]",
        )}
      >
        {items.map(({ item, isLive }) => (
          <TickerCell key={`b-${item.key}`} item={item} isLive={isLive} />
        ))}
      </div>

      <div className="pointer-events-none absolute right-0 top-0 h-full w-12 bg-gradient-to-l from-surface to-transparent" />
    </div>
  );
}
