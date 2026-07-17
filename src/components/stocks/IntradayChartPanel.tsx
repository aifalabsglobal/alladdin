"use client";

import { useEffect, useState } from "react";

import {
  CandleChart,
  type CandlePoint,
} from "@/components/charts/CandleChart";
import { FreshnessBadge } from "@/components/ui/FreshnessBadge";
import { cn } from "@/lib/utils";

type ApiResponse = {
  symbol: string;
  interval: string;
  source: "db" | "yahoo_live" | "eod_fallback";
  provenance: string;
  error: string | null;
  candles: CandlePoint[];
};

export function IntradayChartPanel({ symbol }: { symbol: string }) {
  const [interval, setIntervalValue] = useState<"M15" | "H1">("M15");
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(
      `/api/market/intraday?symbol=${encodeURIComponent(symbol)}&interval=${interval}&limit=160`,
      { cache: "no-store" },
    )
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as ApiResponse;
      })
      .then((next) => {
        if (!cancelled) setData(next);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [symbol, interval]);

  const state =
    data?.source === "yahoo_live"
      ? "delayed"
      : data?.source === "db"
        ? "delayed"
        : data?.source === "eod_fallback"
          ? "eod"
          : "unavailable";

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 rounded-xl border border-line bg-card p-1">
          {(["M15", "H1"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setIntervalValue(value)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium",
                interval === value
                  ? "bg-positive/15 text-positive"
                  : "text-muted hover:text-ink",
              )}
            >
              {value === "M15" ? "15 minute" : "1 hour"}
            </button>
          ))}
        </div>
        <FreshnessBadge
          state={state}
          title={data?.provenance ?? "Intraday source unavailable"}
        />
      </div>
      {loading ? (
        <div
          className="h-72 animate-pulse rounded-xl bg-card-raised"
          aria-label="Loading intraday chart"
        />
      ) : data && data.candles.length > 0 ? (
        <>
          <CandleChart candles={data.candles} />
          <p className="mt-2 text-[11px] text-muted">
            {data.provenance}
            {data.error ? ` · fallback reason: ${data.error}` : ""}
          </p>
        </>
      ) : (
        <p className="text-sm text-muted">
          Intraday history unavailable. EOD analytics remain available.
        </p>
      )}
    </div>
  );
}
