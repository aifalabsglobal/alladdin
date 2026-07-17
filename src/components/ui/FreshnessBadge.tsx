import { freshnessLabel, type FreshnessState } from "@/lib/live/freshness";
import { cn } from "@/lib/utils";

const styles: Record<FreshnessState, string> = {
  live: "border-positive/40 bg-positive/10 text-positive",
  delayed: "border-warning/40 bg-warning/10 text-warning",
  eod: "border-line bg-card text-muted",
  stale: "border-negative/40 bg-negative/10 text-negative",
  degraded: "border-warning/40 bg-warning/10 text-warning",
  synthetic: "border-ai/40 bg-ai/10 text-ai",
  unavailable: "border-line bg-card text-muted",
};

export function FreshnessBadge({
  state,
  asOf,
  title,
  className,
}: {
  state: FreshnessState;
  asOf?: string;
  title?: string;
  className?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
        styles[state],
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          state === "live" && "animate-pulse bg-positive",
          state === "delayed" && "animate-pulse bg-warning",
          state === "stale" && "bg-negative",
          state === "degraded" && "bg-warning",
          state === "eod" && "bg-muted",
          state === "synthetic" && "bg-ai",
          state === "unavailable" && "bg-muted",
        )}
      />
      {freshnessLabel(state)}
      {asOf ? ` · ${asOf}` : ""}
    </span>
  );
}
