import { z } from "zod";

export const bhavRowSchema = z.object({
  symbol: z.string().min(1),
  series: z.string(),
  open: z.coerce.number(),
  high: z.coerce.number(),
  low: z.coerce.number(),
  close: z.coerce.number(),
  volume: z.coerce.number(),
  deliveryPct: z.coerce.number().min(0).max(100).nullable(),
  date: z.date(),
});

export type BhavRow = z.infer<typeof bhavRowSchema>;

/** Parses the NSE "sec_bhavdata_full" CSV, keeping EQ-series rows only. */
export function parseSecBhavCsv(csv: string, tradeDate: Date): BhavRow[] {
  const lines = csv.trim().split(/\r?\n/);
  const header = lines[0]?.split(",").map((h) => h.trim().toUpperCase()) ?? [];

  const idx = (name: string) => header.indexOf(name);
  const iSymbol = idx("SYMBOL");
  const iSeries = idx("SERIES");
  const iOpen = idx("OPEN_PRICE");
  const iHigh = idx("HIGH_PRICE");
  const iLow = idx("LOW_PRICE");
  const iClose = idx("CLOSE_PRICE");
  const iVolume = idx("TTL_TRD_QNTY");
  const iDeliv = idx("DELIV_PER");

  if ([iSymbol, iSeries, iOpen, iHigh, iLow, iClose, iVolume].some((i) => i < 0)) {
    return [];
  }

  const rows: BhavRow[] = [];
  for (const line of lines.slice(1)) {
    const cols = line.split(",").map((c) => c.trim());
    const delivRaw = iDeliv >= 0 ? cols[iDeliv] : undefined;
    const parsed = bhavRowSchema.safeParse({
      symbol: cols[iSymbol],
      series: cols[iSeries],
      open: cols[iOpen],
      high: cols[iHigh],
      low: cols[iLow],
      close: cols[iClose],
      volume: cols[iVolume],
      deliveryPct:
        delivRaw && delivRaw !== "-" && delivRaw !== "" ? delivRaw : null,
      date: tradeDate,
    });
    if (parsed.success && parsed.data.series === "EQ") {
      rows.push(parsed.data);
    }
  }
  return rows;
}

/** Parses NSE report dates like "17-Jul-2026" into UTC dates. */
export function parseReportDate(raw: string): Date | null {
  const m = raw.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (!m) return null;
  const months = [
    "jan", "feb", "mar", "apr", "may", "jun",
    "jul", "aug", "sep", "oct", "nov", "dec",
  ];
  const month = months.indexOf(m[2]!.toLowerCase());
  if (month < 0) return null;
  return new Date(Date.UTC(Number(m[3]), month, Number(m[1])));
}
