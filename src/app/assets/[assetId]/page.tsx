import Link from "next/link";
import { notFound } from "next/navigation";

import { PaperRiskSimulator } from "@/components/assets/PaperRiskSimulator";
import { CandleChart } from "@/components/charts/CandleChart";
import { Card } from "@/components/ui/Card";
import { DirectionChip } from "@/components/ui/DirectionChip";
import { FreshnessBadge } from "@/components/ui/FreshnessBadge";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProbabilityBar } from "@/components/ui/ProbabilityBar";
import {
  assessDecisionSupport,
  transactionCostAssumption,
} from "@/lib/decision/support";
import { formatDate, formatMoney, formatPct } from "@/lib/format";
import { marketSessionState } from "@/lib/live/freshness";
import { getAssetDetail } from "@/lib/queries/assets";

export const dynamic = "force-dynamic";

export default async function AssetDetailPage({
  params,
}: {
  params: Promise<{ assetId: string }>;
}) {
  const { assetId } = await params;
  const asset = await getAssetDetail(decodeURIComponent(assetId));
  if (!asset) notFound();

  const latestQuote = asset.quotes[0];
  const latestGeneric = asset.bars[0];
  const latestLegacy = asset.stock?.priceBars[0];
  const latest =
    latestQuote?.price ?? latestGeneric?.close ?? latestLegacy?.close ?? null;
  const asOf =
    latestQuote?.observedAt ?? latestGeneric?.openTime ?? latestLegacy?.date ?? null;
  const session = asset.venue
    ? marketSessionState({
        timezone: asset.venue.timezone,
        sessionType: asset.venue.sessionType,
        openMinute: asset.venue.openMinute,
        closeMinute: asset.venue.closeMinute,
        weekMask: asset.venue.weekMask,
      })
    : "unknown";

  const candles =
    asset.bars.length > 0
      ? [...asset.bars].reverse().map((bar) => ({
          openTime: bar.openTime.toISOString(),
          open: bar.open,
          high: bar.high,
          low: bar.low,
          close: bar.close,
          volume: bar.volume ?? 0,
        }))
      : [...(asset.stock?.priceBars ?? [])].reverse().map((bar) => ({
          openTime: bar.date.toISOString(),
          open: bar.open,
          high: bar.high,
          low: bar.low,
          close: bar.close,
          volume: bar.volume,
        }));

  const predictions = asset.stock?.predictions ?? [];
  const currentFreshness =
    latestQuote?.quality === "STALE"
      ? "stale"
      : latestQuote
        ? "delayed"
        : latestGeneric?.quality === "SYNTHETIC"
          ? "synthetic"
          : asOf
            ? "eod"
            : "unavailable";

  return (
    <div>
      <PageHeader
        title={`${asset.symbol} · ${asset.name}`}
        description={`${asset.assetClass.replace("_", " ")} · ${asset.venue?.code ?? "OTC"} · ${asset.quoteCurrency} · ${asset.tier} coverage`}
        action={
          <FreshnessBadge
            state={
              !asOf
                ? "unavailable"
                : latestQuote
                  ? latestQuote.quality === "STALE"
                    ? "stale"
                    : "delayed"
                  : latestGeneric?.quality === "SYNTHETIC"
                    ? "synthetic"
                    : "eod"
            }
            asOf={asOf ? formatDate(asOf) : undefined}
            title={
              latestGeneric
                ? `Provider: ${latestGeneric.provider}; quality: ${latestGeneric.quality}`
                : latestQuote
                  ? `Provider: ${latestQuote.provider}; quality: ${latestQuote.quality}`
                : latestLegacy
                  ? `Legacy source: ${latestLegacy.dataSource}`
                  : "No observation ingested"
            }
          />
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card title="Latest observation">
          <p className="num text-2xl font-semibold text-ink">
            {latest === null ? "Unavailable" : formatMoney(latest, asset.quoteCurrency)}
          </p>
          <p className="mt-2 text-xs text-muted">
            Research display only; source rights and delay vary.
          </p>
        </Card>
        <Card title="Session">
          <p className="text-xl font-semibold capitalize text-ink">{session}</p>
          <p className="mt-2 text-xs text-muted">
            {asset.venue?.timezone ?? "Timezone unavailable"} ·{" "}
            {asset.venue?.sessionType.replaceAll("_", " ") ?? "Unknown schedule"}
          </p>
        </Card>
        <Card title="Provider coverage">
          <p className="text-xl font-semibold text-ink">
            {asset.providerMappings.length} mapped
          </p>
          <p className="mt-2 text-xs text-muted">
            {asset.providerMappings.map((mapping) => mapping.provider).join(" · ") ||
              "No provider mapping"}
          </p>
        </Card>
        <Card title="Decision state">
          <p className="text-xl font-semibold text-warning">Stand aside</p>
          <p className="mt-2 text-xs text-muted">
            Until a calibrated, fresh, after-cost-positive signal is available.
          </p>
        </Card>
      </div>

      <Card
        title="Market history"
        subtitle="Observed OHLCV only; unavailable intervals remain unavailable"
      >
        <CandleChart candles={candles} />
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card
          title="Model outlook"
          subtitle="Research probabilities; never an instruction"
          className="lg:col-span-2"
        >
          {predictions.length === 0 ? (
            <div className="rounded-xl border border-warning/30 bg-warning/5 p-4">
              <p className="font-semibold text-warning">No validated signal</p>
              <p className="mt-1 text-sm text-muted">
                Alladin abstains when this asset lacks a compatible calibrated model.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {predictions.map((prediction) => {
                const metrics =
                  prediction.mlModel.metrics &&
                  typeof prediction.mlModel.metrics === "object" &&
                  !Array.isArray(prediction.mlModel.metrics)
                    ? (prediction.mlModel.metrics as Record<string, unknown>)
                    : {};
                const samples =
                  metrics.samples &&
                  typeof metrics.samples === "object" &&
                  !Array.isArray(metrics.samples)
                    ? Number(
                        (metrics.samples as Record<string, unknown>)[
                          prediction.horizon
                        ] ?? 0,
                      )
                    : 0;
                const decision = assessDecisionSupport({
                  direction: prediction.direction,
                  horizon: prediction.horizon,
                  confidence: prediction.confidence,
                  calibrated: prediction.calibrated,
                  expectedReturn: prediction.expectedReturn,
                  freshness: currentFreshness,
                  dataCompleteness: prediction.insufficientData ? 0.5 : 1,
                  sampleCount: Number.isFinite(samples) ? samples : 0,
                  transactionCostRate: transactionCostAssumption(asset.assetClass),
                });
                return (
                <li key={prediction.id} className="rounded-xl border border-line p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-ink">{prediction.horizon}</p>
                    <DirectionChip
                      direction={prediction.direction}
                      confidence={prediction.confidence}
                    />
                  </div>
                  {prediction.probUp !== null &&
                  prediction.probSideways !== null &&
                  prediction.probDown !== null ? (
                    <ProbabilityBar
                      className="mt-3"
                      up={prediction.probUp}
                      sideways={prediction.probSideways}
                      down={prediction.probDown}
                    />
                  ) : null}
                  <p className="mt-2 text-xs text-muted">
                    {prediction.calibrated ? "Calibrated" : "Uncalibrated"} ·{" "}
                    {prediction.expectedReturn === null
                      ? "After-cost EV unavailable"
                      : `Pre-cost expected return ${formatPct(prediction.expectedReturn * 100)}`}{" "}
                    · {prediction.mlModel.key} v{prediction.mlModel.version}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span
                      className={
                        decision.state === "STAND_ASIDE"
                          ? "rounded-full border border-warning/40 bg-warning/10 px-2 py-1 text-[10px] font-semibold text-warning"
                          : "rounded-full border border-positive/40 bg-positive/10 px-2 py-1 text-[10px] font-semibold text-positive"
                      }
                    >
                      {decision.state.replace("_", " ")}
                    </span>
                    {decision.reasons.slice(0, 3).map((reason) => (
                      <span
                        key={reason}
                        className="rounded-full border border-line px-2 py-1 text-[10px] text-muted"
                      >
                        {reason.replaceAll("_", " ")}
                      </span>
                    ))}
                  </div>
                </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card title="Data provenance" subtitle="Capability does not imply display rights">
          <ul className="space-y-3">
            {asset.providerMappings.map((mapping) => (
              <li key={mapping.id} className="rounded-xl border border-line p-3">
                <p className="text-sm font-semibold text-ink">{mapping.provider}</p>
                <p className="text-xs text-muted">{mapping.providerSymbol}</p>
                <p className="mt-1 text-[11px] text-muted">
                  {mapping.capabilities.join(" · ")} ·{" "}
                  {mapping.displayAllowed ? "display allowed" : "prototype/internal only"}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {asset.stock ? (
        <Card className="mt-6" title="India equity compatibility">
          <p className="text-sm text-muted">
            This canonical asset is linked to the existing equity health workspace.
          </p>
          <Link
            href={`/stocks/${asset.stock.symbol}`}
            className="mt-3 inline-flex rounded-xl bg-positive/15 px-4 py-2 text-sm font-semibold text-positive"
          >
            Open full equity analysis
          </Link>
        </Card>
      ) : null}

      {latest !== null ? (
        <Card
          className="mt-6"
          title="Paper risk simulator"
          subtitle="User-supplied constraints; no real order placement"
        >
          <PaperRiskSimulator price={latest} currency={asset.quoteCurrency} />
        </Card>
      ) : null}
    </div>
  );
}
