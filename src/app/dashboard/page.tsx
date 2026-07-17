import Link from "next/link";

import { ScoreDonut } from "@/components/charts/ScoreDonut";
import { Sparkline } from "@/components/charts/Sparkline";
import { AlertsPanel } from "@/components/ui/AlertsPanel";
import { Card } from "@/components/ui/Card";
import { DataSourcePopover } from "@/components/ui/DataSourcePopover";
import { DirectionChip } from "@/components/ui/DirectionChip";
import { FreshnessBadge } from "@/components/ui/FreshnessBadge";
import { HealthBadge } from "@/components/ui/HealthBadge";
import { ImpactBarList } from "@/components/ui/ImpactBarList";
import { KpiTile } from "@/components/ui/KpiTile";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProbabilityBar } from "@/components/ui/ProbabilityBar";
import { SectorHeatmap } from "@/components/ui/SectorHeatmap";
import { ServiceHealth } from "@/components/ui/ServiceHealth";
import { formatCrore, formatDate, formatMoney, formatPct } from "@/lib/format";
import { marketSessionState } from "@/lib/live/freshness";
import { getOperationalAlerts } from "@/lib/queries/alerts";
import { getGlobalMarketSummary } from "@/lib/queries/assets";
import {
  getAttentionMovers,
  getMarketInfluencers,
  getMarketOverview,
  getMarketSparklines,
  getTopAndBottomStocks,
} from "@/lib/queries/market";
import {
  getHighConfidencePredictions,
  getServiceHealthItems,
} from "@/lib/queries/predictions";
import { getSectorSummaries } from "@/lib/queries/sectors";
import { bandLabel } from "@/lib/scoring/bands";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const HORIZON_LABEL: Record<string, string> = {
  M15: "15m",
  H1: "1h",
  EOD: "EOD",
  D1: "1D",
  W1: "1W",
  M1: "1M",
};

