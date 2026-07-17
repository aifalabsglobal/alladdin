import Link from "next/link";

import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { getCurrentUserId, isClerkEnabled } from "@/lib/auth";
import { formatMoney } from "@/lib/format";
import { getPaperPortfolio } from "@/lib/paper/trading";
import { submitPaperOrder } from "@/app/paper/actions";

export const dynamic = "force-dynamic";

export default async function PaperPage() {
  const authEnabled = isClerkEnabled();
  const userId = authEnabled ? await getCurrentUserId() : null;

  if (!userId) {
    return (
      <div>
        <PageHeader
          title="Paper portfolio"
          description="Simulated fills for education. Sign in to open a paper account."
        />
        <Card>
          <p className="text-sm text-muted">
            {authEnabled
              ? "Sign in from the header to create a $100,000 paper account."
              : "Configure Clerk keys to enable paper trading."}
          </p>
        </Card>
      </div>
    );
  }

  const portfolio = await getPaperPortfolio(userId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Paper portfolio"
        description="Immediate market fills at the mark you supply. Fees assumed at 10 bps. Not a broker."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card title="Cash">
          <p className="num text-2xl font-semibold text-ink">
            {formatMoney(portfolio.account.cash, portfolio.account.currency)}
          </p>
        </Card>
        <Card title="Equity (mark)">
          <p className="num text-2xl font-semibold text-ink">
            {formatMoney(portfolio.account.equityMark, portfolio.account.currency)}
          </p>
        </Card>
        <Card title="Unrealized P&L">
          <p className="num text-2xl font-semibold text-ink">
            {formatMoney(portfolio.account.unrealized, portfolio.account.currency)}
          </p>
        </Card>
      </div>

      <Card title="Place market order">
        <form action={submitPaperOrder} className="grid gap-3 sm:grid-cols-5">
          <input
            name="symbol"
            placeholder="SYMBOL"
            required
            className="rounded-xl border border-line bg-card px-3 py-2 text-sm text-ink"
          />
          <select
            name="side"
            className="rounded-xl border border-line bg-card px-3 py-2 text-sm text-ink"
            defaultValue="BUY"
          >
            <option value="BUY">Buy</option>
            <option value="SELL">Sell</option>
          </select>
          <input
            name="quantity"
            type="number"
            step="any"
            min="0"
            placeholder="Qty"
            required
            className="rounded-xl border border-line bg-card px-3 py-2 text-sm text-ink"
          />
          <input
            name="markPrice"
            type="number"
            step="any"
            min="0"
            placeholder="Mark price"
            required
            className="rounded-xl border border-line bg-card px-3 py-2 text-sm text-ink"
          />
          <button
            type="submit"
            className="rounded-xl bg-positive/15 px-4 py-2 text-sm font-semibold text-positive"
          >
            Fill
          </button>
        </form>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Positions">
          {portfolio.positions.length === 0 ? (
            <p className="text-sm text-muted">No open positions.</p>
          ) : (
            <ul className="divide-y divide-line">
              {portfolio.positions.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                  <Link href={`/assets?q=${p.symbol}`} className="font-semibold text-ink">
                    {p.symbol}
                  </Link>
                  <span className="num text-muted">
                    {p.quantity} @ {formatMoney(p.avgCost, portfolio.account.currency)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Recent orders">
          {portfolio.orders.length === 0 ? (
            <p className="text-sm text-muted">No orders yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {portfolio.orders.map((o) => (
                <li key={o.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-ink">
                    {o.side} {o.symbol}
                  </span>
                  <span className="num text-muted">{o.status}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
