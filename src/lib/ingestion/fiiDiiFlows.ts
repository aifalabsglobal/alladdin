import "server-only";

import { DataSource } from "@prisma/client";
import { z } from "zod";

import { parseReportDate } from "@/lib/ingestion/parse";
import type {
  AdapterResult,
  IngestionAdapter,
  IngestionContext,
} from "@/lib/ingestion/types";

const fiiDiiRowSchema = z.object({
  category: z.string(),
  date: z.string(),
  buyValue: z.coerce.number(),
  sellValue: z.coerce.number(),
  netValue: z.coerce.number(),
});

/**
 * Daily FII/DII net buy/sell figures from the NSE report API,
 * stored as MacroIndicator rows (fii_net / dii_net in ₹ crore).
 */
export const fiiDiiFlowsAdapter: IngestionAdapter = {
  name: "fii_dii_flows",
  dataSource: DataSource.FII_DII,

  async run(ctx: IngestionContext): Promise<AdapterResult> {
    const res = await fetch(
      "https://www.nseindia.com/api/fiidiiTradeReact",
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept: "application/json",
          Referer: "https://www.nseindia.com/reports/fii-dii",
        },
        signal: AbortSignal.timeout(30_000),
      },
    );

    if (!res.ok) {
      throw new Error(`NSE FII/DII endpoint returned ${res.status}`);
    }

    const payload: unknown = await res.json();
    if (!Array.isArray(payload)) {
      throw new Error("Unexpected FII/DII payload shape");
    }

    let rowsUpserted = 0;
    for (const raw of payload) {
      const parsed = fiiDiiRowSchema.safeParse(raw);
      if (!parsed.success) continue;

      const date = parseReportDate(parsed.data.date);
      if (!date) continue;

      const category = parsed.data.category.toUpperCase();
      const key = category.includes("FII") || category.includes("FPI")
        ? "fii_net"
        : category.includes("DII")
          ? "dii_net"
          : null;
      if (!key) continue;

      await ctx.prisma.macroIndicator.upsert({
        where: { key_date: { key, date } },
        create: {
          key,
          date,
          value: parsed.data.netValue,
          dataSource: DataSource.FII_DII,
          metadata: {
            buyValue: parsed.data.buyValue,
            sellValue: parsed.data.sellValue,
          },
        },
        update: {
          value: parsed.data.netValue,
          dataSource: DataSource.FII_DII,
          metadata: {
            buyValue: parsed.data.buyValue,
            sellValue: parsed.data.sellValue,
          },
        },
      });
      rowsUpserted += 1;
    }

    return { rowsUpserted };
  },
};
