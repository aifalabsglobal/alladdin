export function SyntheticTag({ asOf }: { asOf?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-2.5 py-1 text-[11px] text-muted">
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-ai" />
      Synthetic seed data{asOf ? ` · as of ${asOf}` : ""}
    </span>
  );
}
