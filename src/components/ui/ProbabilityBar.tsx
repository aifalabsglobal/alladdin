import { cn } from "@/lib/utils";

export function ProbabilityBar({
  up,
  sideways,
  down,
  className,
}: {
  up: number;
  sideways: number;
  down: number;
  className?: string;
}) {
  const total = Math.max(up + sideways + down, 1e-9);
  const u = (up / total) * 100;
  const s = (sideways / total) * 100;
  const d = (down / total) * 100;

  return (
    <div className={cn("space-y-1", className)}>
      <div
        className="flex h-2 overflow-hidden rounded-full bg-card-raised"
        role="img"
        aria-label={`Probabilities up ${(u).toFixed(0)} percent, sideways ${(s).toFixed(0)} percent, down ${(d).toFixed(0)} percent`}
      >
        <span className="bg-positive" style={{ width: `${u}%` }} />
        <span className="bg-muted/60" style={{ width: `${s}%` }} />
        <span className="bg-negative" style={{ width: `${d}%` }} />
      </div>
      <div className="flex justify-between text-[11px] text-muted">
        <span className="num text-positive">Up {u.toFixed(0)}%</span>
        <span className="num">Side {s.toFixed(0)}%</span>
        <span className="num text-negative">Down {d.toFixed(0)}%</span>
      </div>
    </div>
  );
}
