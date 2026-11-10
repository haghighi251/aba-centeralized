-- CreateEnum
CREATE TYPE "TeamStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateTable
CREATE TABLE "teams" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "status" "TeamStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" INTEGER NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "teams_companyId_idx" ON "teams"("companyId");

-- CreateIndex
CREATE INDEX "teams_companyId_status_idx" ON "teams"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "teams_companyId_slug_key" ON "teams"("companyId", "slug");

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: add teamId as nullable first so existing rows can be backfilled
ALTER TABLE "environments" ADD COLUMN "teamId" INTEGER;

-- Backfill: create a "Default Team" for every company that already has environments
INSERT INTO "teams" ("name", "slug", "description", "companyId", "updatedAt")
SELECT 'Default Team', 'default-team', 'Auto-created to migrate existing environments to the new Team model.', e."companyId", CURRENT_TIMESTAMP
FROM (SELECT DISTINCT "companyId" FROM "environments") e;

-- Backfill: assign every existing environment to its company's Default Team
UPDATE "environments" e
SET "teamId" = t."id"
FROM "teams" t
WHERE t."companyId" = e."companyId" AND t."slug" = 'default-team';

-- AlterTable: now that every row has a teamId, enforce NOT NULL
ALTER TABLE "environments" ALTER COLUMN "teamId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "environments" ADD CONSTRAINT "environments_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DropIndex: superseded by team-scoped indexes below
DROP INDEX "environments_companyId_order_idx";

-- DropIndex: superseded by environments_teamId_slug_key below
DROP INDEX "environments_companyId_slug_key";

-- CreateIndex
CREATE INDEX "environments_teamId_idx" ON "environments"("teamId");

-- CreateIndex
CREATE INDEX "environments_teamId_order_idx" ON "environments"("teamId", "order");

-- CreateIndex
CREATE INDEX "environments_teamId_status_idx" ON "environments"("teamId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "environments_teamId_slug_key" ON "environments"("teamId", "slug");
