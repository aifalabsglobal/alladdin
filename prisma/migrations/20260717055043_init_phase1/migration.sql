-- CreateEnum
CREATE TYPE "Exchange" AS ENUM ('NSE', 'BSE');

-- CreateEnum
CREATE TYPE "InfluencerCategory" AS ENUM ('TECHNICAL', 'FUNDAMENTAL', 'SENTIMENT', 'MACRO', 'FLOW');

-- CreateEnum
CREATE TYPE "InfluencerScope" AS ENUM ('STOCK', 'SECTOR', 'MARKET');

-- CreateEnum
CREATE TYPE "HealthBand" AS ENUM ('STRONG', 'HEALTHY', 'NEUTRAL', 'WEAK', 'CRITICAL');

-- CreateEnum
CREATE TYPE "PredictionHorizon" AS ENUM ('D1', 'W1', 'M1');

-- CreateEnum
CREATE TYPE "Direction" AS ENUM ('UP', 'DOWN', 'SIDEWAYS');

-- CreateEnum
CREATE TYPE "MlKind" AS ENUM ('RULES', 'RANDOM_FOREST', 'LSTM', 'GBM', 'ENSEMBLE');

-- CreateEnum
CREATE TYPE "MlStatus" AS ENUM ('TRAINING', 'ACTIVE', 'SHADOW', 'RETIRED');

-- CreateEnum
CREATE TYPE "DataSource" AS ENUM ('SYNTHETIC', 'YAHOO_FINANCE', 'NSE_BHAVCOPY', 'FII_DII', 'NEWS_RSS', 'MACRO', 'COMPUTED');

