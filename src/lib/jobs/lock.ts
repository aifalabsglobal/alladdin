import "server-only";

import { randomUUID } from "crypto";

import { prisma } from "@/lib/db";

const DEFAULT_TTL_MS = 15 * 60_000;

/**
 * Soft distributed lock using Postgres rows. Expired locks are stealable.
 * Suitable for cron/job routes on serverless without Redis.
 */
export async function acquireJobLock(
  key: string,
  ttlMs = DEFAULT_TTL_MS,
): Promise<{ ok: true; owner: string } | { ok: false; reason: string }> {
  const owner = randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMs);

  const existing = await prisma.jobLock.findUnique({ where: { key } });
  if (existing && existing.expiresAt > now) {
    return { ok: false, reason: `locked by ${existing.owner} until ${existing.expiresAt.toISOString()}` };
  }

  await prisma.jobLock.upsert({
    where: { key },
    create: { key, owner, expiresAt },
    update: { owner, acquiredAt: now, expiresAt },
  });

  const confirmed = await prisma.jobLock.findUnique({ where: { key } });
  if (!confirmed || confirmed.owner !== owner) {
    return { ok: false, reason: "lost race acquiring lock" };
  }
  return { ok: true, owner };
}

export async function releaseJobLock(key: string, owner: string) {
  await prisma.jobLock.deleteMany({ where: { key, owner } });
}
