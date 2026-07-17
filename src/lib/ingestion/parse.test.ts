import { describe, expect, it } from "vitest";

import { parseReportDate, parseSecBhavCsv } from "./parse";

const SAMPLE_CSV = `SYMBOL, SERIES, DATE1, PREV_CLOSE, OPEN_PRICE, HIGH_PRICE, LOW_PRICE, LAST_PRICE, CLOSE_PRICE, AVG_PRICE, TTL_TRD_QNTY, TURNOVER_LACS, NO_OF_TRADES, DELIV_QTY, DELIV_PER
RELIANCE, EQ, 16-Jul-2026, 2850, 2860.00, 2891.25, 2844.10, 2880.00, 2879.55, 2868.30, 5432100, 155803.44, 187654, 3120000, 57.44
TCS, BE, 16-Jul-2026, 3950, 3960.00, 3999.00, 3940.00, 3985.00, 3982.10, 3975.00, 1234567, 49074.07, 65432, 700000, 56.70
INFY, EQ, 16-Jul-2026, 1780, 1785.00, 1801.50, 1770.25, 1795.00, 1794.30, 1788.90, 2345678, 41958.61, 98765, 1500000, -
`;

describe("parseSecBhavCsv", () => {
  const tradeDate = new Date(Date.UTC(2026, 6, 16));

  it("parses EQ rows and skips other series", () => {
    const rows = parseSecBhavCsv(SAMPLE_CSV, tradeDate);
    expect(rows.map((r) => r.symbol)).toEqual(["RELIANCE", "INFY"]);
    expect(rows[0]?.close).toBeCloseTo(2879.55);
    expect(rows[0]?.deliveryPct).toBeCloseTo(57.44);
    expect(rows[0]?.volume).toBe(5432100);
  });

  it("treats dash delivery as null", () => {
    const rows = parseSecBhavCsv(SAMPLE_CSV, tradeDate);
    expect(rows[1]?.deliveryPct).toBeNull();
  });

  it("returns empty for unknown header layout", () => {
    expect(parseSecBhavCsv("A,B,C\n1,2,3", tradeDate)).toEqual([]);
  });
});

describe("parseReportDate", () => {
  it("parses NSE style dates", () => {
    const d = parseReportDate("17-Jul-2026");
    expect(d?.toISOString().slice(0, 10)).toBe("2026-07-17");
  });

  it("rejects malformed dates", () => {
    expect(parseReportDate("2026-07-17")).toBeNull();
    expect(parseReportDate("17-Julio-2026")).toBeNull();
    expect(parseReportDate("")).toBeNull();
  });
});
