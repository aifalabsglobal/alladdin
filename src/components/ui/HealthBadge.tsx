import type { HealthBand } from "@prisma/client";

import { bandLabel } from "@/lib/scoring/bands";
import { cn } from "@/lib/utils";

const bandStyles: Record<HealthBand, string> = {
  STRONG: "bg-positive/15 text-positive",
  HEALTHY: "bg-positive/10 text-positive-soft",
  NEUTRAL: "bg-warning/10 text-warning",
  WEAK: "bg-negative/10 text-negative-soft",
  CRITICAL: "bg-negative/15 text-negative",
};

export function HealthBadge({
  score,
  band,
  className,
}: {
  score?: number | null;
  band: HealthBand;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        bandStyles[band],
        className,
      )}
    >
      {typeof score === "number" ? (
        <span className="num">{Math.round(score)}</span>
      ) : null}
      {bandLabel(band)}
    </span>
  );
}
