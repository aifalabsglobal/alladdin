import { NextResponse } from "next/server";

import { isAuthorizedCronRequest } from "@/lib/cron";
import { labelPredictionOutcomes } from "@/lib/prediction/labelOutcomes";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

async function handle(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? "2000");
  const summary = await labelPredictionOutcomes(
    Number.isFinite(limit) ? limit : 2000,
  );
  return NextResponse.json(summary);
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