export default async function DashboardPage() {
  const [
    overview,
    sparklines,
    movers,
    ranked,
    sectors,
    marketInfluencers,
    predictions,
    healthItems,
    global,
    alerts,
  ] = await Promise.all([
    getMarketOverview(),
    getMarketSparklines(),
    getAttentionMovers(),
    getTopAndBottomStocks(),
    getSectorSummaries(),
    getMarketInfluencers(),
    getHighConfidencePredictions(8),
    getServiceHealthItems(),
    getGlobalMarketSummary(),
    getOperationalAlerts(),
  ]);

  if (!overview) {
    return (
      <div>
        <PageHeader
          title="Global markets cockpit"
          description="No market snapshots yet. Run seed + scoring jobs to populate the dashboard."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Global markets cockpit"
        description="Multi-asset observations, session truth, explainable health scores, and guarded directional research. India remains a first-class market profile."
        action={
          <DataSourcePopover
            state="eod"
            source="NSE bhavcopy + computed scores · Yahoo prototype stream for live tape"
            observedAt={formatDate(overview.asOf)}
            detail="Yahoo is unofficial and may be delayed/unavailable. Durable history remains official EOD."
          />
        }
      />

      <AlertsPanel alerts={alerts} />

      <Card
        title="Global session and quote strip"
        subtitle="Provider-qualified observations; reference FX and aggregated crypto are delayed"
      >
        <div className="mb-4 flex flex-wrap gap-2">
          {global.venues.map((venue) => (
            <span
              key={venue.id}
              className="rounded-full border border-line bg-card-raised px-3 py-1.5 text-xs text-muted"
            >
              {venue.code}{" "}
              <strong className="capitalize text-ink">
                {marketSessionState({
                  timezone: venue.timezone,
                  sessionType: venue.sessionType,
                  openMinute: venue.openMinute,
                  closeMinute: venue.closeMinute,
                  weekMask: venue.weekMask,
                })}
              </strong>
            </span>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {global.quotes.slice(0, 8).map((quote) => (
            <Link
              key={quote.id}
              href={`/assets/${quote.instrument.id}`}
              className="rounded-xl border border-line p-3 transition hover:border-positive/40"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-ink">
                    {quote.instrument.symbol}
                  </p>
                  <p className="text-[11px] text-muted">
                    {quote.instrument.assetClass} · {quote.provider}
                  </p>
                </div>
                <FreshnessBadge state="delayed" />
              </div>
              <p className="num mt-2 text-lg font-semibold text-ink">
                {formatMoney(quote.price, quote.currency)}
              </p>
              {quote.changePct24h !== null ? (
                <p
                  className={cn(
                    "num text-xs",
                    quote.changePct24h >= 0 ? "text-positive" : "text-negative",
                  )}
                >
                  {formatPct(quote.changePct24h)}
                </p>
              ) : null}
            </Link>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted">
          Catalog:{" "}
          {global.classCounts
            .map((item) => `${item.assetClass} ${item._count._all}`)
            .join(" · ")}
        </p>
      </Card>

      {/* Regime + KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <div className="glass-card col-span-2 flex items-center justify-between gap-3 rounded-2xl p-4 lg:col-span-1">
          <div>
            <p className="text-xs font-medium text-muted">Market regime</p>
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
            <p className="mt-1 text-[11px] text-muted">Composite health</p>
          </div>
          <ScoreDonut
            score={overview.marketHealthScore}
            size={84}
            label={`Market health score ${Math.round(overview.marketHealthScore)} out of 100`}
          />
        </div>

        <KpiTile
          label="Nifty 50"
          value={overview.niftyClose.toLocaleString("en-IN", {
            maximumFractionDigits: 0,
          })}
          hint={
            overview.niftyChangePct === null
              ? undefined
              : `${formatPct(overview.niftyChangePct)} EOD`
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
          value={overview.sensexClose.toLocaleString("en-IN", {
            maximumFractionDigits: 0,
          })}
          hint={
            overview.sensexChangePct === null
              ? undefined
              : `${formatPct(overview.sensexChangePct)} EOD`
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

      <div className="grid gap-6 lg:grid-cols-3">
        <Card
          title="Needs attention"
          subtitle="Largest health-score movers with plain-language drivers"
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
                      (m.scoreChange ?? 0) >= 0
                        ? "text-positive"
                        : "text-negative",
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

        <ServiceHealth items={healthItems} />
      </div>

      <Card
        title="High-confidence multi-horizon outlooks"
        subtitle="Ensemble directional signals with class probabilities — not buy/sell advice"
      >
        {predictions.length === 0 ? (
          <p className="text-sm text-muted">
            No active ensemble predictions yet. Trigger{" "}
            <code className="text-ai">/api/jobs/predict</code> after scoring.
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {predictions.map((p) => (
              <Link
                key={p.id}
                href={`/stocks/${p.symbol}`}
                className="glass-card rounded-xl p-3 transition hover:border-positive/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-ink">{p.symbol}</p>
                    <p className="text-[11px] text-muted">
                      {HORIZON_LABEL[p.horizon] ?? p.horizon} · {p.sectorName}
                    </p>
                  </div>
                  <DirectionChip
                    direction={p.direction}
                    confidence={p.confidence}
                  />
                </div>
                <div className="mt-3">
                  <ProbabilityBar
                    up={p.probUp ?? 0}
                    sideways={p.probSideways ?? 0}
                    down={p.probDown ?? 0}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-muted">
                  <span className="num">
                    {p.expectedReturn === null
                      ? "—"
                      : `E[r] ${formatPct(p.expectedReturn * 100)}`}
                  </span>
                  <span className="num">
                    {p.accuracy === null
                      ? "No outcomes yet"
                      : `Hit ${(p.accuracy * 100).toFixed(0)}%`}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card
          title="Sector heatmap"
          subtitle="Composite sector health"
          className="lg:col-span-2"
        >
          <SectorHeatmap
            items={sectors.map((s) => ({
              id: s.id,
              name: s.name,
              healthScore: s.healthScore,
              stockCount: s.stockCount,
            }))}
          />
        </Card>

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

      <div className="grid gap-6 md:grid-cols-2">
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
  items: {
    symbol: string;
    name: string;
    sectorName: string;
    score: number;
    band: import("@prisma/client").HealthBand;
  }[];
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
