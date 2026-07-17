import Link from "next/link";

import { LivePriceCell } from "@/components/stocks/LivePriceCell";
import { Card } from "@/components/ui/Card";
import { HealthBadge } from "@/components/ui/HealthBadge";
import { PageHeader } from "@/components/ui/PageHeader";
import { SyntheticTag } from "@/components/ui/SyntheticTag";
import { getCurrentUserId, isClerkEnabled } from "@/lib/auth";
import type { WatchlistCard } from "@/lib/queries/watchlist";
import { getDemoWatchlist } from "@/lib/queries/watchlist";
import { getUserWatchlist } from "@/lib/queries/userWatchlist";
import { cn } from "@/lib/utils";

import { addWatchlistItem, removeWatchlistItem } from "./actions";

export const dynamic = "force-dynamic";

export default async function WatchlistPage() {
  const authEnabled = isClerkEnabled();
  const userId = authEnabled ? await getCurrentUserId() : null;
  const personal = Boolean(userId);
  const cards: WatchlistCard[] = userId
    ? await getUserWatchlist(userId)
    : await getDemoWatchlist();

  return (
    <div>
      <PageHeader
        title="Watchlist"
        description={
          personal
            ? "Your personal watchlist. Add NSE/BSE symbols and track their health-score movement."
            : "Demo preview using seeded stocks. Sign in to create a personal watchlist."
        }
        action={<SyntheticTag label="Computed from real NSE data" />}
      />

      {personal ? (
        <Card className="mb-6" title="Add a symbol">
          <form action={addWatchlistItem} className="flex flex-wrap gap-2">
            <input
              name="symbol"
              placeholder="e.g. RELIANCE"
              aria-label="Stock symbol"
              className="flex-1 rounded-xl border border-line bg-card px-3 py-2 text-sm text-ink outline-none focus-visible:border-positive"
            />
            <button
              type="submit"
              className="rounded-xl bg-positive/15 px-4 py-2 text-sm font-semibold text-positive transition hover:bg-positive/25"
            >
              Add
            </button>
          </form>
          <p className="mt-2 text-[11px] text-muted">
            Symbols must exist in the equity universe. Unknown symbols are ignored.
          </p>
        </Card>
      ) : (
        <div className="mb-6 rounded-2xl border border-ai/30 bg-ai/10 px-4 py-3 text-sm text-ink">
          <p className="font-medium">
            {authEnabled ? "Demo watchlist" : "Demo watchlist (auth disabled)"}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            {authEnabled
              ? "These are sample seeded stocks. Sign in from the sidebar to build your own watchlist with add/remove."
              : "These are sample seeded stocks, sorted by health-score change. Configure Clerk keys to enable personal watchlists."}
          </p>
        </div>
      )}

      {cards.length === 0 ? (
        <p className="text-sm text-muted">
          Your watchlist is empty. Add a symbol above to start tracking it.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <Card key={c.symbol} className="h-full transition hover:border-positive/40">
              <div className="flex items-start justify-between gap-3">
                <Link href={`/stocks/${c.symbol}`} className="min-w-0">
                  <p className="text-sm font-semibold text-ink">{c.symbol}</p>
                  <p className="truncate text-xs text-muted">{c.name}</p>
                  <p className="mt-0.5 text-[11px] text-muted">{c.sectorName}</p>
                </Link>
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
              {personal ? (
                <form action={removeWatchlistItem} className="mt-3">
                  <input type="hidden" name="symbol" value={c.symbol} />
                  <button
                    type="submit"
                    className="text-[11px] text-muted underline-offset-2 hover:text-negative hover:underline"
                  >
                    Remove
                  </button>
                </form>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
