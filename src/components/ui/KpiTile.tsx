import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function KpiTile({
  label,
  value,
  hint,
  tone = "neutral",
  children,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "positive" | "negative" | "neutral" | "ai";
  children?: ReactNode;
}) {
  return (
    <div className="glass-card rounded-2xl p-4">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p
        className={cn(
          "num mt-1.5 text-xl font-semibold tracking-tight",
          tone === "positive" && "text-positive",
          tone === "negative" && "text-negative",
          tone === "neutral" && "text-ink",
          tone === "ai" && "text-ai",
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
      {children}
    </div>
  );
}
