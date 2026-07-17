import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PriceHealthChart } from "@/components/charts/PriceHealthChart";
import { ScoreDonut } from "@/components/charts/ScoreDonut";
import { ExplainPredictionButton } from "@/components/stocks/ExplainPredictionButton";
import { IntradayChartPanel } from "@/components/stocks/IntradayChartPanel";
import { LiveStockSummary } from "@/components/stocks/LiveStockSummary";
import { Card } from "@/components/ui/Card";
import { DataSourcePopover } from "@/components/ui/DataSourcePopover";
import { DirectionChip } from "@/components/ui/DirectionChip";
import { HealthBadge } from "@/components/ui/HealthBadge";
import { ImpactBarList } from "@/components/ui/ImpactBarList";
import { ModelTrustCard } from "@/components/ui/ModelTrustCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProbabilityBar } from "@/components/ui/ProbabilityBar";
import { SentimentChip } from "@/components/ui/SentimentChip";
import {
  formatDate,
  formatMarketCap,
  formatPct,
  formatShortDate,
} from "@/lib/format";
import { getStockDetail } from "@/lib/queries/stocks";
import { bandLabel } from "@/lib/scoring/bands";

export const dynamic = "force-dynamic";

const HORIZON_LABEL: Record<string, string> = {
  M15: "15 minutes",
  H1: "1 hour",
  EOD: "End of session",
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
          <DataSourcePopover
            state="eod"
            source="Official NSE bhavcopy + computed score"
            observedAt={stock.asOf ? formatDate(stock.asOf) : undefined}
            detail="Live price overlays use Yahoo's unofficial prototype stream and fall back to this EOD close."
          />
        }
      />

      <div className="sticky top-0 z-10 mb-6 grid gap-4 rounded-2xl bg-canvas/90 py-2 backdrop-blur lg:grid-cols-3">
        <Card className="relative flex items-center justify-between gap-4 overflow-hidden">
          <Image
            src="/logo-transparent.png"
            alt=""
            aria-hidden
            width={280}
            height={280}
            className="pointer-events-none absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 select-none object-contain opacity-30 brightness-150 saturate-150"
          />
          <div className="relative">
            <LiveStockSummary
              symbol={stock.symbol}
              eodClose={stock.close}
              eodChangePct={stock.changePct}
            />
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
          <div className="relative">
            {stock.score !== null ? (
              <ScoreDonut
                score={stock.score}
                label={`${stock.symbol} health score ${Math.round(stock.score)} out of 100`}
              />
            ) : (
              <p className="text-sm text-muted">Score unavailable</p>
            )}
          </div>
        </Card>

        <Card
          title="Why this score?"
          subtitle="Point-in-time factor contributions with provenance"
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

      <Card
        title="Intraday analysis workspace"
        subtitle="15-minute / hourly chart with explicit Yahoo prototype provenance and EOD fallback"
        className="mt-6"
      >
        <IntradayChartPanel symbol={stock.symbol} />
      </Card>

      <Card
        title="EOD price and health history"
        subtitle="Durable official close history with computed health score"
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
        <Card
          title="Multi-horizon model outlook"
          subtitle="Class probabilities, expected range, uncertainty and evidence — educational only"
          className="lg:col-span-2"
        >
          {stock.predictions.length === 0 ? (
            <p className="text-sm text-muted">No predictions generated yet.</p>
          ) : (
            <ul className="space-y-4">
              {stock.predictions.map((p) => (
                <li
                  key={p.id}
                  className="rounded-xl border border-line bg-card-raised/60 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-ink">
                      {HORIZON_LABEL[p.horizon] ?? p.horizon}
                    </p>
                    <DirectionChip direction={p.direction} confidence={p.confidence} />
                  </div>
                  {p.probUp !== null &&
                  p.probSideways !== null &&
                  p.probDown !== null ? (
                    <ProbabilityBar
                      className="mt-3"
                      up={p.probUp}
                      sideways={p.probSideways}
                      down={p.probDown}
                    />
                  ) : null}
                  <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-muted">
                    <span className="num">
                      Expected{" "}
                      {p.expectedReturn === null
                        ? "—"
                        : formatPct(p.expectedReturn * 100)}
                    </span>
                    <span className="num text-right">
                      Range{" "}
                      {p.returnLow === null || p.returnHigh === null
                        ? "—"
                        : `${formatPct(p.returnLow * 100)} to ${formatPct(p.returnHigh * 100)}`}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-muted">
                    Model {p.modelKey} v{p.modelVersion}
                    {p.accuracy !== null
                      ? ` · realized trailing accuracy ${Math.round(p.accuracy * 100)}% (${p.sampleCount ?? 0} outcomes)`
                      : " · insufficient realized outcomes"}
                    {p.insufficientData ? " · confidence capped: thin data" : ""}
                  </p>
                  <ExplainPredictionButton
                    predictionId={p.id}
                    initial={p.explanation}
                  />
                </li>
              ))}
            </ul>
          )}
        </Card>

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

        <Card title="Recent news" subtitle="With evidence-bound sentiment">
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

      {stock.predictions[0] ? (
        <ModelTrustCard
          className="mt-6"
          modelKey={stock.predictions[0].modelKey}
          version={stock.predictions[0].modelVersion}
          kind={stock.predictions[0].modelKind}
          status={stock.predictions[0].modelStatus}
          trainedAt={
            stock.predictions[0].trainedAt
              ? formatDate(stock.predictions[0].trainedAt)
              : null
          }
          validationWindow="Walk-forward outcome tracking"
          sampleCount={stock.predictions[0].sampleCount}
          accuracy={stock.predictions[0].accuracy}
          calibrated={stock.predictions[0].calibrated}
          limitations={[
            "Current ensemble includes an explainable rules model and a shadow nonlinear model, not a production-trained artifact.",
            "Yahoo intraday data is unofficial and can be delayed, rate-limited, or unavailable.",
            "Confidence is a class probability estimate, not a guarantee of correctness.",
          ]}
        />
      ) : null}

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
