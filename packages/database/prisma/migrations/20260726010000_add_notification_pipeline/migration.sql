-- Migration: add_notification_pipeline
-- Adds the data model for the Kafka-driven, worker-owned vulnerability
-- notification digest: a single "primary owner" designation per company, a
-- generic User<->Team membership, per-(service,package) notification
-- tracking state, a permanent notification log, and a generic activity/audit
-- log. See packages/database/prisma/schema.prisma for the full rationale
-- comments on each model.

-- ── CreateEnum ────────────────────────────────────────────────────────────────

CREATE TYPE "NotificationRecipientKind" AS ENUM ('PRIMARY_OWNER', 'TEAM_BUSINESS_ADMIN');

CREATE TYPE "ActivityEventType" AS ENUM (
    'NOTIFICATION_SENT',
    'NOTIFICATION_SKIPPED',
    'PACKAGE_VULN_VIEWED',
    'PACKAGE_UPDATED',
    'PACKAGE_MUTED',
    'PACKAGE_UNMUTED',
    'PACKAGE_SNOOZED',
    'PACKAGE_REMOVED'
);

-- ── companies.primaryOwnerId ──────────────────────────────────────────────────

ALTER TABLE "companies" ADD COLUMN "primaryOwnerId" INTEGER;

CREATE UNIQUE INDEX "companies_primaryOwnerId_key" ON "companies"("primaryOwnerId");

ALTER TABLE "companies"
    ADD CONSTRAINT "companies_primaryOwnerId_fkey"
    FOREIGN KEY ("primaryOwnerId")
    REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- ── team_memberships ──────────────────────────────────────────────────────────

CREATE TABLE "team_memberships" (
    "id"        SERIAL       NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId"    INTEGER      NOT NULL,
    "teamId"    INTEGER      NOT NULL,

    CONSTRAINT "team_memberships_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "team_memberships_userId_teamId_key" ON "team_memberships"("userId", "teamId");

CREATE INDEX "team_memberships_userId_idx" ON "team_memberships"("userId");

CREATE INDEX "team_memberships_teamId_idx" ON "team_memberships"("teamId");

ALTER TABLE "team_memberships"
    ADD CONSTRAINT "team_memberships_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "team_memberships"
    ADD CONSTRAINT "team_memberships_teamId_fkey"
    FOREIGN KEY ("teamId") REFERENCES "teams"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- ── service_package_notification_states ───────────────────────────────────────

CREATE TABLE "service_package_notification_states" (
    "id"               SERIAL       NOT NULL,
    "muted"            BOOLEAN      NOT NULL DEFAULT false,
    "mutedAt"          TIMESTAMP(3),
    "lastNotifiedAt"   TIMESTAMP(3),
    "nextNotifyAt"     TIMESTAMP(3),
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL,
    "servicePackageId" INTEGER      NOT NULL,
    "mutedByUserId"    INTEGER,

    CONSTRAINT "service_package_notification_states_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "service_package_notification_states_servicePackageId_key"
    ON "service_package_notification_states"("servicePackageId");

CREATE INDEX "service_package_notification_states_muted_idx" ON "service_package_notification_states"("muted");

CREATE INDEX "service_package_notification_states_nextNotifyAt_idx" ON "service_package_notification_states"("nextNotifyAt");

ALTER TABLE "service_package_notification_states"
    ADD CONSTRAINT "service_package_notification_states_servicePackageId_fkey"
    FOREIGN KEY ("servicePackageId") REFERENCES "service_packages"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "service_package_notification_states"
    ADD CONSTRAINT "service_package_notification_states_mutedByUserId_fkey"
    FOREIGN KEY ("mutedByUserId") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- ── notification_logs ─────────────────────────────────────────────────────────
-- No foreign keys by design: this audit record must survive deletion of the
-- company/service/user it references (see schema.prisma comment).

CREATE TABLE "notification_logs" (
    "id"              SERIAL                      NOT NULL,
    "companyId"       INTEGER                     NOT NULL,
    "serviceId"       INTEGER                     NOT NULL,
    "sentAt"          TIMESTAMP(3)                NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recipientKind"   "NotificationRecipientKind" NOT NULL,
    "recipientUserId" INTEGER,
    "recipientEmail"  TEXT                        NOT NULL,
    "packageCount"    INTEGER                     NOT NULL,
    "details"         JSONB                       NOT NULL,

    CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "notification_logs_companyId_sentAt_idx" ON "notification_logs"("companyId", "sentAt");

CREATE INDEX "notification_logs_serviceId_sentAt_idx" ON "notification_logs"("serviceId", "sentAt");

-- ── activity_logs ──────────────────────────────────────────────────────────────
-- No foreign keys by design, same rationale as notification_logs.

CREATE TABLE "activity_logs" (
    "id"               SERIAL              NOT NULL,
    "eventType"        "ActivityEventType" NOT NULL,
    "actorUserId"      INTEGER,
    "companyId"        INTEGER             NOT NULL,
    "environmentId"    INTEGER,
    "serviceId"        INTEGER,
    "servicePackageId" INTEGER,
    "timestamp"        TIMESTAMP(3)        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata"         JSONB,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "activity_logs_companyId_timestamp_idx" ON "activity_logs"("companyId", "timestamp");

CREATE INDEX "activity_logs_companyId_environmentId_timestamp_idx" ON "activity_logs"("companyId", "environmentId", "timestamp");

CREATE INDEX "activity_logs_serviceId_timestamp_idx" ON "activity_logs"("serviceId", "timestamp");

CREATE INDEX "activity_logs_eventType_timestamp_idx" ON "activity_logs"("eventType", "timestamp");
