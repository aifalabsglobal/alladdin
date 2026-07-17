import "server-only";

import { getServerEnv } from "@/lib/env";

/**
 * Cron routes require the CRON_SECRET via Authorization: Bearer <secret>
 * or an x-cron-secret header. Rejects when unset or mismatched.
 */
export function isAuthorizedCronRequest(request: Request): boolean {
  const env = getServerEnv();
  if (!env.CRON_SECRET) return false;

  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${env.CRON_SECRET}`) return true;

  return request.headers.get("x-cron-secret") === env.CRON_SECRET;
}
