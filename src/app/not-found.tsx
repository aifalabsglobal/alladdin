import Link from "next/link";

import { EmptyState } from "@/components/ui/EmptyState";

export default function NotFound() {
  return (
    <EmptyState
      title="Page not found"
      body="That page doesn't exist in Alladin."
      action={
        <Link
          href="/dashboard"
          className="rounded-xl bg-positive/15 px-4 py-2 text-sm font-semibold text-positive"
        >
          Go to dashboard
        </Link>
      }
    />
  );
}
