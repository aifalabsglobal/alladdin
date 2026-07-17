import "server-only";

import { prisma } from "@/lib/db";
import { getCalibrationSummary } from "@/lib/queries/calibration";

export type AlertSeverity = "info" | "warning" | "critical";

export type OperationalAlert = {
  id: string;
  severity: AlertSeverity;
  category: "data" | "model" | "regime" | "ops";
  title: string;
  detail: string;
  at: string | null;
};

/** VIX level above this flags a stressed volatility regime. */
const VIX_STRESS = 22;
/** Single-session index move (abs %) that flags a regime shift. */
const INDEX_SHOCK_PCT = 2.5;

export async function getOperationalAlerts(): Promise<OperationalAlert[]> {
  const since = new Date(Date.now() - 48 * 3_600_000);
  const alerts: OperationalAlert[] = [];

  const [failedRuns, budgets, vix, indexMovers, calibration] = await Promise.all([
    prisma.ingestionRun.findMany({
      where: { status: "FAILED", startedAt: { gte: since } },
      orderBy: { startedAt: "desc" },
      take: 5,
    }),
    prisma.providerBudgetUsage.findMany({
      where: { date: { gte: new Date(Date.now() - 24 * 3_600_000) } },
    }),
    prisma.instrument.findFirst({
      where: { symbol: "VIX", assetClass: "INDEX" },
      include: { quotes: { orderBy: { observedAt: "desc" }, take: 1 } },
    }),
    prisma.instrumentQuote.findMany({
      where: {
        instrument: { assetClass: "INDEX" },
        changePct24h: { not: null },
      },
      include: { instrument: true },
      orderBy: { observedAt: "desc" },
      take: 40,
    }),
    getCalibrationSummary(),
  ]);

  for (const run of failedRuns) {
    alerts.push({
      id: `ingest-${run.id}`,
      severity: "critical",
      category: "ops",
      title: `Ingestion failed: ${run.adapter}`,
      detail: run.errorMessage ?? "The ingestion job reported a failure.",
      at: run.startedAt.toISOString(),
    });
  }

  for (const budget of budgets) {
    if (budget.failures > 0) {
      const meta = budget.metadata as { lastError?: string } | null;
      alerts.push({
        id: `budget-${budget.provider}-${budget.id}`,
        severity: budget.failures >= 3 ? "critical" : "warning",
        category: "data",
        title: `Provider degraded: ${budget.provider}`,
        detail: `${budget.failures} failure(s) today. ${meta?.lastError ?? ""}`.trim(),
        at: budget.updatedAt.toISOString(),
      });
    }
  }

  const vixQuote = vix?.quotes[0];
  if (vixQuote && vixQuote.price >= VIX_STRESS) {
    alerts.push({
      id: `regime-vix-${vixQuote.id}`,
      severity: vixQuote.price >= VIX_STRESS + 8 ? "critical" : "warning",
      category: "regime",
      title: `Elevated volatility regime (VIX ${vixQuote.price.toFixed(1)})`,
      detail:
        "Directional edges shrink and stops widen in stressed regimes. The gate is stricter here.",
      at: vixQuote.observedAt.toISOString(),
    });
  }

  const shock = indexMovers.find(
    (quote) => Math.abs(quote.changePct24h ?? 0) >= INDEX_SHOCK_PCT,
  );
  if (shock) {
    const move = shock.changePct24h ?? 0;
    alerts.push({
      id: `regime-index-${shock.id}`,
      severity: "warning",
      category: "regime",
      title: `Index shock: ${shock.instrument.symbol} ${move >= 0 ? "+" : ""}${move.toFixed(2)}%`,
      detail: "A large single-session index move can signal a regime change.",
      at: shock.observedAt.toISOString(),
    });
  }

  if (calibration.abstention.assessed > 0 && calibration.abstention.rate >= 0.9) {
    alerts.push({
      id: "model-standaside",
      severity: "info",
      category: "model",
      title: `Signals held back (${Math.round(calibration.abstention.rate * 100)}% stand-aside)`,
      detail:
        "The model is not yet calibrated on enough matured outcomes, so directional signals are suppressed by design.",
      at: calibration.latestRunAt,
    });
  }

  const order: Record<AlertSeverity, number> = {
    critical: 0,
    warning: 1,
    info: 2,
  };
  return alerts.sort((a, b) => order[a.severity] - order[b.severity]);
}
