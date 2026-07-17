import "server-only";

import { prisma } from "@/lib/db";
import { getOperationalAlerts } from "@/lib/queries/alerts";

/**
 * Persist operational alerts into AlertEvent for the inbox.
 */
export async function syncOperationalAlertEvents() {
  const alerts = await getOperationalAlerts();
  let upserted = 0;
  for (const alert of alerts) {
    await prisma.alertEvent.upsert({
      where: { sourceKey: alert.id },
      create: {
        userId: null,
        severity: alert.severity,
        category: alert.category,
        title: alert.title,
        detail: alert.detail,
        sourceKey: alert.id,
      },
      update: {
        severity: alert.severity,
        category: alert.category,
        title: alert.title,
        detail: alert.detail,
      },
    });
    upserted += 1;
  }
  return { upserted };
}

export async function getAlertInbox(limit = 50) {
  return prisma.alertEvent.findMany({
    orderBy: [{ acknowledged: "asc" }, { createdAt: "desc" }],
    take: limit,
  });
}

export async function acknowledgeAlert(id: string) {
  await prisma.alertEvent.update({
    where: { id },
    data: { acknowledged: true, acknowledgedAt: new Date() },
  });
}
