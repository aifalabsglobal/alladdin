"use client";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="glass-card mx-auto mt-12 flex max-w-md flex-col items-center gap-3 rounded-2xl px-6 py-12 text-center">
      <h2 className="text-sm font-semibold text-ink">Something went wrong</h2>
      <p className="text-sm text-muted">
        {error.digest
          ? `An unexpected error occurred (ref ${error.digest}).`
          : "An unexpected error occurred while loading this page."}
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-2 rounded-xl bg-positive/15 px-4 py-2 text-sm font-semibold text-positive transition hover:bg-positive/25"
      >
        Try again
      </button>
    </div>
  );
}
