-- Phase 8 foundation.
-- Idempotent because the production database was synchronized before this
-- migration was recorded; this also remains valid on a normally migrated DB.

DO $$ BEGIN
  CREATE TYPE "PaperOrderSide" AS ENUM ('BUY', 'SELL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PaperOrderStatus" AS ENUM ('PENDING', 'FILLED', 'CANCELLED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Prediction"
  ADD COLUMN IF NOT EXISTS "originBucket" TIMESTAMP(3);
UPDATE "Prediction"
SET "originBucket" = "asOf"
WHERE "originBucket" IS NULL;
ALTER TABLE "Prediction"
  ALTER COLUMN "originBucket" SET DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN "originBucket" SET NOT NULL;

ALTER TABLE "InstrumentPrediction"
  ADD COLUMN IF NOT EXISTS "originBucket" TIMESTAMP(3);
UPDATE "InstrumentPrediction"
SET "originBucket" = "asOf"
WHERE "originBucket" IS NULL;
ALTER TABLE "InstrumentPrediction"
  ALTER COLUMN "originBucket" SET DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN "originBucket" SET NOT NULL;

DROP INDEX IF EXISTS "Prediction_stockId_date_horizon_mlModelId_key";
DROP INDEX IF EXISTS "InstrumentPrediction_instrumentId_date_horizon_mlModelId_key";

CREATE INDEX IF NOT EXISTS "Prediction_originBucket_idx"
  ON "Prediction"("originBucket");
CREATE UNIQUE INDEX IF NOT EXISTS "Prediction_stockId_originBucket_horizon_mlModelId_key"
  ON "Prediction"("stockId", "originBucket", "horizon", "mlModelId");
CREATE INDEX IF NOT EXISTS "InstrumentPrediction_originBucket_idx"
  ON "InstrumentPrediction"("originBucket");
CREATE UNIQUE INDEX IF NOT EXISTS "InstrumentPrediction_instrumentId_originBucket_horizon_mlMo_key"
  ON "InstrumentPrediction"("instrumentId", "originBucket", "horizon", "mlModelId");

ALTER TABLE "WatchlistItem"
  ADD COLUMN IF NOT EXISTS "instrumentId" TEXT,
  ADD COLUMN IF NOT EXISTS "note" TEXT,
  ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0,
  ALTER COLUMN "stockId" DROP NOT NULL;

CREATE INDEX IF NOT EXISTS "WatchlistItem_instrumentId_idx"
  ON "WatchlistItem"("instrumentId");
CREATE UNIQUE INDEX IF NOT EXISTS "WatchlistItem_watchlistId_instrumentId_key"
  ON "WatchlistItem"("watchlistId", "instrumentId");

DO $$ BEGIN
  ALTER TABLE "WatchlistItem"
    ADD CONSTRAINT "WatchlistItem_instrumentId_fkey"
    FOREIGN KEY ("instrumentId") REFERENCES "Instrument"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "JobLock" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "owner" TEXT NOT NULL,
  "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "JobLock_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "JobLock_key_key" ON "JobLock"("key");
CREATE INDEX IF NOT EXISTS "JobLock_expiresAt_idx" ON "JobLock"("expiresAt");

CREATE TABLE IF NOT EXISTS "AlertEvent" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "severity" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "detail" TEXT NOT NULL,
  "sourceKey" TEXT NOT NULL,
  "acknowledged" BOOLEAN NOT NULL DEFAULT false,
  "acknowledgedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AlertEvent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "AlertEvent_sourceKey_key"
  ON "AlertEvent"("sourceKey");
CREATE INDEX IF NOT EXISTS "AlertEvent_userId_acknowledged_createdAt_idx"
  ON "AlertEvent"("userId", "acknowledged", "createdAt");
CREATE INDEX IF NOT EXISTS "AlertEvent_category_idx" ON "AlertEvent"("category");
CREATE INDEX IF NOT EXISTS "AlertEvent_createdAt_idx" ON "AlertEvent"("createdAt");

CREATE TABLE IF NOT EXISTS "PaperAccount" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "cash" DOUBLE PRECISION NOT NULL DEFAULT 100000,
  "equity" DOUBLE PRECISION NOT NULL DEFAULT 100000,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PaperAccount_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "PaperAccount_userId_key"
  ON "PaperAccount"("userId");

CREATE TABLE IF NOT EXISTS "PaperOrder" (
  "id" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "instrumentId" TEXT,
  "stockId" TEXT,
  "symbol" TEXT NOT NULL,
  "side" "PaperOrderSide" NOT NULL,
  "quantity" DOUBLE PRECISION NOT NULL,
  "limitPrice" DOUBLE PRECISION,
  "status" "PaperOrderStatus" NOT NULL DEFAULT 'PENDING',
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PaperOrder_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "PaperOrder_accountId_createdAt_idx"
  ON "PaperOrder"("accountId", "createdAt");
CREATE INDEX IF NOT EXISTS "PaperOrder_status_idx" ON "PaperOrder"("status");

CREATE TABLE IF NOT EXISTS "PaperFill" (
  "id" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "price" DOUBLE PRECISION NOT NULL,
  "quantity" DOUBLE PRECISION NOT NULL,
  "fee" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "filledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PaperFill_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "PaperFill_accountId_filledAt_idx"
  ON "PaperFill"("accountId", "filledAt");
CREATE INDEX IF NOT EXISTS "PaperFill_orderId_idx" ON "PaperFill"("orderId");

CREATE TABLE IF NOT EXISTS "PaperPosition" (
  "id" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "instrumentId" TEXT,
  "stockId" TEXT,
  "symbol" TEXT NOT NULL,
  "quantity" DOUBLE PRECISION NOT NULL,
  "avgCost" DOUBLE PRECISION NOT NULL,
  "marketValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "unrealizedPnL" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaperPosition_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "PaperPosition_accountId_idx"
  ON "PaperPosition"("accountId");
CREATE UNIQUE INDEX IF NOT EXISTS "PaperPosition_accountId_symbol_key"
  ON "PaperPosition"("accountId", "symbol");

CREATE TABLE IF NOT EXISTS "CalibrationArtifact" (
  "id" TEXT NOT NULL,
  "modelKey" TEXT NOT NULL,
  "horizon" "PredictionHorizon" NOT NULL,
  "method" TEXT NOT NULL,
  "mapping" JSONB NOT NULL,
  "samples" INTEGER NOT NULL,
  "ece" DOUBLE PRECISION,
  "trainedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CalibrationArtifact_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "CalibrationArtifact_modelKey_idx"
  ON "CalibrationArtifact"("modelKey");
CREATE UNIQUE INDEX IF NOT EXISTS "CalibrationArtifact_modelKey_horizon_method_key"
  ON "CalibrationArtifact"("modelKey", "horizon", "method");

DO $$ BEGIN
  ALTER TABLE "PaperOrder"
    ADD CONSTRAINT "PaperOrder_accountId_fkey"
    FOREIGN KEY ("accountId") REFERENCES "PaperAccount"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "PaperFill"
    ADD CONSTRAINT "PaperFill_accountId_fkey"
    FOREIGN KEY ("accountId") REFERENCES "PaperAccount"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "PaperFill"
    ADD CONSTRAINT "PaperFill_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "PaperOrder"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "PaperPosition"
    ADD CONSTRAINT "PaperPosition_accountId_fkey"
    FOREIGN KEY ("accountId") REFERENCES "PaperAccount"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
