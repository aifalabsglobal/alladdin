import type { OperationalAlert } from "@/lib/queries/alerts";
import { cn } from "@/lib/utils";

const SEVERITY_STYLES: Record<
  OperationalAlert["severity"],
  { dot: string; text: string; border: string }
> = {
  critical: {
    dot: "bg-negative",
    text: "text-negative",
    border: "border-negative/40",
  },
  warning: {
    dot: "bg-warning",
    text: "text-warning",
    border: "border-warning/40",
  },
  info: { dot: "bg-ai", text: "text-ai", border: "border-ai/40" },
};

const CATEGORY_LABEL: Record<OperationalAlert["category"], string> = {
  data: "Data",
  model: "Model",
  regime: "Regime",
  ops: "Ops",
};

export function AlertsPanel({ alerts }: { alerts: OperationalAlert[] }) {
  if (alerts.length === 0) return null;

  return (
    <section
      aria-label="Operational alerts"
      className="glass-card rounded-2xl p-4"
    >
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-tight text-ink">
          Alerts
        </h2>
        <span className="text-[11px] text-muted">
          {alerts.length} active · data, model & regime health
        </span>
      </header>
      <ul className="space-y-2">
        {alerts.map((alert) => {
          const style = SEVERITY_STYLES[alert.severity];
          return (
            <li
              key={alert.id}
              className={cn(
                "flex items-start gap-3 rounded-xl border bg-card px-3 py-2.5",
                style.border,
              )}
            >
              <span
                aria-hidden
                className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", style.dot)}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className={cn("text-sm font-semibold", style.text)}>
                    {alert.title}
                  </p>
                  <span className="rounded-full border border-line px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted">
                    {CATEGORY_LABEL[alert.category]}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted">{alert.detail}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
