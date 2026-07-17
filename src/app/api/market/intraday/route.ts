import { BarInterval } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { fetchYahooIntradayCandles } from "@/lib/ingestion/intradayYahoo";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  symbol: z.string().min(1).max(32),
  interval: z.enum(["M15", "H1"]).default("M15"),
  limit: z.coerce.number().int().min(1).max(500).default(120),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    symbol: url.searchParams.get("symbol"),
    interval: url.searchParams.get("interval") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { symbol, interval, limit } = parsed.data;
  const stock = await prisma.stock.findUnique({
    where: { symbol: symbol.toUpperCase() },
    select: { id: true, symbol: true, exchange: true },
  });

  if (!stock) {
    return NextResponse.json({ error: "Symbol not found" }, { status: 404 });
  }

  const barInterval = interval as BarInterval;

  // Prefer persisted bars; fall back to live Yahoo fetch for prototype UX.
  let bars = await prisma.intradayBar.findMany({
    where: { stockId: stock.id, interval: barInterval },
    orderBy: { openTime: "desc" },
    take: limit,
  });

  let source: "db" | "yahoo_live" | "eod_fallback" = "db";
  let error: string | null = null;

  if (bars.length < 8) {
    try {
      const candles = await fetchYahooIntradayCandles({
        symbol: stock.symbol,
        exchange: stock.exchange,
        interval: barInterval,
        lookbackDays: 5,
      });
      bars = candles
        .slice(-limit)
        .reverse()
        .map((c, idx) => ({
          id: `live-${idx}`,
          stockId: stock.id,
          interval: barInterval,
          openTime: c.openTime,
          closeTime: c.closeTime,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
          volume: c.volume,
          complete: c.complete,
          dataSource: "YAHOO_FINANCE" as const,
          providerTs: c.closeTime,
          ingestedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        }));
      source = "yahoo_live";
    } catch (err) {
      error = err instanceof Error ? err.message : "Yahoo intraday failed";
      const eod = await prisma.priceBar.findMany({
        where: { stockId: stock.id },
        orderBy: { date: "desc" },
        take: Math.min(limit, 90),
      });
      bars = eod.map((b, idx) => ({
        id: `eod-${idx}`,
        stockId: stock.id,
        interval: "D1" as BarInterval,
        openTime: b.date,
        closeTime: b.date,
        open: b.open,
        high: b.high,
        low: b.low,
        close: b.close,
        volume: b.volume,
        complete: true,
        dataSource: b.dataSource,
        providerTs: b.date,
        ingestedAt: b.updatedAt,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
      }));
      source = "eod_fallback";
    }
  }

  const candles = [...bars].reverse().map((b) => ({
    openTime: b.openTime.toISOString(),
    closeTime: b.closeTime.toISOString(),
    open: b.open,
    high: b.high,
    low: b.low,
    close: b.close,
    volume: b.volume,
    complete: b.complete,
  }));

  return NextResponse.json(
    {
      symbol: stock.symbol,
      interval,
      source,
      provenance:
        source === "eod_fallback"
          ? "EOD fallback — Yahoo intraday unavailable"
          : source === "yahoo_live"
            ? "Yahoo Finance unofficial prototype chart"
            : "Persisted Yahoo intraday bars",
      error,
      count: candles.length,
      candles,
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    },
  );
}
