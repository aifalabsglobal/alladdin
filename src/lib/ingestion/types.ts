import "server-only";

import type { DataSource, Exchange, PrismaClient } from "@prisma/client";

export type IngestionStockRef = {
  id: string;
  symbol: string;
  exchange: Exchange;
  sectorId: string;
};

export type IngestionContext = {
  prisma: PrismaClient;
  stocks: IngestionStockRef[];
};

export type AdapterResult = {
  rowsUpserted: number;
  details?: Record<string, unknown>;
};

/**
 * Common interface for all ingestion adapters. Sources are swappable:
 * consumers only ever talk to the runner, never a concrete adapter.
 */
export interface IngestionAdapter {
  name: string;
  dataSource: DataSource;
  run(ctx: IngestionContext): Promise<AdapterResult>;
}
