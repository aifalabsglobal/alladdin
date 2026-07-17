import Link from "next/link";

import { EmptyState } from "@/components/ui/EmptyState";

export default function StockNotFound() {
  return (
    <EmptyState
      title="Stock not found"
      body="We couldn't find that symbol in the Alladin universe. It may not be seeded yet."
      action={
        <Link
          href="/stocks"
          className="rounded-xl bg-positive/15 px-4 py-2 text-sm font-semibold text-positive"
        >
          Browse all stocks
        </Link>
      }
    />
  );
}
