"use client";

import { useMemo, useState } from "react";

import { cn } from "@/lib/utils";

export type CandlePoint = {
  openTime: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export function CandleChart({
  candles,
  forecastBoundaryIndex,
  className,
}: {
  candles: CandlePoint[];
  /** Index after which points are forecast/placeholder. */
  forecastBoundaryIndex?: number | null;
  className?: string;
}) {
  const [showTable, setShowTable] = useState(false);

  const data = useMemo(
    () =>
      candles.map((c, i) => ({
        ...c,
        mid: (c.high + c.low) / 2,
        range: Math.max(c.high - c.low, 0.0001),
        bullish: c.close >= c.open,
        label: c.openTime.slice(5, 16).replace("T", " "),
        isForecast:
          forecastBoundaryIndex !== null &&
          forecastBoundaryIndex !== undefined &&
          i > forecastBoundaryIndex,
      })),
    [candles, forecastBoundaryIndex],
  );

  if (data.length === 0) {
    return <p className="text-sm text-muted">No candle data available.</p>;
  }

  const width = 1000;
  const height = 320;
  const priceTop = 12;
  const priceBottom = 242;
  const volumeTop = 260;
  const volumeBottom = 310;
  const minPrice = Math.min(...data.map((d) => d.low));
  const maxPrice = Math.max(...data.map((d) => d.high));
  const priceSpan = Math.max(maxPrice - minPrice, 0.0001);
  const maxVolume = Math.max(...data.map((d) => d.volume), 1);
  const step = width / data.length;
  const bodyWidth = Math.max(1.5, Math.min(step * 0.58, 9));
  const y = (price: number) =>
    priceBottom - ((price - minPrice) / priceSpan) * (priceBottom - priceTop);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="w-full overflow-hidden rounded-xl border border-line bg-card/40">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-80 w-full"
          role="img"
          aria-label={`Candlestick chart with ${data.length} observations, price range ${minPrice.toFixed(2)} to ${maxPrice.toFixed(2)}`}
          preserveAspectRatio="none"
        >
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const lineY = priceTop + ratio * (priceBottom - priceTop);
            return (
              <line
                key={ratio}
                x1="0"
                x2={width}
                y1={lineY}
                y2={lineY}
                stroke="var(--line)"
                strokeDasharray="3 5"
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
          {data.map((row, index) => {
            const x = step * index + step / 2;
            const color = row.bullish ? "var(--positive)" : "var(--negative)";
            const openY = y(row.open);
            const closeY = y(row.close);
            const bodyY = Math.min(openY, closeY);
            const bodyHeight = Math.max(Math.abs(openY - closeY), 1.5);
            const volumeHeight =
              (row.volume / maxVolume) * (volumeBottom - volumeTop);
            return (
              <g key={row.openTime}>
                <title>
                  {`${row.label}: O ${row.open.toFixed(2)}, H ${row.high.toFixed(2)}, L ${row.low.toFixed(2)}, C ${row.close.toFixed(2)}, volume ${row.volume.toLocaleString("en-IN")}`}
                </title>
                <line
                  x1={x}
                  x2={x}
                  y1={y(row.high)}
                  y2={y(row.low)}
                  stroke={color}
                  vectorEffect="non-scaling-stroke"
                />
                <rect
                  x={x - bodyWidth / 2}
                  y={bodyY}
                  width={bodyWidth}
                  height={bodyHeight}
                  fill={row.bullish ? color : "var(--card)"}
                  stroke={color}
                  vectorEffect="non-scaling-stroke"
                />
                <rect
                  x={x - bodyWidth / 2}
                  y={volumeBottom - volumeHeight}
                  width={bodyWidth}
                  height={volumeHeight}
                  fill={color}
                  opacity="0.35"
                />
              </g>
            );
          })}
          <line
            x1="0"
            x2={width}
            y1={volumeTop - 6}
            y2={volumeTop - 6}
            stroke="var(--line)"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
      <button
        type="button"
        className="text-xs text-muted underline-offset-2 hover:text-ink hover:underline"
        onClick={() => setShowTable((v) => !v)}
      >
        {showTable ? "Hide" : "Show"} accessible data table
      </button>
      {showTable ? (
        <div className="max-h-48 overflow-auto rounded-xl border border-line">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-card text-muted">
              <tr>
                <th className="px-2 py-1">Time</th>
                <th className="px-2 py-1">Open</th>
                <th className="px-2 py-1">High</th>
                <th className="px-2 py-1">Low</th>
                <th className="px-2 py-1">Close</th>
                <th className="px-2 py-1">Vol</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.openTime} className="border-t border-line">
                  <td className="num px-2 py-1">{row.label}</td>
                  <td className="num px-2 py-1">{row.open.toFixed(2)}</td>
                  <td className="num px-2 py-1">{row.high.toFixed(2)}</td>
                  <td className="num px-2 py-1">{row.low.toFixed(2)}</td>
                  <td className="num px-2 py-1">{row.close.toFixed(2)}</td>
                  <td className="num px-2 py-1">
                    {row.volume.toLocaleString("en-IN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
