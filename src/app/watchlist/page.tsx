import Link from "next/link";

import { LivePriceCell } from "@/components/stocks/LivePriceCell";
import { Card } from "@/components/ui/Card";
import { HealthBadge } from "@/components/ui/HealthBadge";
import { PageHeader } from "@/components/ui/PageHeader";
import { SyntheticTag } from "@/components/ui/SyntheticTag";
import { getDemoWatchlist } from "@/lib/queries/watchlist";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function WatchlistPage() {
  const cards = await getDemoWatchlist();

  return (
    <div>
      <PageHeader
        title="Watchlist"
        description="Demo preview using seeded stocks. Sign-in with per-user watchlists arrives in a later phase."
        action={<SyntheticTag label="Computed from real NSE data" />}
      />

      <div className="mb-6 rounded-2xl border border-ai/30 bg-ai/10 px-4 py-3 text-sm text-ink">
        <p className="font-medium">Demo watchlist</p>
        <p className="mt-0.5 text-xs text-muted">
          These are sample seeded stocks, sorted by health-score change. Personal
          watchlists with add/remove will unlock once authentication is enabled.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.symbol} href={`/stocks/${c.symbol}`}>
            <Card className="h-full transition hover:border-positive/40">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">{c.symbol}</p>
                  <p className="truncate text-xs text-muted">{c.name}</p>
                  <p className="mt-0.5 text-[11px] text-muted">{c.sectorName}</p>
                </div>
                {c.score !== null && c.band ? (
                  <HealthBadge score={c.score} band={c.band} />
                ) : null}
              </div>
              <div className="mt-4 flex items-end justify-between gap-3">
                <LivePriceCell
                  symbol={c.symbol}
                  eodClose={c.close}
                  eodChangePct={c.changePct}
                  compact
                />
                <div className="text-right">
                  {c.scoreChange !== null ? (
                    <p
                      className={cn(
                        "num text-xs",
                        c.scoreChange >= 0 ? "text-positive" : "text-negative",
                      )}
                    >
                      health {c.scoreChange >= 0 ? "+" : ""}
                      {c.scoreChange.toFixed(1)} pts
                    </p>
                  ) : null}
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
