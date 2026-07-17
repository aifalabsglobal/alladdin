import { Preloader } from "@/components/ui/Preloader";
import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-pulse rounded-2xl border border-line bg-card",
        className,
      )}
    />
  );
}

export function PageSkeleton({
  label = "Loading page",
  kpiCount = 5,
}: {
  label?: string;
  kpiCount?: number;
}) {
  return (
    <div className="relative space-y-6">
      <Skeleton className="h-16" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {Array.from({ length: kpiCount }, (_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-80 lg:col-span-2" />
        <Skeleton className="h-80" />
      </div>
      <Skeleton className="h-64" />
      <div className="absolute inset-0 flex items-center justify-center">
        <Preloader label={label} />
      </div>
    </div>
  );
}

export function TableSkeleton({ label = "Loading table" }: { label?: string }) {
  return (
    <div className="relative space-y-6">
      <Skeleton className="h-16" />
      <Skeleton className="h-32" />
      <div className="glass-card space-y-3 rounded-2xl p-5">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-12 rounded-xl" />
        ))}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <Preloader label={label} />
      </div>
    </div>
  );
}

export function DetailSkeleton({ label = "Loading details" }: { label?: string }) {
  return (
    <div className="relative space-y-6">
      <Skeleton className="h-16" />
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-48" />
        <Skeleton className="h-48 lg:col-span-2" />
      </div>
      <Skeleton className="h-96" />
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-72 lg:col-span-2" />
        <Skeleton className="h-72" />
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <Preloader label={label} />
      </div>
    </div>
  );
}
