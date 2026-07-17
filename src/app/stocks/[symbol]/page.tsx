import Link from "next/link";
import { notFound } from "next/navigation";

import { PriceHealthChart } from "@/components/charts/PriceHealthChart";
import { ScoreDonut } from "@/components/charts/ScoreDonut";
import { Card } from "@/components/ui/Card";
import { DirectionChip } from "@/components/ui/DirectionChip";
import { HealthBadge } from "@/components/ui/HealthBadge";
import { ImpactBarList } from "@/components/ui/ImpactBarList";
import { PageHeader } from "@/components/ui/PageHeader";
import { SentimentChip } from "@/components/ui/SentimentChip";
import { SyntheticTag } from "@/components/ui/SyntheticTag";
import {
  formatDate,
  formatInr,
  formatMarketCap,
  formatPct,
  formatShortDate,
} from "@/lib/format";
import { getStockDetail } from "@/lib/queries/stocks";
import { bandLabel } from "@/lib/scoring/bands";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const HORIZON_LABEL: Record<string, string> = {
  D1: "1 day",
  W1: "1 week",
  M1: "1 month",
};

export default async function StockDetailPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  const stock = await getStockDetail(decodeURIComponent(symbol).toUpperCase());
  if (!stock) notFound();

  return (
    <div>
      <PageHeader
        title={`${stock.symbol} · ${stock.name}`}
        description={`${stock.exchange} · ${stock.sectorName}${stock.industry ? ` · ${stock.industry}` : ""} · Market cap ${formatMarketCap(stock.marketCap)}`}
        action={
          <SyntheticTag label="Computed from real NSE data" asOf={stock.asOf ? formatDate(stock.asOf) : undefined} />
        }
      />

      {/* Hero */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="flex items-center justify-between gap-4 lg:col-span-1">
          <div>
            <p className="text-xs text-muted">Last close</p>
            <p className="num mt-1 text-2xl font-semibold text-ink">
              {stock.close === null ? "—" : formatInr(stock.close)}
            </p>
            {stock.changePct !== null ? (
              <p
                className={cn(
                  "num mt-1 text-sm font-medium",
                  stock.changePct >= 0 ? "text-positive" : "text-negative",
                )}
              >
                {formatPct(stock.changePct)} today
              </p>
            ) : null}
            {stock.band ? (
              <p className="mt-3 text-xs text-muted">{bandLabel(stock.band)}</p>
            ) : null}
            {stock.scoreConfidence !== null ? (
              <p className="mt-1 text-xs text-muted">
                Data confidence{" "}
                <span className="num font-semibold text-ai">
                  {Math.round(stock.scoreConfidence * 100)}%
                </span>
              </p>
            ) : null}
          </div>
          {stock.score !== null ? (
            <ScoreDonut
              score={stock.score}
              label={`${stock.symbol} health score ${Math.round(stock.score)} out of 100`}
            />
          ) : (
            <p className="text-sm text-muted">Score unavailable</p>
          )}
        </Card>

        {/* Why this score */}
        <Card
          title="Why this score?"
          subtitle="Influencer contributions to today's health score — the numbers behind the signal"
          className="lg:col-span-2"
        >
          {stock.breakdown.length === 0 ? (
            <p className="text-sm text-muted">No breakdown available.</p>
          ) : (
            <ImpactBarList
              items={stock.breakdown.map((b) => ({
                key: b.key,
                name: b.name,
                impactPoints: b.impactPoints,
                reasonText: b.reasonText,
              }))}
            />
          )}
        </Card>
      </div>

      {/* Chart */}
      <Card
        title="Price and health history"
        subtitle="Simple line view — 90 trading days of synthetic history available"
        className="mt-6"
      >
        {stock.chart.length > 1 ? (
          <PriceHealthChart
            data={stock.chart.map((p) => ({
              date: formatShortDate(p.date),
              close: Number(p.close.toFixed(2)),
              health: Number(p.health.toFixed(1)),
            }))}
          />
        ) : (
          <p className="text-sm text-muted">Not enough history to chart.</p>
        )}
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Predictions */}
        <Card
          title="Model outlook"
          subtitle="Directional signals with model confidence — not investment advice"
        >
          {stock.predictions.length === 0 ? (
            <p className="text-sm text-muted">No predictions generated yet.</p>
          ) : (
            <ul className="space-y-4">
              {stock.predictions.map((p) => (
                <li
                  key={p.horizon}
                  className="rounded-xl border border-line bg-card-raised/60 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-ink">
                      {HORIZON_LABEL[p.horizon] ?? p.horizon}
                    </p>
                    <DirectionChip direction={p.direction} confidence={p.confidence} />
                  </div>
                  <p className="mt-2 text-xs text-muted">
                    Model {p.modelKey} v{p.modelVersion}
                    {p.accuracy !== null
                      ? ` · seeded trailing accuracy ${Math.round(p.accuracy * 100)}% (synthetic)`
                      : " · accuracy not yet measured"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Fundamentals */}
        <Card title="Fundamentals" subtitle="Latest snapshot vs sector median">
          {stock.fundamentals === null ? (
            <p className="text-sm text-muted">No fundamentals recorded.</p>
          ) : (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <Metric label="P/E" value={stock.fundamentals.pe?.toFixed(1)} />
              <Metric
                label="Sector median P/E"
                value={stock.fundamentals.sectorMedianPe?.toFixed(1)}
              />
              <Metric label="P/B" value={stock.fundamentals.pb?.toFixed(1)} />
              <Metric label="EPS" value={stock.fundamentals.eps?.toFixed(1)} />
              <Metric
                label="EPS growth YoY"
                value={
                  stock.fundamentals.epsGrowthYoY === null
                    ? undefined
                    : formatPct(stock.fundamentals.epsGrowthYoY)
                }
              />
              <Metric
                label="Debt / equity"
                value={stock.fundamentals.debtToEquity?.toFixed(2)}
              />
              <Metric
                label="ROE"
                value={
                  stock.fundamentals.roe === null
                    ? undefined
                    : formatPct(stock.fundamentals.roe, false)
                }
              />
            </dl>
          )}
        </Card>

        {/* News */}
        <Card title="Recent news" subtitle="With model-scored sentiment">
          {stock.news.length === 0 ? (
            <p className="text-sm text-muted">No news items yet.</p>
          ) : (
            <ul className="space-y-3">
              {stock.news.map((n) => (
                <li key={n.url} className="border-b border-line pb-3 last:border-0">
                  <p className="text-sm font-medium text-ink">{n.title}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted">
                    <span>{n.source}</span>
                    <span aria-hidden>·</span>
                    <span>{formatDate(n.publishedAt)}</span>
                    <SentimentChip sentiment={n.sentiment} />
                  </div>
                  {n.sentimentReason ? (
                    <p className="mt-1 text-xs text-muted">{n.sentimentReason}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Peers */}
      <Card
        title="Sector peers"
        subtitle={`Other ${stock.sectorName} constituents by market cap`}
        className="mt-6"
      >
        {stock.peers.length === 0 ? (
          <p className="text-sm text-muted">No peers found.</p>
        ) : (
          <div className="scrollbar-slim overflow-x-auto">
            <table className="w-full min-w-[480px] text-left">
              <caption className="sr-only">Peer comparison</caption>
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                  <th scope="col" className="py-2 pr-4 font-medium">Stock</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Health</th>
                  <th scope="col" className="py-2 text-right font-medium">P/E</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {stock.peers.map((p) => (
                  <tr key={p.symbol}>
                    <td className="py-2.5 pr-4">
                      <Link
                        href={`/stocks/${p.symbol}`}
                        className="text-sm font-semibold text-ink hover:text-positive"
                      >
                        {p.symbol}
                      </Link>
                      <p className="max-w-56 truncate text-xs text-muted">{p.name}</p>
                    </td>
                    <td className="py-2.5 pr-4">
                      {p.score !== null && p.band ? (
                        <HealthBadge score={p.score} band={p.band} />
                      ) : (
                        <span className="text-xs text-muted">—</span>
                      )}
                    </td>
                    <td className="num py-2.5 text-right text-sm text-ink">
                      {p.pe === null ? "—" : p.pe.toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value?: string }) {
  return (
    <>
      <dt className="text-muted">{label}</dt>
      <dd className="num text-right font-medium text-ink">{value ?? "Unavailable"}</dd>
    </>
  );
}
