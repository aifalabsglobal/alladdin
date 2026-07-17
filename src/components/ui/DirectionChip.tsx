import type { Direction } from "@prisma/client";

import { cn } from "@/lib/utils";

const config: Record<Direction, { label: string; className: string }> = {
  UP: { label: "Bullish signals", className: "bg-positive/12 text-positive" },
  DOWN: { label: "Bearish signals", className: "bg-negative/12 text-negative" },
  SIDEWAYS: { label: "Sideways", className: "bg-warning/12 text-warning" },
};

export function DirectionChip({
  direction,
  confidence,
  className,
}: {
  direction: Direction;
  confidence?: number;
  className?: string;
}) {
  const c = config[direction];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        c.className,
        className,
      )}
    >
      {c.label}
      {typeof confidence === "number" ? (
        <span className="num">{Math.round(confidence * 100)}%</span>
      ) : null}
    </span>
  );
}
