-- CreateEnum
CREATE TYPE "ServiceStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('BFF', 'API_GATEWAY', 'MICROSERVICE', 'WORKER', 'FRONTEND', 'DATABASE', 'CACHE', 'MESSAGE_QUEUE', 'OTHER');

-- CreateTable
CREATE TABLE "services" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "ServiceType" NOT NULL DEFAULT 'OTHER',
    "description" TEXT,
    "baseUrl" TEXT NOT NULL,
    "rateLimitConfig" JSONB,
    "status" "ServiceStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" INTEGER NOT NULL,
    "environmentId" INTEGER NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "services_companyId_idx" ON "services"("companyId");

-- CreateIndex
CREATE INDEX "services_environmentId_idx" ON "services"("environmentId");

-- CreateIndex
CREATE INDEX "services_environmentId_status_idx" ON "services"("environmentId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "services_environmentId_slug_key" ON "services"("environmentId", "slug");

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "environments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

