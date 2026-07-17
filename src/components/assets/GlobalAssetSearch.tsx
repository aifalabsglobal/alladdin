"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useState, type FormEvent } from "react";

type SearchResult = {
  id: string;
  symbol: string;
  name: string;
  assetClass: string;
  venue: string;
  currency: string;
};

export function GlobalAssetSearch() {
  const router = useRouter();
  const listId = useId();
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setItems([]);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/assets/search?q=${encodeURIComponent(q)}`,
          { signal: controller.signal },
        );
        if (!response.ok) return;
        const payload = (await response.json()) as { items?: SearchResult[] };
        setItems(payload.items ?? []);
      } catch (error) {
        if ((error as Error).name !== "AbortError") setItems([]);
      } finally {
        setLoading(false);
      }
    }, 180);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  function openAsset(id: string) {
    setQuery("");
    setItems([]);
    router.push(`/assets/${encodeURIComponent(id)}`);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (items[0]) openAsset(items[0].id);
    else if (query.trim()) router.push(`/assets?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <form onSubmit={onSubmit} className="relative flex min-w-0 flex-1 items-center gap-2">
      <label htmlFor="global-asset-search" className="sr-only">
        Search global assets
      </label>
      <input
        id="global-asset-search"
        role="combobox"
        aria-autocomplete="list"
        aria-controls={listId}
        aria-expanded={items.length > 0}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search symbol, asset or venue…"
        autoComplete="off"
        className="w-full max-w-md rounded-xl border border-line bg-card px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-positive"
      />
      <button
        type="submit"
        className="rounded-xl border border-line bg-card-raised px-3 py-2 text-xs font-medium text-ink hover:border-positive/40"
      >
        {loading ? "…" : "Go"}
      </button>
      {items.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 top-full z-50 mt-2 w-full max-w-xl overflow-hidden rounded-xl border border-line bg-surface shadow-2xl"
        >
          {items.map((item) => (
            <li key={item.id} role="option" aria-selected="false">
              <button
                type="button"
                onClick={() => openAsset(item.id)}
                className="flex w-full items-center justify-between gap-4 border-b border-line px-3 py-2.5 text-left last:border-0 hover:bg-card-raised"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-ink">
                    {item.symbol} · {item.name}
                  </span>
                  <span className="block truncate text-[11px] text-muted">
                    {item.assetClass} · {item.venue} · {item.currency}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </form>
  );
}
