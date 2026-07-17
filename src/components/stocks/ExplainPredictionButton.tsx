"use client";

import { useState } from "react";

type Explanation = {
  summary: string;
  bullishDrivers: string[];
  bearishDrivers: string[];
  risks: string[];
  caveats: string[];
  model: string;
};

export function ExplainPredictionButton({
  predictionId,
  initial,
}: {
  predictionId: string;
  initial: Explanation | null;
}) {
  const [explanation, setExplanation] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function explain() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ predictionId }),
      });
      const json = (await res.json()) as {
        error?: string;
        explanation?: Explanation;
      };
      if (!res.ok || !json.explanation) {
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      setExplanation(json.explanation);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Explanation unavailable");
    } finally {
      setLoading(false);
    }
  }

  if (!explanation) {
    return (
      <div className="mt-3">
        <button
          type="button"
          onClick={explain}
          disabled={loading}
          className="rounded-lg border border-ai/40 bg-ai/10 px-3 py-1.5 text-xs font-medium text-ai disabled:opacity-50"
        >
          {loading ? "Generating…" : "Explain with AI"}
        </button>
        {error ? <p className="mt-1 text-xs text-negative">{error}</p> : null}
      </div>
    );
  }

  return (
    <details className="mt-3 rounded-xl border border-ai/30 bg-ai/5 p-3">
      <summary className="cursor-pointer text-xs font-semibold text-ai">
        AI evidence narrative · {explanation.model}
      </summary>
      <p className="mt-2 text-xs leading-relaxed text-ink">
        {explanation.summary}
      </p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <EvidenceList title="Supporting evidence" items={explanation.bullishDrivers} />
        <EvidenceList title="Contrary evidence" items={explanation.bearishDrivers} />
        <EvidenceList title="Risks" items={explanation.risks} />
        <EvidenceList title="Caveats" items={explanation.caveats} />
      </div>
    </details>
  );
}

function EvidenceList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="text-[11px] font-medium text-muted">{title}</p>
      <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[11px] text-muted">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
