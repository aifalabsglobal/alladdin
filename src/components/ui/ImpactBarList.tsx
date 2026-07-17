import { cn } from "@/lib/utils";

export type ImpactItem = {
  key: string;
  name: string;
  impactPoints: number;
  reasonText: string;
};

export function ImpactBarList({
  items,
  maxAbs,
}: {
  items: ImpactItem[];
  maxAbs?: number;
}) {
  const cap = Math.max(
    maxAbs ?? 0,
    ...items.map((i) => Math.abs(i.impactPoints)),
    1,
  );

  return (
    <ul className="space-y-3">
      {items.map((item) => {
        const positive = item.impactPoints >= 0;
        const width = Math.min(100, (Math.abs(item.impactPoints) / cap) * 100);

        return (
          <li key={item.key}>
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-medium text-ink">{item.name}</p>
              <p
                className={cn(
                  "num text-sm font-semibold",
                  positive ? "text-positive" : "text-negative",
                )}
              >
                {positive ? "+" : ""}
                {item.impactPoints.toFixed(1)} pts
              </p>
            </div>
            <div
              className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-card-raised"
              role="img"
              aria-label={`${item.name}: ${positive ? "positive" : "negative"} impact of ${Math.abs(item.impactPoints).toFixed(1)} points`}
            >
              <div
                className={cn(
                  "h-full rounded-full",
                  positive ? "bg-positive" : "bg-negative",
                )}
                style={{ width: `${width}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-muted">{item.reasonText}</p>
          </li>
        );
      })}
    </ul>
  );
}
