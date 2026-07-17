import "server-only";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { getServerEnv } from "@/lib/env";

function utcDateOnly(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export async function getTodayTokenUsage(): Promise<number> {
  const date = utcDateOnly();
  const rows = await prisma.apiUsage.findMany({
    where: { provider: "openai", date },
    select: { totalTokens: true },
  });
  return rows.reduce((sum, r) => sum + r.totalTokens, 0);
}

export async function assertWithinBudget(estimatedTokens = 1200): Promise<void> {
  const env = getServerEnv();
  const used = await getTodayTokenUsage();
  if (used + estimatedTokens > env.OPENAI_DAILY_TOKEN_BUDGET) {
    throw new Error(
      `OpenAI daily token budget exceeded (${used}/${env.OPENAI_DAILY_TOKEN_BUDGET})`,
    );
  }
}

/** Coarse server-side guard until Clerk user-level quotas are enabled. */
export async function assertAiRateLimit(maxPerMinute = 20): Promise<void> {
  const since = new Date(Date.now() - 60_000);
  const count = await prisma.apiUsage.count({
    where: {
      provider: "openai",
      purpose: "prediction_explanation",
      createdAt: { gte: since },
    },
  });
  if (count >= maxPerMinute) {
    throw new Error("AI explanation rate limit exceeded");
  }
}

export async function recordApiUsage(args: {
  model: string;
  purpose: string;
  promptTokens: number;
  completionTokens: number;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const date = utcDateOnly();
  await prisma.apiUsage.create({
    data: {
      provider: "openai",
      model: args.model,
      purpose: args.purpose,
      promptTokens: args.promptTokens,
      completionTokens: args.completionTokens,
      totalTokens: args.promptTokens + args.completionTokens,
      date,
      metadata: args.metadata
        ? (args.metadata as Prisma.InputJsonValue)
        : undefined,
    },
  });
}
