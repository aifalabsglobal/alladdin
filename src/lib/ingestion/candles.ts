import { z } from "zod";

const chartQuoteSchema = z.object({
  date: z.coerce.date(),
  open: z.number().nullable(),
  high: z.number().nullable(),
  low: z.number().nullable(),
  close: z.number().nullable(),
  volume: z.number().nullable(),
});

export type NormalizedCandle = {
  openTime: Date;
  closeTime: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  complete: boolean;
};

const INTERVAL_MS: Record<"15m" | "60m", number> = {
  "15m": 15 * 60_000,
  "60m": 60 * 60_000,
};

export function normalizeYahooCandles(
  quotes: unknown[],
  yahooInterval: "15m" | "60m",
  now = new Date(),
): NormalizedCandle[] {
  const ms = INTERVAL_MS[yahooInterval];
  const out: NormalizedCandle[] = [];

  for (const raw of quotes) {
    const parsed = chartQuoteSchema.safeParse(raw);
    if (!parsed.success) continue;
    const q = parsed.data;
    if (
      q.open === null ||
      q.high === null ||
      q.low === null ||
      q.close === null
    ) {
      continue;
    }
    const openTime = q.date;
    const closeTime = new Date(openTime.getTime() + ms);
    out.push({
      openTime,
      closeTime,
      open: q.open,
      high: q.high,
      low: q.low,
      close: q.close,
      volume: q.volume ?? 0,
      complete: closeTime.getTime() <= now.getTime(),
    });
  }

  return out;
}
