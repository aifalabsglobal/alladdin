import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  abstainReasonLabel,
  getCalibrationSummary,
} from "@/lib/queries/calibration";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const HORIZON_LABEL: Record<string, string> = {
  M15: "15 minutes",
  H1: "1 hour",
  EOD: "End of day",
  D1: "Next day",
  W1: "1 week",
  M1: "1 month",
};

function pct(value: number | null, digits = 1): string {
  if (value === null || !Number.isFinite(value)) return "—";
  return `${(value * 100).toFixed(digits)}%`;
}

export default async function CalibrationPage() {
  const summary = await getCalibrationSummary();
  const abst = summary.abstention;

  return (
    <div>
      <PageHeader
        title="Model trust & calibration"
        description="How well the model's stated confidence matches realized outcomes. Lower Brier is better; reliability should track the diagonal. Signals are gated until calibration is earned."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card title="Matured outcomes">
          <p className="num text-2xl font-semibold text-ink">
            {summary.totalLabeled.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-muted">
            Predictions with a realized result used for scoring.
          </p>
        </Card>
        <Card title="Overall Brier score">
          <p className="num text-2xl font-semibold text-ink">
            {summary.overallBrier === null
              ? "—"
              : summary.overallBrier.toFixed(4)}
          </p>
          <p className="mt-1 text-xs text-muted">
            Three-class mean squared probability error (0 = perfect, lower is
            better).
          </p>
        </Card>
        <Card title="Stand-aside rate">
          <p className="num text-2xl font-semibold text-ink">
            {pct(abst.rate)}
          </p>
          <p className="mt-1 text-xs text-muted">
            {abst.standAside} of {abst.assessed} current signals held back by the
            decision gate.
          </p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Accuracy & Brier by horizon">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted">
                  <th className="pb-2">Horizon</th>
                  <th className="pb-2 text-right">Labeled</th>
                  <th className="pb-2 text-right">Accuracy</th>
                  <th className="pb-2 text-right">Brier</th>
                </tr>
              </thead>
              <tbody>
                {summary.horizons.map((row) => (
                  <tr key={row.horizon} className="border-t border-line">
                    <td className="py-2 text-ink">
                      {HORIZON_LABEL[row.horizon] ?? row.horizon}
                    </td>
                    <td className="num py-2 text-right text-muted">
                      {row.labeled.toLocaleString()}
                    </td>
                    <td className="num py-2 text-right text-ink">
                      {pct(row.accuracy)}
                    </td>
                    <td className="num py-2 text-right text-ink">
                      {row.brier === null ? "—" : row.brier.toFixed(4)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Reliability (confidence vs realized hit rate)">
          <div className="space-y-2">
            {summary.reliability.map((bin) => {
              const gap =
                bin.predicted !== null && bin.empirical !== null
                  ? bin.empirical - bin.predicted
                  : null;
              return (
                <div key={bin.label} className="flex items-center gap-3">
                  <span className="num w-24 shrink-0 text-xs text-muted">
                    {bin.label}
                  </span>
                  <div className="relative h-3 flex-1 rounded-full bg-card-raised">
                    {bin.empirical !== null ? (
                      <div
                        className={cn(
                          "absolute inset-y-0 left-0 rounded-full",
                          gap !== null && Math.abs(gap) <= 0.1
                            ? "bg-positive"
                            : "bg-warning",
                        )}
                        style={{ width: `${Math.min(100, bin.empirical * 100)}%` }}
                      />
                    ) : null}
                  </div>
                  <span className="num w-28 shrink-0 text-right text-xs text-ink">
                    {bin.count === 0
                      ? "no data"
                      : `${pct(bin.empirical, 0)} of ${bin.count}`}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-muted">
            Green bars are within 10 points of stated confidence. Amber bars are
            over- or under-confident and reduce trust.
          </p>
        </Card>
      </div>

      <Card
        title="Model bench"
        subtitle="Active ensemble vs shadow candidates — shadows never drive live signals"
        className="mt-6"
      >
        {summary.bench.length === 0 ? (
          <p className="text-sm text-muted">No models registered yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted">
                  <th className="pb-2">Model</th>
                  <th className="pb-2">Kind</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2 text-right">Accuracy</th>
                  <th className="pb-2 text-right">Baseline</th>
                  <th className="pb-2 text-right">Brier</th>
                  <th className="pb-2 text-right">Samples</th>
                </tr>
              </thead>
              <tbody>
                {summary.bench.map((row) => (
                  <tr
                    key={`${row.key}@${row.version}`}
                    className="border-t border-line"
                  >
                    <td className="py-2 text-ink">
                      {row.key}
                      <span className="text-muted"> v{row.version}</span>
                      {row.note ? (
                        <p className="text-[11px] text-muted">{row.note}</p>
                      ) : null}
                    </td>
                    <td className="py-2 text-muted">{row.kind}</td>
                    <td className="py-2">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                          row.status === "ACTIVE"
                            ? "bg-positive/12 text-positive"
                            : "bg-ai/12 text-ai",
                        )}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="num py-2 text-right text-ink">
                      {pct(row.accuracy)}
                    </td>
                    <td className="num py-2 text-right text-muted">
                      {pct(row.baselineAccuracy)}
                    </td>
                    <td className="num py-2 text-right text-ink">
                      {row.brier === null ? "—" : row.brier.toFixed(4)}
                    </td>
                    <td className="num py-2 text-right text-muted">
                      {row.samples === null ? "—" : row.samples.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-[11px] leading-relaxed text-muted">
          A shadow model is only worth promoting if it beats both the active
          ensemble and its own majority-class baseline out of sample.
        </p>
      </Card>

      <Card title="Why current signals are held back" className="mt-6">
        {abst.topReasons.length === 0 ? (
          <p className="text-sm text-muted">
            No current signals assessed yet. Run the prediction job to populate
            this panel.
          </p>
        ) : (
          <ul className="space-y-2">
            {abst.topReasons.map(({ reason, count }) => (
              <li
                key={reason}
                className="flex items-center justify-between rounded-lg border border-line bg-card px-3 py-2 text-sm"
              >
                <span className="text-ink">{abstainReasonLabel(reason)}</span>
                <span className="num text-muted">{count} signals</span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-[11px] leading-relaxed text-muted">
          This is intentional. The gate defaults to standing aside on stale data,
          thin samples, model conflict, or no edge after costs — so the product
          never implies confidence it has not earned.
        </p>
      </Card>
    </div>
  );
}
