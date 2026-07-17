import "server-only";

import { prisma } from "@/lib/db";
import { dayChangePct } from "@/lib/format";
import type { WatchlistCard } from "@/lib/queries/watchlist";

const DEFAULT_NAME = "My watchlist";

async function getOrCreateDefaultWatchlist(userId: string) {
  return prisma.watchlist.upsert({
    where: { userId_name: { userId, name: DEFAULT_NAME } },
    create: { userId, name: DEFAULT_NAME },
    update: {},
  });
}

export async function getUserWatchlist(userId: string): Promise<WatchlistCard[]> {
  const watchlist = await getOrCreateDefaultWatchlist(userId);
  const items = await prisma.watchlistItem.findMany({
    where: { watchlistId: watchlist.id },
    include: {
      stock: {
        include: {
          sector: true,
          priceBars: { orderBy: { date: "desc" }, take: 2 },
          healthScores: { orderBy: { date: "desc" }, take: 2 },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return items
    .filter((item): item is typeof item & { stock: NonNullable<typeof item.stock> } =>
      Boolean(item.stock),
    )
    .map((item) => {
      const s = item.stock;
      const latestBar = s.priceBars[0];
      const prevBar = s.priceBars[1];
      const latestScore = s.healthScores[0];
      const prevScore = s.healthScores[1];
      return {
        symbol: s.symbol,
        name: s.name,
        sectorName: s.sector.name,
        close: latestBar?.close ?? null,
        changePct:
          latestBar && prevBar
            ? dayChangePct(latestBar.close, prevBar.close)
            : null,
        score: latestScore?.score ?? null,
        band: latestScore?.band ?? null,
        scoreChange:
          latestScore && prevScore ? latestScore.score - prevScore.score : null,
      };
    });
}

export async function addStockToWatchlist(userId: string, symbol: string) {
  const stock = await prisma.stock.findUnique({ where: { symbol } });
  if (!stock) return { ok: false as const, reason: "unknown symbol" };
  const watchlist = await getOrCreateDefaultWatchlist(userId);
  await prisma.watchlistItem.upsert({
    where: {
      watchlistId_stockId: { watchlistId: watchlist.id, stockId: stock.id },
    },
    create: { watchlistId: watchlist.id, stockId: stock.id },
    update: {},
  });
  return { ok: true as const };
}

export async function removeStockFromWatchlist(userId: string, symbol: string) {
  const stock = await prisma.stock.findUnique({ where: { symbol } });
  if (!stock) return { ok: false as const, reason: "unknown symbol" };
  const watchlist = await getOrCreateDefaultWatchlist(userId);
  await prisma.watchlistItem.deleteMany({
    where: { watchlistId: watchlist.id, stockId: stock.id },
  });
  return { ok: true as const };
}
