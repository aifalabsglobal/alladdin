import { NextResponse } from "next/server";
import { z } from "zod";

import { runEodIngestion } from "@/lib/ingestion/runner";
import { isAuthorizedCronRequest } from "@/lib/cron";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const bodySchema = z
  .object({
    adapters: z.array(z.string()).optional(),
  })
  .optional();

async function handle(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let adapters: string[] | undefined;
  const url = new URL(request.url);
  const adaptersParam = url.searchParams.get("adapters");
  if (adaptersParam) {
    adapters = adaptersParam.split(",").filter(Boolean);
  } else if (request.method === "POST") {
    try {
      const text = await request.text();
      if (text) {
        const parsed = bodySchema.parse(JSON.parse(text));
        adapters = parsed?.adapters;
      }
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
  }

  const startedAt = new Date().toISOString();
  const summaries = await runEodIngestion(adapters);
  const allFailed =
    summaries.length > 0 && summaries.every((s) => s.status === "FAILED");

  return NextResponse.json(
    {
      startedAt,
      finishedAt: new Date().toISOString(),
      summaries,
    },
    { status: allFailed ? 502 : 200 },
  );
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
