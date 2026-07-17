import type { AssetClass, InstrumentTier } from "@prisma/client";
import Link from "next/link";

import { Card } from "@/components/ui/Card";
import { FreshnessBadge } from "@/components/ui/FreshnessBadge";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatMoney, formatPct } from "@/lib/format";
import { getAssetList } from "@/lib/queries/assets";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const CLASSES: AssetClass[] = [
  "EQUITY",
  "ETF",
  "INDEX",
  "FX",
  "CRYPTO",
  "COMMODITY",
  "BOND_PROXY",
  "FUTURE",
];
const TIERS: InstrumentTier[] = ["HOT", "WARM", "COLD"];

function oneOf<T extends string>(value: string | undefined, values: T[]): T | undefined {
  return value && values.includes(value as T) ? (value as T) : undefined;
}

export default async function AssetsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    class?: string;
    tier?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const assetClass = oneOf(params.class, CLASSES);
  const tier = oneOf(params.tier, TIERS);
  const page = Number(params.page) || 1;
  const result = await getAssetList({
    query: params.q,
    assetClass,
    tier,
    page,
  });

  const baseQuery = new URLSearchParams();
  if (params.q) baseQuery.set("q", params.q);
  if (assetClass) baseQuery.set("class", assetClass);
  if (tier) baseQuery.set("tier", tier);
  const pageHref = (next: number) => {
    const query = new URLSearchParams(baseQuery);
    if (next > 1) query.set("page", String(next));
    return `/assets${query.size ? `?${query}` : ""}`;
  };

  return (
    <div>
      <PageHeader
        title="Global assets"
        description={`${result.total} canonical instruments across equities, ETFs, indices, FX, crypto and market proxies.`}
        action={
          <span className="rounded-full border border-warning/40 bg-warning/10 px-3 py-1 text-[11px] text-warning">
            Free-first prototype · coverage varies
          </span>
        }
      />

      <Card className="mb-6">
        <form method="get" action="/assets" className="grid gap-3 md:grid-cols-4">
          <label className="md:col-span-2">
            <span className="mb-1 block text-xs font-medium text-muted">Search</span>
            <input
              name="q"
              type="search"
              defaultValue={params.q ?? ""}
              placeholder="Symbol, name or venue"
              className="w-full rounded-xl border border-line bg-card-raised px-3 py-2 text-sm text-ink"
            />
          </label>
          <label>
            <span className="mb-1 block text-xs font-medium text-muted">Asset class</span>
            <select
              name="class"
              defaultValue={assetClass ?? ""}
              className="w-full rounded-xl border border-line bg-card-raised px-3 py-2 text-sm text-ink"
            >
              <option value="">All classes</option>
              {CLASSES.map((item) => (
                <option key={item} value={item}>
                  {item.replace("_", " ")}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-xs font-medium text-muted">Coverage tier</span>
            <select
              name="tier"
              defaultValue={tier ?? ""}
              className="w-full rounded-xl border border-line bg-card-raised px-3 py-2 text-sm text-ink"
            >
              <option value="">All tiers</option>
              {TIERS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-2 md:col-span-4">
            <button
              type="submit"
              className="rounded-xl bg-positive/15 px-4 py-2 text-sm font-semibold text-positive"
            >
              Apply
            </button>
            <Link
              href="/assets"
              className="rounded-xl bg-card-raised px-4 py-2 text-sm text-muted hover:text-ink"
            >
              Reset
            </Link>
          </div>
        </form>
      </Card>

      <Card>
        <div className="scrollbar-slim overflow-x-auto">
          <table className="w-full min-w-[920px] text-left">
            <caption className="sr-only">
              Global instruments with venue, currency, tier and latest observation
            </caption>
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                <th className="py-2.5 pr-4 font-medium">Instrument</th>
                <th className="py-2.5 pr-4 font-medium">Class / venue</th>
                <th className="py-2.5 pr-4 font-medium">Coverage</th>
                <th className="py-2.5 pr-4 text-right font-medium">Latest</th>
                <th className="py-2.5 pr-4 text-right font-medium">Change</th>
                <th className="py-2.5 font-medium">Data truth</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {result.items.map((asset) => (
                <tr key={asset.id} className="hover:bg-card-raised/50">
                  <td className="py-3 pr-4">
                    <Link
                      href={`/assets/${asset.id}`}
                      className="text-sm font-semibold text-ink hover:text-positive"
                    >
                      {asset.symbol}
                    </Link>
                    <p className="max-w-64 truncate text-xs text-muted">{asset.name}</p>
                  </td>
                  <td className="py-3 pr-4 text-xs text-muted">
                    <span className="block text-ink">{asset.assetClass.replace("_", " ")}</span>
                    {asset.venueCode} · {asset.currency}
                  </td>
                  <td className="py-3 pr-4">
                    <span
                      className={cn(
                        "rounded-full border px-2 py-1 text-[10px] font-semibold",
                        asset.tier === "HOT"
                          ? "border-positive/40 text-positive"
                          : asset.tier === "WARM"
                            ? "border-warning/40 text-warning"
                            : "border-line text-muted",
                      )}
                    >
                      {asset.tier}
                    </span>
                    <span className="ml-2 text-[10px] text-muted">
                      {asset.providerCount} source{asset.providerCount === 1 ? "" : "s"}
                    </span>
                  </td>
                  <td className="num py-3 pr-4 text-right text-sm text-ink">
                    {asset.close === null
                      ? "—"
                      : formatMoney(asset.close, asset.currency)}
                  </td>
                  <td
                    className={cn(
                      "num py-3 pr-4 text-right text-sm font-medium",
                      asset.changePct === null
                        ? "text-muted"
                        : asset.changePct >= 0
                          ? "text-positive"
                          : "text-negative",
                    )}
                  >
                    {asset.changePct === null ? "—" : formatPct(asset.changePct)}
                  </td>
                  <td className="py-3">
                    <FreshnessBadge
                      state={
                        asset.source === "SYNTHETIC"
                          ? "synthetic"
                          : asset.asOf
                            ? "eod"
                            : "unavailable"
                      }
                      title={
                        asset.source
                          ? `Source: ${asset.source}`
                          : "No observation ingested"
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {result.pageCount > 1 ? (
          <nav className="mt-4 flex justify-between border-t border-line pt-4 text-sm">
            <span className="text-xs text-muted">
              Page {result.page} of {result.pageCount}
            </span>
            <div className="flex gap-2">
              {result.page > 1 ? (
                <Link href={pageHref(result.page - 1)} className="rounded-lg px-3 py-1.5 text-muted">
                  Previous
                </Link>
              ) : null}
              {result.page < result.pageCount ? (
                <Link href={pageHref(result.page + 1)} className="rounded-lg bg-positive/15 px-3 py-1.5 text-positive">
                  Next
                </Link>
              ) : null}
            </div>
          </nav>
        ) : null}
      </Card>
    </div>
  );
}
