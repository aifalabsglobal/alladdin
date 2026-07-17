-- CreateTable
CREATE TABLE "InstrumentPrediction" (
    "id" TEXT NOT NULL,
    "instrumentId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "asOf" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "targetAt" TIMESTAMP(3),
    "horizon" "PredictionHorizon" NOT NULL,
    "direction" "Direction" NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "probUp" DOUBLE PRECISION,
    "probSideways" DOUBLE PRECISION,
    "probDown" DOUBLE PRECISION,
    "expectedReturn" DOUBLE PRECISION,
    "returnLow" DOUBLE PRECISION,
    "returnHigh" DOUBLE PRECISION,
    "uncertainty" DOUBLE PRECISION,
    "runId" TEXT,
    "calibrated" BOOLEAN NOT NULL DEFAULT false,
    "insufficientData" BOOLEAN NOT NULL DEFAULT false,
    "mlModelId" TEXT NOT NULL,
    "features" JSONB NOT NULL,
    "outcome" "Direction",
    "correct" BOOLEAN,
    "realizedReturn" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstrumentPrediction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InstrumentPrediction_instrumentId_idx" ON "InstrumentPrediction"("instrumentId");

-- CreateIndex
CREATE INDEX "InstrumentPrediction_date_idx" ON "InstrumentPrediction"("date");

-- CreateIndex
CREATE INDEX "InstrumentPrediction_asOf_idx" ON "InstrumentPrediction"("asOf");

-- CreateIndex
CREATE INDEX "InstrumentPrediction_mlModelId_idx" ON "InstrumentPrediction"("mlModelId");

-- CreateIndex
CREATE INDEX "InstrumentPrediction_horizon_idx" ON "InstrumentPrediction"("horizon");

-- CreateIndex
CREATE INDEX "InstrumentPrediction_runId_idx" ON "InstrumentPrediction"("runId");

-- CreateIndex
CREATE UNIQUE INDEX "InstrumentPrediction_instrumentId_date_horizon_mlModelId_key" ON "InstrumentPrediction"("instrumentId", "date", "horizon", "mlModelId");

-- AddForeignKey
ALTER TABLE "InstrumentPrediction" ADD CONSTRAINT "InstrumentPrediction_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "Instrument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstrumentPrediction" ADD CONSTRAINT "InstrumentPrediction_mlModelId_fkey" FOREIGN KEY ("mlModelId") REFERENCES "MlModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
