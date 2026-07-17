"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const COMMANDS = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Assets", href: "/assets" },
  { label: "Watchlist", href: "/watchlist" },
  { label: "Model trust", href: "/calibration" },
  { label: "Paper portfolio", href: "/paper" },
  { label: "Alert center", href: "/alerts" },
  { label: "Methodology", href: "/methodology" },
  { label: "Legal", href: "/legal" },
  { label: "Factors", href: "/influencers" },
  { label: "Equity sectors", href: "/sectors" },
] as const;

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COMMANDS;
    return COMMANDS.filter((c) => c.label.toLowerCase().includes(q));
  }, [query]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 pt-[15vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Jump to…"
          className="w-full border-b border-line bg-transparent px-4 py-3 text-sm text-ink outline-none"
        />
        <ul className="max-h-72 overflow-y-auto p-2">
          {filtered.map((cmd) => (
            <li key={cmd.href}>
              <button
                type="button"
                className="w-full rounded-xl px-3 py-2 text-left text-sm text-ink hover:bg-card-raised"
                onClick={() => {
                  setOpen(false);
                  router.push(cmd.href);
                }}
              >
                {cmd.label}
              </button>
            </li>
          ))}
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted">No matches</li>
          ) : null}
        </ul>
        <p className="border-t border-line px-4 py-2 text-[11px] text-muted">
          Ctrl/Cmd+K · Esc to close
        </p>
      </div>
    </div>
  );
}
