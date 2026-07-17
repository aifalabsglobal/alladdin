import { cn } from "@/lib/utils";

export function SentimentChip({ sentiment }: { sentiment: number | null }) {
  if (sentiment === null) {
    return (
      <span className="inline-flex rounded-full bg-card-raised px-2.5 py-1 text-xs text-muted">
        Not scored
      </span>
    );
  }

  const positive = sentiment >= 0.15;
  const negative = sentiment <= -0.15;

  return (
    <span
      className={cn(
        "num inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
        positive && "bg-positive/12 text-positive",
        negative && "bg-negative/12 text-negative",
        !positive && !negative && "bg-warning/12 text-warning",
      )}
    >
      {positive ? "Positive" : negative ? "Negative" : "Mixed"}{" "}
      {sentiment >= 0 ? "+" : ""}
      {sentiment.toFixed(2)}
    </span>
  );
}
