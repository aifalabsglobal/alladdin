"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

function colorFor(score: number): string {
  if (score >= 80) return "var(--positive)";
  if (score >= 65) return "var(--positive-soft)";
  if (score >= 45) return "var(--warning)";
  if (score >= 30) return "#ff8a65";
  return "var(--negative)";
}

export function ScoreDonut({
  score,
  size = 120,
  label,
}: {
  score: number;
  size?: number;
  label: string;
}) {
  const data = [
    { name: "score", value: score },
    { name: "rest", value: 100 - score },
  ];

  return (
    <div
      className="relative"
      style={{ width: size, height: size }}
      role="img"
      aria-label={label}
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            innerRadius="72%"
            outerRadius="100%"
            startAngle={90}
            endAngle={-270}
            stroke="none"
            isAnimationActive={false}
          >
            <Cell fill={colorFor(score)} />
            <Cell fill="var(--card-raised)" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="num text-2xl font-semibold text-ink">
          {Math.round(score)}
        </span>
        <span className="text-[10px] uppercase tracking-wide text-muted">
          / 100
        </span>
      </div>
    </div>
  );
}
