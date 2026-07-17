import Link from "next/link";
import { notFound } from "next/navigation";

import { PriceHealthChart } from "@/components/charts/PriceHealthChart";
import { Card } from "@/components/ui/Card";
import { HealthBadge } from "@/components/ui/HealthBadge";
import { ImpactBarList } from "@/components/ui/ImpactBarList";
import { PageHeader } from "@/components/ui/PageHeader";
import { SyntheticTag } from "@/components/ui/SyntheticTag";
import { formatInr, formatPct, formatShortDate } from "@/lib/format";
import { getSectorDetail } from "@/lib/queries/sectors";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SectorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sector = await getSectorDetail(id);
  if (!sector) notFound();

  return (
    <div>
      <PageHeader
        title={sector.name}
        description={`${sector.constituents.length} constituent stocks ranked by health.`}
        action={<SyntheticTag />}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Sector health" className="lg:col-span-1">
          {sector.healthScore !== null && sector.band ? (
            <div className="flex items-center gap-4">
              <p className="num text-4xl font-semibold text-ink">
                {Math.round(sector.healthScore)}
              </p>
              <HealthBadge band={sector.band} />
            </div>
          ) : (
            <p className="text-sm text-muted">Score unavailable.</p>
          )}
          <p className="mt-3 text-xs text-muted">
            Average of the latest constituent health scores.
          </p>
        </Card>

        <Card
          title="Sector momentum readings"
          subtitle="Latest sector-scope influencer contributions"
          className="lg:col-span-2"
        >
          {sector.momentumReadings.length === 0 ? (
            <p className="text-sm text-muted">No momentum readings yet.</p>
          ) : (
            <ImpactBarList
              items={sector.momentumReadings.map((m, idx) => ({
                key: `${m.symbol}-${idx}`,
                name: m.symbol,
                impactPoints: m.impactPoints,
                reasonText: m.reasonText,
              }))}
            />
          )}
        </Card>
      </div>

      {/* Trend */}
      <Card
        title="Sector health trend"
        subtitle="Average constituent health over seeded history"
        className="mt-6"
      >
        {sector.healthTrend.length > 1 ? (
          <PriceHealthChart
            data={sector.healthTrend.map((t) => ({
              date: formatShortDate(t.date),
              close: Number(t.avgScore.toFixed(1)),
              health: Number(t.avgScore.toFixed(1)),
            }))}
          />
        ) : (
          <p className="text-sm text-muted">Not enough history to chart.</p>
        )}
      </Card>

      {/* Constituents */}
      <Card title="Constituents by health" className="mt-6">
        <div className="scrollbar-slim overflow-x-auto">
          <table className="w-full min-w-[560px] text-left">
            <caption className="sr-only">Sector constituents ranked by health</caption>
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                <th scope="col" className="py-2.5 pr-4 font-medium">#</th>
                <th scope="col" className="py-2.5 pr-4 font-medium">Stock</th>
                <th scope="col" className="py-2.5 pr-4 text-right font-medium">Price</th>
                <th scope="col" className="py-2.5 pr-4 text-right font-medium">Day</th>
                <th scope="col" className="py-2.5 font-medium">Health</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {sector.constituents.map((c, idx) => (
                <tr key={c.symbol} className="transition hover:bg-card-raised/50">
                  <td className="num py-3 pr-4 text-xs text-muted">{idx + 1}</td>
                  <td className="py-3 pr-4">
                    <Link
                      href={`/stocks/${c.symbol}`}
                      className="text-sm font-semibold text-ink hover:text-positive"
                    >
                      {c.symbol}
                    </Link>
                    <p className="max-w-56 truncate text-xs text-muted">{c.name}</p>
                  </td>
                  <td className="num py-3 pr-4 text-right text-sm text-ink">
                    {c.close === null ? "—" : formatInr(c.close)}
                  </td>
                  <td
                    className={cn(
                      "num py-3 pr-4 text-right text-sm font-medium",
                      c.changePct === null
                        ? "text-muted"
                        : c.changePct >= 0
                          ? "text-positive"
                          : "text-negative",
                    )}
                  >
                    {c.changePct === null ? "—" : formatPct(c.changePct)}
                  </td>
                  <td className="py-3">
                    {c.score !== null && c.band ? (
                      <HealthBadge score={c.score} band={c.band} />
                    ) : (
                      <span className="text-xs text-muted">Unavailable</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
