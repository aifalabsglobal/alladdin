export type PaperSizingInput = {
  accountEquity: number;
  maxRiskPct: number;
  entryPrice: number;
  stopDistancePct: number;
  winProbability?: number;
  payoffRatio?: number;
};

export type PaperSizingResult = {
  units: number;
  notional: number;
  maxLoss: number;
  riskBudget: number;
  fractionalKelly: number | null;
  warnings: string[];
};

export function simulatePaperSizing(input: PaperSizingInput): PaperSizingResult {
  const warnings: string[] = [];
  const equity = Math.max(0, input.accountEquity);
  const riskPct = Math.max(0, Math.min(5, input.maxRiskPct));
  const entry = Math.max(0, input.entryPrice);
  const stopPct = Math.max(0, input.stopDistancePct);
  const riskBudget = equity * (riskPct / 100);
  const riskPerUnit = entry * (stopPct / 100);
  let units = riskPerUnit > 0 ? Math.floor(riskBudget / riskPerUnit) : 0;

  let fractionalKelly: number | null = null;
  if (
    input.winProbability !== undefined &&
    input.payoffRatio !== undefined &&
    input.payoffRatio > 0
  ) {
    const probability = Math.max(0, Math.min(1, input.winProbability));
    const fullKelly =
      probability - (1 - probability) / Math.max(input.payoffRatio, 0.0001);
    fractionalKelly = Math.max(0, Math.min(0.25, fullKelly * 0.25));
    const kellyUnits = Math.floor((equity * fractionalKelly) / Math.max(entry, 1e-9));
    units = Math.min(units, kellyUnits);
    if (fullKelly <= 0) warnings.push("No positive Kelly edge; paper size reduced to zero.");
  }

  const notional = units * entry;
  const maxLoss = units * riskPerUnit;
  if (riskPct > 1) warnings.push("Paper risk above 1% per idea can compound drawdowns.");
  if (stopPct === 0) warnings.push("A non-zero invalidation distance is required.");
  if (notional > equity) warnings.push("Notional exceeds paper equity; leverage is implied.");

  return {
    units,
    notional,
    maxLoss,
    riskBudget,
    fractionalKelly,
    warnings,
  };
}
