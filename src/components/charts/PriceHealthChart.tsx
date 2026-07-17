"use client";

import { useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { cn } from "@/lib/utils";

export type PriceHealthPoint = {
  date: string;
  close: number;
  health: number;
};

const RANGES = [30, 90] as const;

export function PriceHealthChart({ data }: { data: PriceHealthPoint[] }) {
  const [range, setRange] = useState<(typeof RANGES)[number]>(90);
  const visible = data.slice(-range);
  const latest = visible[visible.length - 1];

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs text-muted">
          Price with health score overlay
          {latest
            ? ` — latest close ₹${latest.close.toFixed(2)}, health ${Math.round(latest.health)}/100`
            : ""}
        </p>
        <div className="flex gap-1" role="group" aria-label="Chart range">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              aria-pressed={range === r}
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-medium transition",
                range === r
                  ? "bg-positive/15 text-positive"
                  : "bg-card-raised text-muted hover:text-ink",
              )}
            >
              {r}D
            </button>
          ))}
        </div>
      </div>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={visible} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              stroke="var(--muted)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              minTickGap={40}
            />
            <YAxis
              yAxisId="price"
              stroke="var(--muted)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              width={56}
              domain={["auto", "auto"]}
            />
            <YAxis
              yAxisId="health"
              orientation="right"
              stroke="var(--muted)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              width={36}
              domain={[0, 100]}
            />
            <Tooltip
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--line)",
                borderRadius: 12,
                color: "var(--ink)",
                fontSize: 12,
              }}
              labelStyle={{ color: "var(--muted)" }}
              formatter={(value: number | string, name: string) => [
                name === "Price (₹)"
                  ? `₹${Number(value).toFixed(2)}`
                  : Math.round(Number(value)),
                name,
              ]}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: "var(--muted)" }} />
            <Line
              yAxisId="price"
              type="monotone"
              dataKey="close"
              name="Price (₹)"
              stroke="var(--positive)"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              yAxisId="health"
              type="monotone"
              dataKey="health"
              name="Health score"
              stroke="var(--ai)"
              strokeWidth={1.5}
              strokeDasharray="5 4"
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
