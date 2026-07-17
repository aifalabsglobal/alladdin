import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { SyntheticTag } from "@/components/ui/SyntheticTag";
import { formatDate } from "@/lib/format";
import { getInfluencerCatalog } from "@/lib/queries/influencers";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const CATEGORY_LABEL: Record<string, string> = {
  TECHNICAL: "Technical",
  FUNDAMENTAL: "Fundamental",
  SENTIMENT: "Sentiment",
  FLOW: "Institutional flows",
  MACRO: "Macro",
};

const SCOPE_LABEL: Record<string, string> = {
  STOCK: "Per stock",
  SECTOR: "Per sector",
  MARKET: "Market-wide",
};

export default async function InfluencersPage() {
  const { asOf, items } = await getInfluencerCatalog();

  const categories = [...new Set(items.map((i) => i.category))];

  return (
    <div>
      <PageHeader
        title="Influencer Explorer"
        description="Every factor that feeds the health score, what it measures, and its latest market reading."
        action={<SyntheticTag label="Computed from real NSE data" asOf={asOf ? formatDate(asOf) : undefined} />}
      />

      <div className="space-y-8">
        {categories.map((category) => (
          <section key={category} aria-label={CATEGORY_LABEL[category] ?? category}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
              {CATEGORY_LABEL[category] ?? category}
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {items
                .filter((i) => i.category === category)
                .map((inf) => (
                  <Card key={inf.key}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-ink">{inf.name}</p>
                        <p className="mt-0.5 text-[11px] text-muted">
                          {SCOPE_LABEL[inf.scope] ?? inf.scope} · weight{" "}
                          <span className="num">{Math.round(inf.weight * 100)}%</span>
                        </p>
                      </div>
                      {inf.avgImpact !== null ? (
                        <span
                          className={cn(
                            "num rounded-full px-2.5 py-1 text-xs font-semibold",
                            inf.avgImpact >= 0
                              ? "bg-positive/12 text-positive"
                              : "bg-negative/12 text-negative",
                          )}
                        >
                          {inf.avgImpact >= 0 ? "+" : ""}
                          {inf.avgImpact.toFixed(1)} pts avg
                        </span>
                      ) : (
                        <span className="text-xs text-muted">No reading</span>
                      )}
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-muted">
                      {inf.description}
                    </p>
                    <div className="mt-3 space-y-1.5 border-t border-line pt-3 text-xs">
                      {inf.strongestPositive ? (
                        <p className="text-muted">
                          <span className="font-semibold text-positive">
                            {inf.strongestPositive.symbol}
                          </span>{" "}
                          — {inf.strongestPositive.reasonText}
                        </p>
                      ) : null}
                      {inf.strongestNegative ? (
                        <p className="text-muted">
                          <span className="font-semibold text-negative">
                            {inf.strongestNegative.symbol}
                          </span>{" "}
                          — {inf.strongestNegative.reasonText}
                        </p>
                      ) : null}
                      {!inf.strongestPositive && !inf.strongestNegative ? (
                        <p className="text-muted">No notable readings today.</p>
                      ) : null}
                    </div>
                  </Card>
                ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
