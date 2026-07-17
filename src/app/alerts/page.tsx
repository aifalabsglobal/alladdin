import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  getAlertInbox,
  syncOperationalAlertEvents,
} from "@/lib/queries/alertInbox";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AlertsPage() {
  await syncOperationalAlertEvents();
  const alerts = await getAlertInbox();

  return (
    <div>
      <PageHeader
        title="Alert center"
        description="Operational, regime and model-gate alerts. Delivery channels (email/push) remain next."
      />
      <Card>
        {alerts.length === 0 ? (
          <p className="text-sm text-muted">No alerts yet.</p>
        ) : (
          <ul className="space-y-2">
            {alerts.map((alert) => (
              <li
                key={alert.id}
                className={cn(
                  "rounded-xl border px-3 py-2.5",
                  alert.severity === "critical"
                    ? "border-negative/40"
                    : alert.severity === "warning"
                      ? "border-warning/40"
                      : "border-line",
                  alert.acknowledged && "opacity-60",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-ink">{alert.title}</p>
                  <span className="text-[10px] uppercase text-muted">
                    {alert.category} · {alert.severity}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted">{alert.detail}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
