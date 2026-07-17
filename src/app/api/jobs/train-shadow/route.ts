import { NextResponse } from "next/server";

import { isAuthorizedCronRequest } from "@/lib/cron";
import { trainAndEvaluateShadow } from "@/lib/prediction/shadowModel";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

async function handle(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const summary = await trainAndEvaluateShadow();
  return NextResponse.json(summary);
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
