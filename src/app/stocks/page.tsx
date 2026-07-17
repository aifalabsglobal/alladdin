import type { HealthBand } from "@prisma/client";
import Link from "next/link";

import { Sparkline } from "@/components/charts/Sparkline";
import { Card } from "@/components/ui/Card";
import { HealthBadge } from "@/components/ui/HealthBadge";
import { PageHeader } from "@/components/ui/PageHeader";
import { SyntheticTag } from "@/components/ui/SyntheticTag";
import { formatInr, formatPct } from "@/lib/format";
import { getSectorSummaries } from "@/lib/queries/sectors";
import { getStockList } from "@/lib/queries/stocks";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const BANDS: HealthBand[] = ["STRONG", "HEALTHY", "NEUTRAL", "WEAK", "CRITICAL"];

function isBand(value: string | undefined): value is HealthBand {
  return Boolean(value && (BANDS as string[]).includes(value));
}

export default async function StocksPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sector?: string; band?: string; page?: string }>;
}) {
  const params = await searchParams;
  const band = isBand(params.band) ? params.band : undefined;
  const page = Number(params.page) || 1;

  const [result, sectors] = await Promise.all([
    getStockList({
      query: params.q,
      sectorId: params.sector,
      band,
      page,
    }),
    getSectorSummaries(),
  ]);

  const baseQuery = new URLSearchParams();
  if (params.q) baseQuery.set("q", params.q);
  if (params.sector) baseQuery.set("sector", params.sector);
  if (params.band) baseQuery.set("band", params.band);

  const pageHref = (p: number) => {
    const qp = new URLSearchParams(baseQuery);
    if (p > 1) qp.set("page", String(p));
    const s = qp.toString();
    return `/stocks${s ? `?${s}` : ""}`;
  };

  return (
    <div>
      <PageHeader
        title="All Stocks"
        description={`${result.total} active NSE/BSE listings with latest health scores.`}
        action={<SyntheticTag />}
      />

      {/* Filters */}
      <Card className="mb-6">
        <form method="get" action="/stocks" className="grid gap-3 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <label htmlFor="q" className="mb-1 block text-xs font-medium text-muted">
              Search
            </label>
            <input
              id="q"
              name="q"
              type="search"
              defaultValue={params.q ?? ""}
              placeholder="Symbol or company name"
              className="w-full rounded-xl border border-line bg-card-raised px-3 py-2 text-sm text-ink placeholder:text-muted"
            />
          </div>
          <div>
            <label htmlFor="sector" className="mb-1 block text-xs font-medium text-muted">
              Sector
            </label>
            <select
              id="sector"
              name="sector"
              defaultValue={params.sector ?? ""}
              className="w-full rounded-xl border border-line bg-card-raised px-3 py-2 text-sm text-ink"
            >
              <option value="">All sectors</option>
              {sectors.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="band" className="mb-1 block text-xs font-medium text-muted">
              Health band
            </label>
            <select
              id="band"
              name="band"
              defaultValue={params.band ?? ""}
              className="w-full rounded-xl border border-line bg-card-raised px-3 py-2 text-sm text-ink"
            >
              <option value="">All bands</option>
              {BANDS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-2 sm:col-span-4">
            <button
              type="submit"
              className="rounded-xl bg-positive/15 px-4 py-2 text-sm font-semibold text-positive transition hover:bg-positive/25"
            >
              Apply filters
            </button>
            <Link
              href="/stocks"
              className="rounded-xl bg-card-raised px-4 py-2 text-sm text-muted hover:text-ink"
            >
              Reset
            </Link>
          </div>
        </form>
      </Card>

      {/* Table */}
      <Card>
        <div className="scrollbar-slim overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <caption className="sr-only">
              Stocks with latest price, health score, and leading influencer
            </caption>
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                <th scope="col" className="py-2.5 pr-4 font-medium">Stock</th>
                <th scope="col" className="py-2.5 pr-4 font-medium">Sector</th>
                <th scope="col" className="py-2.5 pr-4 text-right font-medium">Price</th>
                <th scope="col" className="py-2.5 pr-4 text-right font-medium">Day</th>
                <th scope="col" className="py-2.5 pr-4 font-medium">Health</th>
                <th scope="col" className="py-2.5 pr-4 font-medium">30-day trend</th>
                <th scope="col" className="py-2.5 font-medium">Top influencer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {result.items.map((s) => (
                <tr key={s.symbol} className="transition hover:bg-card-raised/50">
                  <td className="py-3 pr-4">
                    <Link
                      href={`/stocks/${s.symbol}`}
                      className="text-sm font-semibold text-ink hover:text-positive"
                    >
                      {s.symbol}
                    </Link>
                    <p className="max-w-48 truncate text-xs text-muted">{s.name}</p>
                  </td>
                  <td className="py-3 pr-4 text-xs text-muted">{s.sectorName}</td>
                  <td className="num py-3 pr-4 text-right text-sm text-ink">
                    {s.close === null ? "—" : formatInr(s.close)}
                  </td>
                  <td
                    className={cn(
                      "num py-3 pr-4 text-right text-sm font-medium",
                      s.changePct === null
                        ? "text-muted"
                        : s.changePct >= 0
                          ? "text-positive"
                          : "text-negative",
                    )}
                  >
                    {s.changePct === null ? "—" : formatPct(s.changePct)}
                  </td>
                  <td className="py-3 pr-4">
                    {s.score !== null && s.band ? (
                      <HealthBadge score={s.score} band={s.band} />
                    ) : (
                      <span className="text-xs text-muted">Unavailable</span>
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    {s.healthSeries.length > 1 ? (
                      <Sparkline
                        data={s.healthSeries}
                        positive={
                          (s.healthSeries[s.healthSeries.length - 1] ?? 0) >=
                          (s.healthSeries[0] ?? 0)
                        }
                        label={`${s.symbol} 30-day health trend`}
                      />
                    ) : (
                      <span className="text-xs text-muted">—</span>
                    )}
                  </td>
                  <td className="py-3 text-xs text-muted">
                    {s.topInfluencer ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {result.pageCount > 1 ? (
          <nav
            aria-label="Pagination"
            className="mt-4 flex items-center justify-between border-t border-line pt-4 text-sm"
          >
            <span className="text-xs text-muted">
              Page {result.page} of {result.pageCount}
            </span>
            <div className="flex gap-2">
              {result.page > 1 ? (
                <Link
                  href={pageHref(result.page - 1)}
                  className="rounded-lg bg-card-raised px-3 py-1.5 text-muted hover:text-ink"
                >
                  Previous
                </Link>
              ) : null}
              {result.page < result.pageCount ? (
                <Link
                  href={pageHref(result.page + 1)}
                  className="rounded-lg bg-positive/15 px-3 py-1.5 font-medium text-positive"
                >
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
