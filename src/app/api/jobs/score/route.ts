import { NextResponse } from "next/server";
import { z } from "zod";

import { isAuthorizedCronRequest } from "@/lib/cron";
import { runScoring } from "@/lib/scoring/engine";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const bodySchema = z
  .object({
    date: z.string().date().optional(),
  })
  .optional();

async function handle(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let date: Date | undefined;
  const url = new URL(request.url);
  const dateParam = url.searchParams.get("date");
  if (dateParam) {
    date = new Date(`${dateParam}T00:00:00.000Z`);
  } else if (request.method === "POST") {
    try {
      const text = await request.text();
      if (text) {
        const body = bodySchema.parse(JSON.parse(text));
        date = body?.date
          ? new Date(`${body.date}T00:00:00.000Z`)
          : undefined;
      }
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
  }

  try {
    const summary = await runScoring(date);
    return NextResponse.json(summary);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Scoring failed",
      },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
