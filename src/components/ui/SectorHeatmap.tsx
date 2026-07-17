import Link from "next/link";

import { cn } from "@/lib/utils";

export type SectorHeatItem = {
  id: string;
  name: string;
  healthScore: number | null;
  stockCount: number;
};

function tone(score: number | null): string {
  if (score === null) return "bg-card text-muted";
  if (score >= 70) return "bg-positive/20 text-positive border-positive/30";
  if (score >= 55) return "bg-positive/10 text-positive-soft border-positive/20";
  if (score >= 45) return "bg-card-raised text-ink border-line";
  if (score >= 35) return "bg-warning/10 text-warning border-warning/30";
  return "bg-negative/15 text-negative border-negative/30";
}

export function SectorHeatmap({ items }: { items: SectorHeatItem[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted">No sector scores yet.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((s) => (
        <Link
          key={s.id}
          href={`/sectors/${s.id}`}
          className={cn(
            "rounded-xl border px-3 py-3 transition hover:brightness-110",
            tone(s.healthScore),
          )}
        >
          <p className="text-sm font-medium">{s.name}</p>
          <p className="num mt-1 text-lg font-semibold">
            {s.healthScore === null ? "—" : Math.round(s.healthScore)}
          </p>
          <p className="text-[11px] opacity-80">{s.stockCount} stocks</p>
        </Link>
      ))}
    </div>
  );
}
