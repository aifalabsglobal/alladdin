import Link from "next/link";

import { ScoreDonut } from "@/components/charts/ScoreDonut";
import { Sparkline } from "@/components/charts/Sparkline";
import { Card } from "@/components/ui/Card";
import { HealthBadge } from "@/components/ui/HealthBadge";
import { ImpactBarList } from "@/components/ui/ImpactBarList";
import { KpiTile } from "@/components/ui/KpiTile";
import { PageHeader } from "@/components/ui/PageHeader";
import { SyntheticTag } from "@/components/ui/SyntheticTag";
import { formatCrore, formatDate, formatPct } from "@/lib/format";
import {
  getAttentionMovers,
  getMarketInfluencers,
  getMarketOverview,
  getMarketSparklines,
  getTopAndBottomStocks,
} from "@/lib/queries/market";
import { getSectorSummaries } from "@/lib/queries/sectors";
import { bandLabel } from "@/lib/scoring/bands";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [overview, sparklines, movers, ranked, sectors, marketInfluencers] =
    await Promise.all([
      getMarketOverview(),
      getMarketSparklines(),
      getAttentionMovers(),
      getTopAndBottomStocks(),
      getSectorSummaries(),
      getMarketInfluencers(),
    ]);

  if (!overview) {
    return (
      <div>
        <PageHeader
          title="Market Health Overview"
          description="No market snapshots yet. Run the database seed to populate synthetic data."
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Market Health Overview"
        description="Composite market health with the influencers driving today's signals."
        action={
          <SyntheticTag
            label="Real NSE scores · synthetic market snapshot"
            asOf={formatDate(overview.asOf)}
          />
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <div className="glass-card flex items-center justify-between gap-3 rounded-2xl p-4 col-span-2 lg:col-span-1">
          <div>
            <p className="text-xs font-medium text-muted">Market health</p>
            <p className="mt-1 text-sm font-semibold text-ink">
              {bandLabel(
                overview.marketHealthScore >= 80
                  ? "STRONG"
                  : overview.marketHealthScore >= 65
                    ? "HEALTHY"
                    : overview.marketHealthScore >= 45
                      ? "NEUTRAL"
                      : overview.marketHealthScore >= 30
                        ? "WEAK"
                        : "CRITICAL",
              )}
            </p>
          </div>
          <ScoreDonut
            score={overview.marketHealthScore}
            size={84}
            label={`Market health score ${Math.round(overview.marketHealthScore)} out of 100`}
          />
        </div>

        <KpiTile
          label="Nifty 50"
          value={overview.niftyClose.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          hint={
            overview.niftyChangePct === null
              ? undefined
              : `${formatPct(overview.niftyChangePct)} today`
          }
          tone={
            overview.niftyChangePct === null
              ? "neutral"
              : overview.niftyChangePct >= 0
                ? "positive"
                : "negative"
          }
        >
          <Sparkline
            data={sparklines.nifty}
            positive={(overview.niftyChangePct ?? 0) >= 0}
            label="Nifty 30-day trend"
          />
        </KpiTile>

        <KpiTile
          label="Sensex"
          value={overview.sensexClose.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          hint={
            overview.sensexChangePct === null
              ? undefined
              : `${formatPct(overview.sensexChangePct)} today`
          }
          tone={
            overview.sensexChangePct === null
              ? "neutral"
              : overview.sensexChangePct >= 0
                ? "positive"
                : "negative"
          }
        >
          <Sparkline
            data={sparklines.sensex}
            positive={(overview.sensexChangePct ?? 0) >= 0}
            label="Sensex 30-day trend"
          />
        </KpiTile>

        <KpiTile
          label="FII / DII net flow"
          value={formatCrore(overview.fiiNet)}
          hint={`DII ${formatCrore(overview.diiNet)}`}
          tone={overview.fiiNet >= 0 ? "positive" : "negative"}
        />

        <KpiTile
          label="India VIX · Breadth"
          value={overview.indiaVix.toFixed(1)}
          hint={`${overview.advancers} advancing / ${overview.decliners} declining`}
          tone={overview.indiaVix > 18 ? "negative" : "neutral"}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Needs your attention */}
        <Card
          title="Needs your attention"
          subtitle="Biggest health movers this session with plain-language reasons"
          className="lg:col-span-2"
        >
          {movers.length === 0 ? (
            <p className="text-sm text-muted">No movers computed yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {movers.map((m) => (
                <li key={m.symbol} className="flex items-center gap-4 py-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/stocks/${m.symbol}`}
                      className="text-sm font-semibold text-ink hover:text-positive"
                    >
                      {m.symbol}
                    </Link>
                    <p className="truncate text-xs text-muted">
                      {m.reason ?? m.name}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "num text-sm font-semibold",
                      (m.scoreChange ?? 0) >= 0 ? "text-positive" : "text-negative",
                    )}
                  >
                    {(m.scoreChange ?? 0) >= 0 ? "+" : ""}
                    {(m.scoreChange ?? 0).toFixed(1)} pts
                  </span>
                  <HealthBadge score={m.score} band={m.band} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Market influencers */}
        <Card
          title="Market influencers"
          subtitle="Top market-scope factors today"
        >
          {marketInfluencers.length === 0 ? (
            <p className="text-sm text-muted">No readings yet.</p>
          ) : (
            <ImpactBarList
              items={marketInfluencers.map((m) => ({
                key: m.key,
                name: m.name,
                impactPoints: m.impactPoints,
                reasonText: m.reasonText,
              }))}
            />
          )}
        </Card>
      </div>

      {/* Sector strip */}
      <Card
        title="Sector health"
        subtitle="Sorted by composite sector score"
        className="mt-6"
      >
        <div className="scrollbar-slim flex gap-3 overflow-x-auto pb-1">
          {sectors.map((s) => (
            <Link
              key={s.id}
              href={`/sectors/${s.id}`}
              className="glass-card flex min-w-44 shrink-0 items-center justify-between gap-3 rounded-xl px-4 py-3 transition hover:border-positive/40"
            >
              <div>
                <p className="text-sm font-medium text-ink">{s.name}</p>
                <p className="text-xs text-muted">{s.stockCount} stocks</p>
              </div>
              {s.healthScore !== null && s.band ? (
                <HealthBadge score={s.healthScore} band={s.band} />
              ) : (
                <span className="text-xs text-muted">—</span>
              )}
            </Link>
          ))}
        </div>
      </Card>

      {/* Top / bottom stocks */}
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Card title="Top 5 healthiest stocks">
          <RankList items={ranked.top} />
        </Card>
        <Card title="Top 5 weakest stocks">
          <RankList items={ranked.bottom} />
        </Card>
      </div>
    </div>
  );
}

function RankList({
  items,
}: {
  items: { symbol: string; name: string; sectorName: string; score: number; band: import("@prisma/client").HealthBand }[];
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted">No scored stocks yet.</p>;
  }

  return (
    <ol className="divide-y divide-line">
      {items.map((s, idx) => (
        <li key={s.symbol} className="flex items-center gap-3 py-2.5">
          <span className="num w-5 text-right text-xs text-muted">{idx + 1}</span>
          <div className="min-w-0 flex-1">
            <Link
              href={`/stocks/${s.symbol}`}
              className="text-sm font-semibold text-ink hover:text-positive"
            >
              {s.symbol}
            </Link>
            <p className="truncate text-xs text-muted">{s.sectorName}</p>
          </div>
          <HealthBadge score={s.score} band={s.band} />
        </li>
      ))}
    </ol>
  );
}
