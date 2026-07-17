import { NextResponse } from "next/server";

import { isAuthorizedCronRequest } from "@/lib/cron";
import { acquireJobLock, releaseJobLock } from "@/lib/jobs/lock";
import { fitCalibrationArtifacts } from "@/lib/prediction/calibration";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

async function handle(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const lock = await acquireJobLock("fit-calibration");
  if (!lock.ok) {
    return NextResponse.json({ error: lock.reason }, { status: 409 });
  }
  try {
    const results = await fitCalibrationArtifacts("ensemble_v1");
    return NextResponse.json({ results });
  } finally {
    await releaseJobLock("fit-calibration", lock.owner);
  }
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
