import Image from "next/image";

import { cn } from "@/lib/utils";

/**
 * Branded preloader: Alladin mark inside a spinning ring with a visible label.
 * Used inside route loading skeletons and client panels while data loads.
 */
export function Preloader({
  label = "Loading data",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-8",
        className,
      )}
    >
      <span className="relative flex h-16 w-16 items-center justify-center">
        <span
          aria-hidden
          className="absolute inset-0 animate-spin rounded-full border-2 border-line border-t-positive"
        />
        <Image
          src="/logo-transparent.png"
          alt=""
          aria-hidden
          width={40}
          height={40}
          className="h-9 w-9 animate-pulse select-none object-contain brightness-150"
        />
      </span>
      <span className="text-xs text-muted">{label}…</span>
    </div>
  );
}
