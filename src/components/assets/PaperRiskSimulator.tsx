"use client";

import { useMemo, useState } from "react";

import { formatMoney } from "@/lib/format";
import { simulatePaperSizing } from "@/lib/risk/sizing";

export function PaperRiskSimulator({
  price,
  currency,
}: {
  price: number;
  currency: string;
}) {
  const [equity, setEquity] = useState(100_000);
  const [riskPct, setRiskPct] = useState(0.5);
  const [stopPct, setStopPct] = useState(2);
  const result = useMemo(
    () =>
      simulatePaperSizing({
        accountEquity: equity,
        maxRiskPct: riskPct,
        entryPrice: price,
        stopDistancePct: stopPct,
      }),
    [equity, price, riskPct, stopPct],
  );

  return (
    <div>
      <p className="mb-4 rounded-xl border border-warning/30 bg-warning/5 p-3 text-xs text-warning">
        Paper simulation only. This is not a position recommendation.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <NumberField label={`Paper equity (${currency})`} value={equity} onChange={setEquity} />
        <NumberField label="Max paper loss (%)" value={riskPct} onChange={setRiskPct} step={0.1} />
        <NumberField label="Invalidation distance (%)" value={stopPct} onChange={setStopPct} step={0.1} />
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <Metric label="Units" value={result.units.toLocaleString()} />
        <Metric label="Notional" value={formatMoney(result.notional, currency)} />
        <Metric label="Risk budget" value={formatMoney(result.riskBudget, currency)} />
        <Metric label="Modeled max loss" value={formatMoney(result.maxLoss, currency)} />
      </dl>
      {result.warnings.length > 0 ? (
        <ul className="mt-3 list-disc pl-5 text-xs text-warning">
          {result.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
}) {
  return (
    <label>
      <span className="mb-1 block text-xs text-muted">{label}</span>
      <input
        type="number"
        min="0"
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value) || 0)}
        className="w-full rounded-xl border border-line bg-card-raised px-3 py-2 text-sm text-ink"
      />
    </label>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line p-3">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="num mt-1 font-semibold text-ink">{value}</dd>
    </div>
  );
}
