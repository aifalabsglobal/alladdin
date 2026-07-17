CREATE TYPE "AssetClass" AS ENUM ('EQUITY', 'ETF', 'INDEX', 'FX', 'CRYPTO', 'COMMODITY', 'BOND_PROXY', 'FUTURE');
CREATE TYPE "InstrumentTier" AS ENUM ('HOT', 'WARM', 'COLD');
CREATE TYPE "SessionType" AS ENUM ('EXCHANGE', 'CONTINUOUS_24_5', 'CONTINUOUS_24_7');
CREATE TYPE "InstrumentInterval" AS ENUM ('M1', 'M5', 'M15', 'H1', 'D1');
CREATE TYPE "ObservationQuality" AS ENUM ('OBSERVED', 'DELAYED', 'STALE', 'SYNTHETIC', 'INCOMPLETE');

ALTER TYPE "DataSource" ADD VALUE 'COINGECKO';
ALTER TYPE "DataSource" ADD VALUE 'FRANKFURTER';
ALTER TYPE "DataSource" ADD VALUE 'TWELVE_DATA';
ALTER TYPE "DataSource" ADD VALUE 'ALPHA_VANTAGE';

ALTER TABLE "Stock" ADD COLUMN "instrumentId" TEXT;

CREATE TABLE "Venue" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "mic" TEXT,
    "name" TEXT NOT NULL,
    "countryCode" TEXT,
    "timezone" TEXT NOT NULL,
    "sessionType" "SessionType" NOT NULL,
    "openMinute" INTEGER,
    "closeMinute" INTEGER,
    "weekMask" TEXT NOT NULL DEFAULT '1,2,3,4,5',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Venue_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Instrument" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "assetClass" "AssetClass" NOT NULL,
    "venueId" TEXT,
    "quoteCurrency" TEXT NOT NULL,
    "baseCurrency" TEXT,
    "tickSize" DOUBLE PRECISION,
    "contractSize" DOUBLE PRECISION,
    "underlyingId" TEXT,
    "tier" "InstrumentTier" NOT NULL DEFAULT 'COLD',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Instrument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProviderInstrument" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerSymbol" TEXT NOT NULL,
    "instrumentId" TEXT NOT NULL,
    "capabilities" TEXT[],
    "displayAllowed" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProviderInstrument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InstrumentBar" (
    "id" TEXT NOT NULL,
    "instrumentId" TEXT NOT NULL,
    "interval" "InstrumentInterval" NOT NULL,
    "openTime" TIMESTAMP(3) NOT NULL,
    "closeTime" TIMESTAMP(3) NOT NULL,
    "open" DOUBLE PRECISION NOT NULL,
    "high" DOUBLE PRECISION NOT NULL,
    "low" DOUBLE PRECISION NOT NULL,
    "close" DOUBLE PRECISION NOT NULL,
    "volume" DOUBLE PRECISION,
    "vwap" DOUBLE PRECISION,
    "bid" DOUBLE PRECISION,
    "ask" DOUBLE PRECISION,
    "currency" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "adjusted" BOOLEAN NOT NULL DEFAULT false,
    "quality" "ObservationQuality" NOT NULL DEFAULT 'OBSERVED',
    "providerTs" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "InstrumentBar_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProviderBudgetUsage" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "requests" INTEGER NOT NULL DEFAULT 0,
    "credits" INTEGER NOT NULL DEFAULT 0,
    "failures" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProviderBudgetUsage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Venue_code_key" ON "Venue"("code");
CREATE UNIQUE INDEX "Venue_mic_key" ON "Venue"("mic");
CREATE INDEX "Venue_countryCode_idx" ON "Venue"("countryCode");
CREATE INDEX "Venue_sessionType_idx" ON "Venue"("sessionType");
CREATE INDEX "Instrument_assetClass_tier_idx" ON "Instrument"("assetClass", "tier");
CREATE INDEX "Instrument_symbol_idx" ON "Instrument"("symbol");
CREATE INDEX "Instrument_isActive_idx" ON "Instrument"("isActive");
CREATE INDEX "Instrument_underlyingId_idx" ON "Instrument"("underlyingId");
CREATE UNIQUE INDEX "Instrument_venueId_symbol_key" ON "Instrument"("venueId", "symbol");
CREATE INDEX "ProviderInstrument_instrumentId_idx" ON "ProviderInstrument"("instrumentId");
CREATE INDEX "ProviderInstrument_provider_enabled_idx" ON "ProviderInstrument"("provider", "enabled");
CREATE UNIQUE INDEX "ProviderInstrument_provider_providerSymbol_key" ON "ProviderInstrument"("provider", "providerSymbol");
CREATE UNIQUE INDEX "ProviderInstrument_provider_instrumentId_key" ON "ProviderInstrument"("provider", "instrumentId");
CREATE INDEX "InstrumentBar_instrumentId_interval_openTime_idx" ON "InstrumentBar"("instrumentId", "interval", "openTime");
CREATE INDEX "InstrumentBar_provider_openTime_idx" ON "InstrumentBar"("provider", "openTime");
CREATE INDEX "InstrumentBar_quality_idx" ON "InstrumentBar"("quality");
CREATE UNIQUE INDEX "InstrumentBar_instrumentId_interval_openTime_provider_key" ON "InstrumentBar"("instrumentId", "interval", "openTime", "provider");
CREATE INDEX "ProviderBudgetUsage_date_idx" ON "ProviderBudgetUsage"("date");
CREATE UNIQUE INDEX "ProviderBudgetUsage_provider_date_key" ON "ProviderBudgetUsage"("provider", "date");
CREATE UNIQUE INDEX "Stock_instrumentId_key" ON "Stock"("instrumentId");

ALTER TABLE "Instrument" ADD CONSTRAINT "Instrument_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Instrument" ADD CONSTRAINT "Instrument_underlyingId_fkey" FOREIGN KEY ("underlyingId") REFERENCES "Instrument"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProviderInstrument" ADD CONSTRAINT "ProviderInstrument_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "Instrument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InstrumentBar" ADD CONSTRAINT "InstrumentBar_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "Instrument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Stock" ADD CONSTRAINT "Stock_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "Instrument"("id") ON DELETE SET NULL ON UPDATE CASCADE;