-- CreateTable
CREATE TABLE "Sector" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "healthScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sector_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stock" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "exchange" "Exchange" NOT NULL,
    "name" TEXT NOT NULL,
    "sectorId" TEXT NOT NULL,
    "industry" TEXT,
    "marketCap" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceBar" (
    "id" TEXT NOT NULL,
    "stockId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "open" DOUBLE PRECISION NOT NULL,
    "high" DOUBLE PRECISION NOT NULL,
    "low" DOUBLE PRECISION NOT NULL,
    "close" DOUBLE PRECISION NOT NULL,
    "volume" DOUBLE PRECISION NOT NULL,
    "deliveryPct" DOUBLE PRECISION,
    "dataSource" "DataSource" NOT NULL DEFAULT 'SYNTHETIC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriceBar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fundamental" (
    "id" TEXT NOT NULL,
    "stockId" TEXT NOT NULL,
    "asOfDate" DATE NOT NULL,
    "pe" DOUBLE PRECISION,
    "pb" DOUBLE PRECISION,
    "eps" DOUBLE PRECISION,
    "epsGrowthYoY" DOUBLE PRECISION,
    "debtToEquity" DOUBLE PRECISION,
    "roe" DOUBLE PRECISION,
    "dataSource" "DataSource" NOT NULL DEFAULT 'SYNTHETIC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Fundamental_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Influencer" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "InfluencerCategory" NOT NULL,
    "scope" "InfluencerScope" NOT NULL,
    "defaultWeight" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Influencer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InfluencerReading" (
    "id" TEXT NOT NULL,
    "influencerId" TEXT NOT NULL,
    "stockId" TEXT,
    "sectorId" TEXT,
    "date" DATE NOT NULL,
    "rawValue" DOUBLE PRECISION NOT NULL,
    "normalizedScore" DOUBLE PRECISION NOT NULL,
    "impactPoints" DOUBLE PRECISION NOT NULL,
    "reasonText" TEXT NOT NULL,
    "dataSource" "DataSource" NOT NULL DEFAULT 'SYNTHETIC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InfluencerReading_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthScore" (
    "id" TEXT NOT NULL,
    "stockId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "band" "HealthBand" NOT NULL,
    "topPositiveInfluencerId" TEXT,
    "topNegativeInfluencerId" TEXT,
    "breakdown" JSONB NOT NULL,
    "dataSource" "DataSource" NOT NULL DEFAULT 'SYNTHETIC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HealthScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketSnapshot" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "niftyClose" DOUBLE PRECISION NOT NULL,
    "sensexClose" DOUBLE PRECISION NOT NULL,
    "marketHealthScore" DOUBLE PRECISION NOT NULL,
    "breadthAdvancers" INTEGER NOT NULL,
    "breadthDecliners" INTEGER NOT NULL,
    "fiiNet" DOUBLE PRECISION NOT NULL,
    "diiNet" DOUBLE PRECISION NOT NULL,
    "indiaVix" DOUBLE PRECISION NOT NULL,
    "dataSource" "DataSource" NOT NULL DEFAULT 'SYNTHETIC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MlModel" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "kind" "MlKind" NOT NULL,
    "status" "MlStatus" NOT NULL DEFAULT 'SHADOW',
    "hyperparams" JSONB,
    "metrics" JSONB,
    "trainedAt" TIMESTAMP(3),
    "artifactPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MlModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prediction" (
    "id" TEXT NOT NULL,
    "stockId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "horizon" "PredictionHorizon" NOT NULL,
    "direction" "Direction" NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "mlModelId" TEXT NOT NULL,
    "features" JSONB NOT NULL,
    "outcome" "Direction",
    "correct" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prediction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureSnapshot" (
    "id" TEXT NOT NULL,
    "stockId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "features" JSONB NOT NULL,
    "label1d" "Direction",
    "label1w" "Direction",
    "label1m" "Direction",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Watchlist" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Watchlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WatchlistItem" (
    "id" TEXT NOT NULL,
    "watchlistId" TEXT NOT NULL,
    "stockId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WatchlistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsItem" (
    "id" TEXT NOT NULL,
    "stockId" TEXT,
    "sectorId" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "contentHash" TEXT,
    "sentiment" DOUBLE PRECISION,
    "sentimentReason" TEXT,
    "embedding" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiUsage" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "completionTokens" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "date" DATE NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IngestionRun" (
    "id" TEXT NOT NULL,
    "adapter" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "rowsUpserted" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "dataSource" "DataSource",
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IngestionRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserColumnPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pageKey" TEXT NOT NULL,
    "columns" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserColumnPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Sector_name_key" ON "Sector"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Stock_symbol_key" ON "Stock"("symbol");

-- CreateIndex
CREATE INDEX "Stock_sectorId_idx" ON "Stock"("sectorId");

-- CreateIndex
CREATE INDEX "Stock_exchange_idx" ON "Stock"("exchange");

-- CreateIndex
CREATE INDEX "Stock_isActive_idx" ON "Stock"("isActive");

-- CreateIndex
CREATE INDEX "PriceBar_stockId_idx" ON "PriceBar"("stockId");

-- CreateIndex
CREATE INDEX "PriceBar_date_idx" ON "PriceBar"("date");

-- CreateIndex
CREATE INDEX "PriceBar_dataSource_idx" ON "PriceBar"("dataSource");

-- CreateIndex
CREATE UNIQUE INDEX "PriceBar_stockId_date_key" ON "PriceBar"("stockId", "date");

-- CreateIndex
CREATE INDEX "Fundamental_stockId_idx" ON "Fundamental"("stockId");

-- CreateIndex
CREATE INDEX "Fundamental_asOfDate_idx" ON "Fundamental"("asOfDate");

-- CreateIndex
CREATE INDEX "Fundamental_dataSource_idx" ON "Fundamental"("dataSource");

-- CreateIndex
CREATE UNIQUE INDEX "Fundamental_stockId_asOfDate_key" ON "Fundamental"("stockId", "asOfDate");

-- CreateIndex
CREATE UNIQUE INDEX "Influencer_key_key" ON "Influencer"("key");

-- CreateIndex
CREATE INDEX "InfluencerReading_influencerId_idx" ON "InfluencerReading"("influencerId");

-- CreateIndex
CREATE INDEX "InfluencerReading_stockId_idx" ON "InfluencerReading"("stockId");

-- CreateIndex
CREATE INDEX "InfluencerReading_sectorId_idx" ON "InfluencerReading"("sectorId");

-- CreateIndex
CREATE INDEX "InfluencerReading_date_idx" ON "InfluencerReading"("date");

-- CreateIndex
CREATE INDEX "InfluencerReading_dataSource_idx" ON "InfluencerReading"("dataSource");

-- CreateIndex
CREATE UNIQUE INDEX "InfluencerReading_influencerId_stockId_date_key" ON "InfluencerReading"("influencerId", "stockId", "date");

-- CreateIndex
CREATE INDEX "HealthScore_stockId_idx" ON "HealthScore"("stockId");

-- CreateIndex
CREATE INDEX "HealthScore_date_idx" ON "HealthScore"("date");

-- CreateIndex
CREATE INDEX "HealthScore_band_idx" ON "HealthScore"("band");

-- CreateIndex
CREATE INDEX "HealthScore_topPositiveInfluencerId_idx" ON "HealthScore"("topPositiveInfluencerId");

-- CreateIndex
CREATE INDEX "HealthScore_topNegativeInfluencerId_idx" ON "HealthScore"("topNegativeInfluencerId");

-- CreateIndex
CREATE INDEX "HealthScore_dataSource_idx" ON "HealthScore"("dataSource");

-- CreateIndex
CREATE UNIQUE INDEX "HealthScore_stockId_date_key" ON "HealthScore"("stockId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "MarketSnapshot_date_key" ON "MarketSnapshot"("date");

-- CreateIndex
CREATE INDEX "MarketSnapshot_dataSource_idx" ON "MarketSnapshot"("dataSource");

-- CreateIndex
CREATE INDEX "MlModel_status_idx" ON "MlModel"("status");

-- CreateIndex
CREATE INDEX "MlModel_kind_idx" ON "MlModel"("kind");

-- CreateIndex
CREATE UNIQUE INDEX "MlModel_key_version_key" ON "MlModel"("key", "version");

-- CreateIndex
CREATE INDEX "Prediction_stockId_idx" ON "Prediction"("stockId");

-- CreateIndex
CREATE INDEX "Prediction_date_idx" ON "Prediction"("date");

-- CreateIndex
CREATE INDEX "Prediction_mlModelId_idx" ON "Prediction"("mlModelId");

-- CreateIndex
CREATE INDEX "Prediction_horizon_idx" ON "Prediction"("horizon");

-- CreateIndex
CREATE UNIQUE INDEX "Prediction_stockId_date_horizon_mlModelId_key" ON "Prediction"("stockId", "date", "horizon", "mlModelId");

-- CreateIndex
CREATE INDEX "FeatureSnapshot_stockId_idx" ON "FeatureSnapshot"("stockId");

-- CreateIndex
CREATE INDEX "FeatureSnapshot_date_idx" ON "FeatureSnapshot"("date");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureSnapshot_stockId_date_key" ON "FeatureSnapshot"("stockId", "date");

-- CreateIndex
CREATE INDEX "Watchlist_userId_idx" ON "Watchlist"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Watchlist_userId_name_key" ON "Watchlist"("userId", "name");

-- CreateIndex
CREATE INDEX "WatchlistItem_watchlistId_idx" ON "WatchlistItem"("watchlistId");

-- CreateIndex
CREATE INDEX "WatchlistItem_stockId_idx" ON "WatchlistItem"("stockId");

-- CreateIndex
CREATE UNIQUE INDEX "WatchlistItem_watchlistId_stockId_key" ON "WatchlistItem"("watchlistId", "stockId");

-- CreateIndex
CREATE INDEX "NewsItem_stockId_idx" ON "NewsItem"("stockId");

-- CreateIndex
CREATE INDEX "NewsItem_sectorId_idx" ON "NewsItem"("sectorId");

-- CreateIndex
CREATE INDEX "NewsItem_publishedAt_idx" ON "NewsItem"("publishedAt");

-- CreateIndex
CREATE INDEX "NewsItem_contentHash_idx" ON "NewsItem"("contentHash");

-- CreateIndex
CREATE UNIQUE INDEX "NewsItem_url_key" ON "NewsItem"("url");

-- CreateIndex
CREATE INDEX "ApiUsage_provider_date_idx" ON "ApiUsage"("provider", "date");

-- CreateIndex
CREATE INDEX "ApiUsage_date_idx" ON "ApiUsage"("date");

-- CreateIndex
CREATE INDEX "ApiUsage_purpose_idx" ON "ApiUsage"("purpose");

-- CreateIndex
CREATE INDEX "IngestionRun_adapter_idx" ON "IngestionRun"("adapter");

-- CreateIndex
CREATE INDEX "IngestionRun_startedAt_idx" ON "IngestionRun"("startedAt");

-- CreateIndex
CREATE INDEX "IngestionRun_status_idx" ON "IngestionRun"("status");

-- CreateIndex
CREATE INDEX "UserColumnPreference_userId_idx" ON "UserColumnPreference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserColumnPreference_userId_pageKey_key" ON "UserColumnPreference"("userId", "pageKey");

-- AddForeignKey
ALTER TABLE "Stock" ADD CONSTRAINT "Stock_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceBar" ADD CONSTRAINT "PriceBar_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "Stock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fundamental" ADD CONSTRAINT "Fundamental_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "Stock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InfluencerReading" ADD CONSTRAINT "InfluencerReading_influencerId_fkey" FOREIGN KEY ("influencerId") REFERENCES "Influencer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InfluencerReading" ADD CONSTRAINT "InfluencerReading_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "Stock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InfluencerReading" ADD CONSTRAINT "InfluencerReading_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthScore" ADD CONSTRAINT "HealthScore_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "Stock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthScore" ADD CONSTRAINT "HealthScore_topPositiveInfluencerId_fkey" FOREIGN KEY ("topPositiveInfluencerId") REFERENCES "Influencer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthScore" ADD CONSTRAINT "HealthScore_topNegativeInfluencerId_fkey" FOREIGN KEY ("topNegativeInfluencerId") REFERENCES "Influencer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prediction" ADD CONSTRAINT "Prediction_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "Stock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prediction" ADD CONSTRAINT "Prediction_mlModelId_fkey" FOREIGN KEY ("mlModelId") REFERENCES "MlModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureSnapshot" ADD CONSTRAINT "FeatureSnapshot_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "Stock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchlistItem" ADD CONSTRAINT "WatchlistItem_watchlistId_fkey" FOREIGN KEY ("watchlistId") REFERENCES "Watchlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchlistItem" ADD CONSTRAINT "WatchlistItem_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "Stock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsItem" ADD CONSTRAINT "NewsItem_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "Stock"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsItem" ADD CONSTRAINT "NewsItem_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE SET NULL ON UPDATE CASCADE;
