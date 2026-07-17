import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";

export const dynamic = "force-static";

export default function MethodologyPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Methodology"
        description="How Alladin scores health, forms probabilities, calibrates confidence, and decides to stand aside."
      />
      <Card title="Health score">
        <p className="text-sm text-muted">
          Composite 0–100 from eleven influencers. Each factor contributes
          impact = normalizedScore × weight ÷ 2 from a neutral base of 50.
          Missing inputs use explicit low-quality fallbacks — never invented
          values.
        </p>
      </Card>
      <Card title="Directional research">
        <p className="text-sm text-muted">
          Ensemble of explainable rules and a nonlinear shadow voice across M15,
          H1, EOD, D1, W1 and M1. A logistic shadow model is trained
          chronologically and kept SHADOW until it beats baseline and the active
          ensemble out of sample. Confidence is recalibrated from matured
          outcomes when enough samples exist.
        </p>
      </Card>
      <Card title="Decision gate">
        <p className="text-sm text-muted">
          Signals default to STAND ASIDE on stale/degraded data, uncalibrated
          confidence, thin samples, model conflict, sideways direction, or
          non-positive after-cost expected value. This is intentional.
        </p>
      </Card>
      <Card title="Not investment advice">
        <p className="text-sm text-muted">
          Alladin is educational research software. It is not SEBI-registered
          investment advice and does not place real orders.
        </p>
      </Card>
    </div>
  );
}
