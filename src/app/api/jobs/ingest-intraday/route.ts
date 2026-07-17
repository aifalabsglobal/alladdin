import { BarInterval } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { isAuthorizedCronRequest } from "@/lib/cron";
import {
  ingestIntradayBars,
  pruneIntradayBars,
} from "@/lib/ingestion/intradayYahoo";
import { prisma } from "@/lib/db";
import { DataSource } from "@prisma/client";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const querySchema = z.object({
  interval: z.enum(["M15", "H1"]).default("M15"),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

async function handle(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    interval: url.searchParams.get("interval") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }

  const startedAt = new Date();
  const run = await prisma.ingestionRun.create({
    data: {
      adapter: "yahoo_intraday",
      status: "RUNNING",
      dataSource: DataSource.YAHOO_FINANCE,
      metadata: { interval: parsed.data.interval },
    },
  });

  try {
    const summary = await ingestIntradayBars({
      interval: parsed.data.interval as BarInterval,
      symbolLimit: parsed.data.limit,
      lookbackDays: 3,
    });
    const pruned = await pruneIntradayBars(14);
    await prisma.ingestionRun.update({
      where: { id: run.id },
      data: {
        status: summary.failures === summary.stocksAttempted ? "FAILED" : "OK",
        finishedAt: new Date(),
        rowsUpserted: summary.rowsUpserted,
        metadata: { ...summary, pruned },
      },
    });

    return NextResponse.json({
      startedAt: startedAt.toISOString(),
      finishedAt: new Date().toISOString(),
      summary,
      pruned,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
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
