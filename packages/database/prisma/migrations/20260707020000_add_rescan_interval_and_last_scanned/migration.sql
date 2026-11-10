-- AlterTable: promise a per-plan automatic rescan cadence
ALTER TABLE "subscription_plans" ADD COLUMN "rescanIntervalDays" INTEGER;

-- AlterTable: track when a service's full package set was last rescanned
ALTER TABLE "services" ADD COLUMN "lastScannedAt" TIMESTAMP(3);
