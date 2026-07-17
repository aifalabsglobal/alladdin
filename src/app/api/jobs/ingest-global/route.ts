import { NextResponse } from "next/server";

import { isAuthorizedCronRequest } from "@/lib/cron";
import { prisma } from "@/lib/db";
import { ingestGlobalQuotes } from "@/lib/market/providers/ingestGlobal";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

async function handle(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const run = await prisma.ingestionRun.create({
    data: { adapter: "global_free_quotes", status: "RUNNING" },
  });
  try {
    const summary = await ingestGlobalQuotes();
    const allFailed =
      summary.attemptedProviders > 0 &&
      summary.failedProviders === summary.attemptedProviders;
    await prisma.ingestionRun.update({
      where: { id: run.id },
      data: {
        status: allFailed ? "FAILED" : "OK",
        finishedAt: new Date(),
        rowsUpserted: summary.rowsUpserted,
        metadata: summary,
      },
    });
    return NextResponse.json(summary);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Global ingestion failed";
    await prisma.ingestionRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        errorMessage: message,
      },
    });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
