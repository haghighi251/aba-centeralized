-- E2E Security Testing feature.
-- Enums + tables for TestPage / TestDefinition / TestRun / TestResult, plus
-- additive, non-breaking columns on subscription_plans and
-- service_repository_connections (all nullable or defaulted — no backfill).

-- CreateEnum
CREATE TYPE "TestType" AS ENUM ('GLOBAL_SECURITY', 'CUSTOM_API', 'BROWSER');

-- CreateEnum
CREATE TYPE "TestEngine" AS ENUM ('POSTMAN', 'PLAYWRIGHT');

-- CreateEnum
CREATE TYPE "TestDefinitionSource" AS ENUM ('MANUAL', 'AI_SUGGESTED', 'SWAGGER_IMPORT', 'POSTMAN_IMPORT');

-- CreateEnum
CREATE TYPE "TestPageStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TestPageType" AS ENUM ('LOGIN', 'REGISTER', 'CHECKOUT', 'SEARCH', 'PROFILE', 'CONTACT', 'LANDING', 'DASHBOARD', 'API_ENDPOINT', 'CUSTOM', 'OTHER');

-- CreateEnum
CREATE TYPE "TestAuthKind" AS ENUM ('NONE', 'BEARER_TOKEN', 'API_KEY_HEADER', 'BASIC');

-- CreateEnum
CREATE TYPE "TestRunTrigger" AS ENUM ('MANUAL', 'SCHEDULED', 'WEBHOOK');

-- CreateEnum
CREATE TYPE "TestRunStatus" AS ENUM ('QUEUED', 'RUNNING', 'PASSED', 'FAILED', 'ERROR', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TestResultStatus" AS ENUM ('PASSED', 'FAILED', 'ERROR', 'SKIPPED');

-- AlterTable
ALTER TABLE "subscription_plans"
  ADD COLUMN "maxTestPages" INTEGER,
  ADD COLUMN "maxTestDefinitions" INTEGER,
  ADD COLUMN "maxTestRunsPerMonth" INTEGER,
  ADD COLUMN "allowScheduledTests" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "minTestScheduleIntervalHours" INTEGER,
  ADD COLUMN "allowWebhookTests" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "service_repository_connections"
  ADD COLUMN "runE2EOnTrigger" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "test_pages" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "pageType" "TestPageType" NOT NULL DEFAULT 'CUSTOM',
    "path" TEXT,
    "absoluteUrl" TEXT,
    "method" TEXT NOT NULL DEFAULT 'GET',
    "status" "TestPageStatus" NOT NULL DEFAULT 'ACTIVE',
    "accessConfig" JSONB,
    "authKind" "TestAuthKind" NOT NULL DEFAULT 'NONE',
    "authSecretEnc" TEXT,
    "scheduleEnabled" BOOLEAN NOT NULL DEFAULT false,
    "scheduleIntervalHours" INTEGER,
    "nextScheduledAt" TIMESTAMP(3),
    "runOnWebhook" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "serviceId" INTEGER NOT NULL,

    CONSTRAINT "test_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_definitions" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" "TestType" NOT NULL,
    "engine" "TestEngine" NOT NULL,
    "source" "TestDefinitionSource" NOT NULL DEFAULT 'MANUAL',
    "templateKey" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "assertions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "testPageId" INTEGER NOT NULL,

    CONSTRAINT "test_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_runs" (
    "id" SERIAL NOT NULL,
    "runKey" TEXT NOT NULL,
    "trigger" "TestRunTrigger" NOT NULL DEFAULT 'MANUAL',
    "status" "TestRunStatus" NOT NULL DEFAULT 'QUEUED',
    "totalCount" INTEGER NOT NULL DEFAULT 0,
    "passedCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "serviceId" INTEGER NOT NULL,
    "testPageId" INTEGER,
    "triggeredById" INTEGER,

    CONSTRAINT "test_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_results" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "status" "TestResultStatus" NOT NULL,
    "durationMs" INTEGER,
    "request" JSONB,
    "response" JSONB,
    "assertionResults" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "testRunId" INTEGER NOT NULL,
    "testDefinitionId" INTEGER,

    CONSTRAINT "test_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "test_pages_serviceId_idx" ON "test_pages"("serviceId");

-- CreateIndex
CREATE INDEX "test_pages_serviceId_status_idx" ON "test_pages"("serviceId", "status");

-- CreateIndex
CREATE INDEX "test_definitions_testPageId_idx" ON "test_definitions"("testPageId");

-- CreateIndex
CREATE INDEX "test_definitions_testPageId_enabled_idx" ON "test_definitions"("testPageId", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "test_runs_runKey_key" ON "test_runs"("runKey");

-- CreateIndex
CREATE INDEX "test_runs_serviceId_createdAt_idx" ON "test_runs"("serviceId", "createdAt");

-- CreateIndex
CREATE INDEX "test_runs_status_idx" ON "test_runs"("status");

-- CreateIndex
CREATE INDEX "test_results_testRunId_idx" ON "test_results"("testRunId");

-- AddForeignKey
ALTER TABLE "test_pages" ADD CONSTRAINT "test_pages_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_definitions" ADD CONSTRAINT "test_definitions_testPageId_fkey" FOREIGN KEY ("testPageId") REFERENCES "test_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_runs" ADD CONSTRAINT "test_runs_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_runs" ADD CONSTRAINT "test_runs_testPageId_fkey" FOREIGN KEY ("testPageId") REFERENCES "test_pages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_runs" ADD CONSTRAINT "test_runs_triggeredById_fkey" FOREIGN KEY ("triggeredById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_results" ADD CONSTRAINT "test_results_testRunId_fkey" FOREIGN KEY ("testRunId") REFERENCES "test_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_results" ADD CONSTRAINT "test_results_testDefinitionId_fkey" FOREIGN KEY ("testDefinitionId") REFERENCES "test_definitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
