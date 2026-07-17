import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

export type ModelTrustProps = {
  modelKey: string;
  version: string;
  kind: string;
  status: string;
  trainedAt?: string | null;
  validationWindow?: string | null;
  sampleCount?: number | null;
  accuracy?: number | null;
  calibrated?: boolean;
  limitations?: string[];
  className?: string;
};

export function ModelTrustCard({
  modelKey,
  version,
  kind,
  status,
  trainedAt,
  validationWindow,
  sampleCount,
  accuracy,
  calibrated = false,
  limitations = [],
  className,
}: ModelTrustProps) {
  return (
    <Card
      title="Model trust"
      subtitle="Evidence behind the directional outlook — educational signal only"
      className={className}
    >
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs text-muted">Model</dt>
          <dd className="font-medium text-ink">
            {modelKey}@{version}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Kind / status</dt>
          <dd className="font-medium text-ink">
            {kind} · {status}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Trained</dt>
          <dd className="num text-ink">{trainedAt ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Validation window</dt>
          <dd className="num text-ink">{validationWindow ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Sample size</dt>
          <dd className="num text-ink">
            {sampleCount === null || sampleCount === undefined
              ? "—"
              : sampleCount.toLocaleString("en-IN")}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Trailing accuracy</dt>
          <dd
            className={cn(
              "num font-semibold",
              accuracy === null || accuracy === undefined
                ? "text-muted"
                : accuracy >= 0.55
                  ? "text-positive"
                  : "text-warning",
            )}
          >
            {accuracy === null || accuracy === undefined
              ? "Insufficient outcomes"
              : `${(accuracy * 100).toFixed(1)}%`}
            {calibrated ? " · calibrated" : ""}
          </dd>
        </div>
      </dl>
      {limitations.length > 0 ? (
        <ul className="mt-3 list-disc space-y-1 pl-4 text-xs text-muted">
          {limitations.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}
