import { NextResponse } from "next/server";

import { isAuthorizedCronRequest } from "@/lib/cron";
import { acquireJobLock, releaseJobLock } from "@/lib/jobs/lock";
import { ingestGlobalYahooBars } from "@/lib/market/providers/yahooBars";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

async function handle(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const lock = await acquireJobLock("ingest-global-bars");
  if (!lock.ok) {
    return NextResponse.json({ error: lock.reason }, { status: 409 });
  }
  try {
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("limit") ?? "24");
    const summary = await ingestGlobalYahooBars({
      instrumentLimit: Number.isFinite(limit) ? limit : 24,
      lookbackDays: 90,
    });
    return NextResponse.json(summary);
  } finally {
    await releaseJobLock("ingest-global-bars", lock.owner);
  }
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
