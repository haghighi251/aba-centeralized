-- CreateEnum
CREATE TYPE "RepositoryTriggerMode" AS ENUM ('INSTANT', 'PUSH_COUNT', 'TIME_INTERVAL');

-- AlterEnum
ALTER TYPE "ActivityEventType" ADD VALUE 'REPOSITORY_TRIGGER_SETTINGS_UPDATED';

-- AlterTable
ALTER TABLE "service_repository_connections" ADD COLUMN     "intervalDays" INTEGER,
ADD COLUMN     "pendingPushCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pushCountThreshold" INTEGER,
ADD COLUMN     "triggerMode" "RepositoryTriggerMode" NOT NULL DEFAULT 'INSTANT';

-- AlterTable
ALTER TABLE "subscription_plans" ADD COLUMN     "defaultIntervalDays" INTEGER,
ADD COLUMN     "defaultPushCountThreshold" INTEGER,
ADD COLUMN     "defaultTriggerMode" "RepositoryTriggerMode";
