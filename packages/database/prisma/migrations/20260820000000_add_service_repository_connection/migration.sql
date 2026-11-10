-- CreateEnum
CREATE TYPE "RepositoryProvider" AS ENUM ('GITHUB');

-- CreateEnum
CREATE TYPE "RepositoryConnectionStatus" AS ENUM ('ACTIVE', 'PAUSED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ActivityEventType" ADD VALUE 'REPOSITORY_CONNECTED';
ALTER TYPE "ActivityEventType" ADD VALUE 'REPOSITORY_DISCONNECTED';
ALTER TYPE "ActivityEventType" ADD VALUE 'REPOSITORY_SECRET_ROTATED';
ALTER TYPE "ActivityEventType" ADD VALUE 'REPOSITORY_SCAN_TRIGGERED';

-- AlterTable
ALTER TABLE "notification_sweep_state" ALTER COLUMN "id" SET DEFAULT 1;

-- CreateTable
CREATE TABLE "service_repository_connections" (
    "id" SERIAL NOT NULL,
    "provider" "RepositoryProvider" NOT NULL DEFAULT 'GITHUB',
    "owner" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "watchedBranch" TEXT NOT NULL DEFAULT 'main',
    "webhookToken" TEXT NOT NULL,
    "webhookSecretEnc" TEXT NOT NULL,
    "status" "RepositoryConnectionStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastPingedAt" TIMESTAMP(3),
    "lastTriggeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "serviceId" INTEGER NOT NULL,
    "connectedById" INTEGER NOT NULL,

    CONSTRAINT "service_repository_connections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "service_repository_connections_webhookToken_key" ON "service_repository_connections"("webhookToken");

-- CreateIndex
CREATE UNIQUE INDEX "service_repository_connections_serviceId_key" ON "service_repository_connections"("serviceId");

-- CreateIndex
CREATE INDEX "service_repository_connections_connectedById_idx" ON "service_repository_connections"("connectedById");

-- AddForeignKey
ALTER TABLE "service_repository_connections" ADD CONSTRAINT "service_repository_connections_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_repository_connections" ADD CONSTRAINT "service_repository_connections_connectedById_fkey" FOREIGN KEY ("connectedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
