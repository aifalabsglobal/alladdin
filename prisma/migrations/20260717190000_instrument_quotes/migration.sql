CREATE TABLE "InstrumentQuote" (
    "id" TEXT NOT NULL,
    "instrumentId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "bid" DOUBLE PRECISION,
    "ask" DOUBLE PRECISION,
    "changePct24h" DOUBLE PRECISION,
    "currency" TEXT NOT NULL,
    "quality" "ObservationQuality" NOT NULL DEFAULT 'OBSERVED',
    "observedAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "InstrumentQuote_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InstrumentQuote_instrumentId_provider_key" ON "InstrumentQuote"("instrumentId", "provider");
CREATE INDEX "InstrumentQuote_provider_observedAt_idx" ON "InstrumentQuote"("provider", "observedAt");
CREATE INDEX "InstrumentQuote_quality_idx" ON "InstrumentQuote"("quality");

ALTER TABLE "InstrumentQuote" ADD CONSTRAINT "InstrumentQuote_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "Instrument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
