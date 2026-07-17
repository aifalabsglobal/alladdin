import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

export type ServiceHealthItem = {
  key: string;
  label: string;
  status: "ok" | "degraded" | "down" | "unknown";
  detail?: string;
};

const tone: Record<ServiceHealthItem["status"], string> = {
  ok: "bg-positive",
  degraded: "bg-warning",
  down: "bg-negative",
  unknown: "bg-muted",
};

export function ServiceHealth({
  items,
  className,
}: {
  items: ServiceHealthItem[];
  className?: string;
}) {
  return (
    <Card
      title="Data & model health"
      subtitle="Operational status for feeds, jobs and prediction services"
      className={className}
    >
      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.key}
            className="flex items-start gap-3 rounded-xl border border-line bg-card-raised/40 px-3 py-2"
          >
            <span
              aria-hidden
              className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", tone[item.status])}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink">{item.label}</p>
              {item.detail ? (
                <p className="truncate text-xs text-muted">{item.detail}</p>
              ) : null}
            </div>
            <span className="text-[11px] uppercase tracking-wide text-muted">
              {item.status}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
