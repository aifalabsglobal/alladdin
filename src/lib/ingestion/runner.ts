import "server-only";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { fiiDiiFlowsAdapter } from "@/lib/ingestion/fiiDiiFlows";
import { macroIndicatorsAdapter } from "@/lib/ingestion/macroIndicators";
import { nseBhavcopyAdapter } from "@/lib/ingestion/nseBhavcopy";
import type { IngestionAdapter, IngestionStockRef } from "@/lib/ingestion/types";
import { yahooFinanceAdapter } from "@/lib/ingestion/yahooFinance";

export const INGESTION_ADAPTERS: IngestionAdapter[] = [
  yahooFinanceAdapter,
  nseBhavcopyAdapter,
  fiiDiiFlowsAdapter,
  macroIndicatorsAdapter,
];

export type AdapterRunSummary = {
  adapter: string;
  status: "SUCCESS" | "FAILED";
  rowsUpserted: number;
  durationMs: number;
  error?: string;
  details?: Record<string, unknown>;
};

/**
 * Runs every registered adapter sequentially with failure isolation:
 * one failing source never blocks the others. Each run is logged to
 * the IngestionRun table.
 */
export async function runEodIngestion(
  adapterNames?: string[],
): Promise<AdapterRunSummary[]> {
  const stocks: IngestionStockRef[] = await prisma.stock.findMany({
    where: { isActive: true },
    select: { id: true, symbol: true, exchange: true, sectorId: true },
  });

  const adapters = adapterNames?.length
    ? INGESTION_ADAPTERS.filter((a) => adapterNames.includes(a.name))
    : INGESTION_ADAPTERS;

  const summaries: AdapterRunSummary[] = [];

  for (const adapter of adapters) {
    const startedAt = new Date();
    const run = await prisma.ingestionRun.create({
      data: {
        adapter: adapter.name,
        startedAt,
        status: "RUNNING",
        dataSource: adapter.dataSource,
      },
    });

    try {
      const result = await adapter.run({ prisma, stocks });
      const durationMs = Date.now() - startedAt.getTime();

      await prisma.ingestionRun.update({
        where: { id: run.id },
        data: {
          finishedAt: new Date(),
          status: "SUCCESS",
          rowsUpserted: result.rowsUpserted,
          metadata: (result.details ?? undefined) as Prisma.InputJsonValue | undefined,
        },
      });

      summaries.push({
        adapter: adapter.name,
        status: "SUCCESS",
        rowsUpserted: result.rowsUpserted,
        durationMs,
        details: result.details,
      });
    } catch (err) {
      const durationMs = Date.now() - startedAt.getTime();
      const message = err instanceof Error ? err.message : "Unknown error";

      await prisma.ingestionRun.update({
        where: { id: run.id },
        data: {
          finishedAt: new Date(),
          status: "FAILED",
          errorMessage: message,
        },
      });

      summaries.push({
        adapter: adapter.name,
        status: "FAILED",
        rowsUpserted: 0,
        durationMs,
        error: message,
      });
    }
  }

  return summaries;
}
