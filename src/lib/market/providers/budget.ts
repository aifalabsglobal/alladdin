import "server-only";

import { prisma } from "@/lib/db";
import { PROVIDER_POLICIES } from "@/lib/market/policy";

function utcDateOnly(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export async function reserveProviderCredits(
  provider: string,
  credits = 1,
): Promise<{ allowed: boolean; used: number; limit: number | null }> {
  const policy = PROVIDER_POLICIES[provider];
  const limit = policy?.dailyCredits ?? null;
  const date = utcDateOnly();
  const current = await prisma.providerBudgetUsage.findUnique({
    where: { provider_date: { provider, date } },
  });
  const used = current?.credits ?? 0;
  if (limit !== null && used + credits > limit) {
    return { allowed: false, used, limit };
  }

  const next = await prisma.providerBudgetUsage.upsert({
    where: { provider_date: { provider, date } },
    create: { provider, date, requests: 1, credits },
    update: {
      requests: { increment: 1 },
      credits: { increment: credits },
    },
  });
  return { allowed: true, used: next.credits, limit };
}

export async function recordProviderFailure(provider: string, message: string) {
  const date = utcDateOnly();
  await prisma.providerBudgetUsage.upsert({
    where: { provider_date: { provider, date } },
    create: {
      provider,
      date,
      failures: 1,
      metadata: { lastError: message, lastErrorAt: new Date().toISOString() },
    },
    update: {
      failures: { increment: 1 },
      metadata: { lastError: message, lastErrorAt: new Date().toISOString() },
    },
  });
}
