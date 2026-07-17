-- CreateTable
CREATE TABLE "MacroIndicator" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "dataSource" "DataSource" NOT NULL DEFAULT 'MACRO',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MacroIndicator_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MacroIndicator_key_idx" ON "MacroIndicator"("key");

-- CreateIndex
CREATE INDEX "MacroIndicator_date_idx" ON "MacroIndicator"("date");

-- CreateIndex
CREATE UNIQUE INDEX "MacroIndicator_key_date_key" ON "MacroIndicator"("key", "date");
