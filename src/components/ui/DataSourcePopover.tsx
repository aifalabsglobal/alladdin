import { FreshnessBadge } from "@/components/ui/FreshnessBadge";
import type { FreshnessState } from "@/lib/live/freshness";
import { cn } from "@/lib/utils";

export function DataSourcePopover({
  state,
  source,
  observedAt,
  detail,
  className,
}: {
  state: FreshnessState;
  source: string;
  observedAt?: string | null;
  detail?: string;
  className?: string;
}) {
  return (
    <details
      className={cn(
        "group relative inline-block text-left",
        className,
      )}
    >
      <summary className="list-none cursor-pointer [&::-webkit-details-marker]:hidden">
        <FreshnessBadge state={state} asOf={observedAt ?? undefined} />
      </summary>
      <div className="absolute right-0 z-20 mt-2 w-72 rounded-xl border border-line bg-card p-3 text-xs shadow-xl">
        <p className="font-semibold text-ink">{source}</p>
        {observedAt ? (
          <p className="mt-1 num text-muted">Observed {observedAt}</p>
        ) : null}
        {detail ? <p className="mt-2 leading-relaxed text-muted">{detail}</p> : null}
      </div>
    </details>
  );
}
