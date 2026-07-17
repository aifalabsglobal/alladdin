import Link from "next/link";

import { EmptyState } from "@/components/ui/EmptyState";

export default function SectorNotFound() {
  return (
    <EmptyState
      title="Sector not found"
      body="That sector doesn't exist in the Alladin universe."
      action={
        <Link
          href="/sectors"
          className="rounded-xl bg-positive/15 px-4 py-2 text-sm font-semibold text-positive"
        >
          Browse sectors
        </Link>
      }
    />
  );
}
