"use client";

import { useState } from "react";

import { Card } from "@/components/ui/Card";

type Explanation = {
  summary: string;
  bullishDrivers: string[];
  bearishDrivers: string[];
  risks: string[];
  caveats: string[];
  model: string;
  promptVersion: string;
};

export function AiExplanationPanel({
  predictionId,
  initial,
}: {
  predictionId: string | null;
  initial?: Explanation | null;
}) {
  const [explanation, setExplanation] = useState<Explanation | null>(
    initial ?? null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(force = false) {
    if (!predictionId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ predictionId, force }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to explain");
      setExplanation(data.explanation);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card
      title="AI narrative"
      subtitle="Explains stored model evidence only — never invents prices or advice"
      action={
        <button
          type="button"
          disabled={!predictionId || loading}
          onClick={() => void load(Boolean(explanation))}
          className="rounded-lg border border-line px-2.5 py-1 text-xs text-ink hover:border-ai/50 disabled:opacity-50"
        >
          {loading ? "Generating…" : explanation ? "Refresh" : "Generate"}
        </button>
      }
    >
      {!predictionId ? (
        <p className="text-sm text-muted">No prediction available to explain.</p>
      ) : error ? (
        <p className="text-sm text-negative">{error}</p>
      ) : !explanation ? (
        <p className="text-sm text-muted">
          Generate an educational narrative grounded in the ensemble drivers and
          probabilities.
        </p>
      ) : (
        <div className="space-y-3 text-sm">
          <p className="leading-relaxed text-ink">{explanation.summary}</p>
          <DriverList title="Bullish evidence" items={explanation.bullishDrivers} />
          <DriverList title="Bearish evidence" items={explanation.bearishDrivers} />
          <DriverList title="Risks" items={explanation.risks} />
          <DriverList title="Caveats" items={explanation.caveats} />
          <p className="text-[11px] text-muted">
            {explanation.model} · prompt {explanation.promptVersion}
          </p>
        </div>
      )}
    </Card>
  );
}

function DriverList({ title, items }: { title: string; items: string[] }) {
  if (!items?.length) return null;
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
        {title}
      </p>
      <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-muted">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
