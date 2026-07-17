import Link from "next/link";

import { Card } from "@/components/ui/Card";
import { HealthBadge } from "@/components/ui/HealthBadge";
import { PageHeader } from "@/components/ui/PageHeader";
import { SyntheticTag } from "@/components/ui/SyntheticTag";
import { getSectorSummaries } from "@/lib/queries/sectors";

export const dynamic = "force-dynamic";

export default async function SectorsPage() {
  const sectors = await getSectorSummaries();

  return (
    <div>
      <PageHeader
        title="Sectors"
        description="Composite sector health from constituent stock scores."
        action={<SyntheticTag />}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {sectors.map((s) => (
          <Link key={s.id} href={`/sectors/${s.id}`}>
            <Card className="h-full transition hover:border-positive/40">
              <p className="text-sm font-semibold text-ink">{s.name}</p>
              <p className="mt-1 text-xs text-muted">{s.stockCount} stocks tracked</p>
              <div className="mt-3">
                {s.healthScore !== null && s.band ? (
                  <HealthBadge score={s.healthScore} band={s.band} />
                ) : (
                  <span className="text-xs text-muted">Score unavailable</span>
                )}
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
