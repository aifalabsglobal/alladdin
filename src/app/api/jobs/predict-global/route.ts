import { NextResponse } from "next/server";
import { z } from "zod";

import { isAuthorizedCronRequest } from "@/lib/cron";
import { runInstrumentPredictions } from "@/lib/prediction/instrumentEngine";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const horizonSchema = z.enum(["M15", "H1", "EOD", "D1", "W1", "M1"]);

async function handle(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const horizonsParam = url.searchParams.get("horizons");
  const limitParam = url.searchParams.get("limit");

  let horizons = undefined;
  if (horizonsParam) {
    const parsed = z.array(horizonSchema).safeParse(horizonsParam.split(","));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid horizons" }, { status: 400 });
    }
    horizons = parsed.data;
  }

  const summary = await runInstrumentPredictions({
    horizons,
    instrumentLimit: limitParam ? Number(limitParam) : undefined,
  });

  return NextResponse.json(summary);
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
