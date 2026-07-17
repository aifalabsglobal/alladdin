import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";

export const dynamic = "force-static";

export default function LegalPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Legal & data rights"
        description="Educational use, data provenance limits, and product boundaries."
      />
      <Card title="Educational purpose">
        <p className="text-sm text-muted">
          Alladin provides informational and educational market research tools
          only. Nothing on this site is a recommendation to buy, sell, or hold
          any security or derivative.
        </p>
      </Card>
      <Card title="Data licensing">
        <p className="text-sm text-muted">
          Official NSE bhavcopy is used for durable India cash-equity history.
          Yahoo Finance is an unofficial prototype overlay and is not licensed
          for redistribution. CoinGecko and Frankfurter provide delayed
          aggregates / central-bank reference FX. Twelve Data and Alpha Vantage
          adapters remain inert without keys and are display-gated by
          entitlement flags.
        </p>
      </Card>
      <Card title="Privacy">
        <p className="text-sm text-muted">
          When Clerk is configured, authentication identifiers are used for
          personal watchlists and paper accounts. No brokerage credentials are
          collected.
        </p>
      </Card>
    </div>
  );
}
