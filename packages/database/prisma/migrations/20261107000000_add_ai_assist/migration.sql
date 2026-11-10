-- AI assist (Phase B). All additive — safe on an existing database.

-- CreateEnum
CREATE TYPE "AiAssistFeature" AS ENUM ('SUGGEST_TESTS', 'EXPLAIN_RUN', 'IMPROVE_TEST');

-- AlterTable: per-plan monthly AI-token allowance (null/0 = AI not offered)
ALTER TABLE "subscription_plans" ADD COLUMN "aiMonthlyTokenAllowance" INTEGER;

-- CreateTable
CREATE TABLE "ai_usage_logs" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "feature" "AiAssistFeature" NOT NULL,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "costMicroUsd" INTEGER NOT NULL DEFAULT 0,
    "userId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_token_purchases" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "tokens" INTEGER NOT NULL,
    "pricePaidUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_token_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_usage_logs_companyId_createdAt_idx" ON "ai_usage_logs"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "ai_token_purchases_companyId_createdAt_idx" ON "ai_token_purchases"("companyId", "createdAt");

-- AddForeignKey
ALTER TABLE "ai_usage_logs" ADD CONSTRAINT "ai_usage_logs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_token_purchases" ADD CONSTRAINT "ai_token_purchases_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
