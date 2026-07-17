import { NextResponse } from "next/server";
import { z } from "zod";

import { assertAiRateLimit } from "@/lib/ai/budget";
import { explainPrediction } from "@/lib/ai/explainPrediction";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const bodySchema = z.object({
  predictionId: z.string().min(1),
  force: z.boolean().optional(),
});

export async function POST(request: Request) {
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  try {
    await assertAiRateLimit();
    const result = await explainPrediction(body.predictionId, {
      force: body.force,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Explain failed";
    const status = message.includes("budget") || message.includes("rate limit")
      ? 429
      : message.includes("not found")
        ? 404
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
