import "server-only";

import { prisma } from "@/lib/db";
import { dayChangePct } from "@/lib/format";
import type { HealthBand } from "@prisma/client";

export type WatchlistCard = {
  symbol: string;
  name: string;
  sectorName: string;
  close: number | null;
  changePct: number | null;
  score: number | null;
  band: HealthBand | null;
  scoreChange: number | null;
};

const DEMO_SYMBOLS = ["RELIANCE", "TCS", "HDFCBANK", "INFY", "TATAMOTORS", "SUNPHARMA"];

/**
 * Phase 2 demo watchlist: fixed seeded symbols, clearly labeled in the UI.
 * Real per-user watchlists arrive with Clerk auth in a later phase.
 */
export async function getDemoWatchlist(): Promise<WatchlistCard[]> {
  const stocks = await prisma.stock.findMany({
    where: { symbol: { in: DEMO_SYMBOLS } },
    include: {
      sector: true,
      priceBars: { orderBy: { date: "desc" }, take: 2 },
      healthScores: { orderBy: { date: "desc" }, take: 2 },
    },
  });

  return stocks
    .map((s) => {
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
    })
    .sort((a, b) => Math.abs(b.scoreChange ?? 0) - Math.abs(a.scoreChange ?? 0));
}
