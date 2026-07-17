-- CreateEnum
CREATE TYPE "BarInterval" AS ENUM ('M15', 'H1', 'D1');

-- Extend prediction horizons for intraday and end-of-session analytics.
ALTER TYPE "PredictionHorizon" ADD VALUE 'M15';
ALTER TYPE "PredictionHorizon" ADD VALUE 'H1';
ALTER TYPE "PredictionHorizon" ADD VALUE 'EOD';

-- Extend feature snapshots while preserving existing daily rows.
DROP INDEX "FeatureSnapshot_stockId_date_key";

ALTER TABLE "FeatureSnapshot"
ADD COLUMN "asOf" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "featureSet" TEXT NOT NULL DEFAULT 'v1',
ADD COLUMN "interval" "BarInterval" NOT NULL DEFAULT 'D1',
ADD COLUMN "labelEod" "Direction",
ADD COLUMN "labelH1" "Direction",
ADD COLUMN "labelM15" "Direction";

-- Add point-in-time provenance, probability and outcome fields.
ALTER TABLE "Prediction"
ADD COLUMN "asOf" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "calibrated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "expectedReturn" DOUBLE PRECISION,
ADD COLUMN "insufficientData" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "probDown" DOUBLE PRECISION,
ADD COLUMN "probSideways" DOUBLE PRECISION,
ADD COLUMN "probUp" DOUBLE PRECISION,
ADD COLUMN "realizedReturn" DOUBLE PRECISION,
ADD COLUMN "returnHigh" DOUBLE PRECISION,
ADD COLUMN "returnLow" DOUBLE PRECISION,
ADD COLUMN "runId" TEXT,
ADD COLUMN "targetAt" TIMESTAMP(3),
ADD COLUMN "uncertainty" DOUBLE PRECISION;

CREATE TABLE "IntradayBar" (
    "id" TEXT NOT NULL,
    "stockId" TEXT NOT NULL,
    "interval" "BarInterval" NOT NULL,
    "openTime" TIMESTAMP(3) NOT NULL,
    "closeTime" TIMESTAMP(3) NOT NULL,
    "open" DOUBLE PRECISION NOT NULL,
    "high" DOUBLE PRECISION NOT NULL,
    "low" DOUBLE PRECISION NOT NULL,
    "close" DOUBLE PRECISION NOT NULL,
    "volume" DOUBLE PRECISION NOT NULL,
    "complete" BOOLEAN NOT NULL DEFAULT true,
    "dataSource" "DataSource" NOT NULL DEFAULT 'YAHOO_FINANCE',
    "providerTs" TIMESTAMP(3),
    "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "IntradayBar_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PredictionExplanation" (
    "id" TEXT NOT NULL,
    "predictionId" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "bullishDrivers" JSONB NOT NULL,
    "bearishDrivers" JSONB NOT NULL,
    "risks" JSONB NOT NULL,
    "caveats" JSONB NOT NULL,
    "evidence" JSONB NOT NULL,
    "rawResponse" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PredictionExplanation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "IntradayBar_stockId_interval_openTime_idx"
ON "IntradayBar"("stockId", "interval", "openTime");
CREATE INDEX "IntradayBar_interval_openTime_idx"
ON "IntradayBar"("interval", "openTime");
CREATE INDEX "IntradayBar_dataSource_idx" ON "IntradayBar"("dataSource");
CREATE UNIQUE INDEX "IntradayBar_stockId_interval_openTime_key"
ON "IntradayBar"("stockId", "interval", "openTime");
CREATE UNIQUE INDEX "PredictionExplanation_predictionId_key"
ON "PredictionExplanation"("predictionId");
CREATE INDEX "PredictionExplanation_promptVersion_idx"
ON "PredictionExplanation"("promptVersion");
CREATE INDEX "FeatureSnapshot_asOf_idx" ON "FeatureSnapshot"("asOf");
CREATE INDEX "FeatureSnapshot_interval_idx" ON "FeatureSnapshot"("interval");
CREATE UNIQUE INDEX "FeatureSnapshot_stockId_date_interval_featureSet_key"
ON "FeatureSnapshot"("stockId", "date", "interval", "featureSet");
CREATE INDEX "Prediction_asOf_idx" ON "Prediction"("asOf");
CREATE INDEX "Prediction_runId_idx" ON "Prediction"("runId");

ALTER TABLE "IntradayBar"
ADD CONSTRAINT "IntradayBar_stockId_fkey"
FOREIGN KEY ("stockId") REFERENCES "Stock"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PredictionExplanation"
ADD CONSTRAINT "PredictionExplanation_predictionId_fkey"
FOREIGN KEY ("predictionId") REFERENCES "Prediction"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
