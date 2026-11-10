-- Migration: add_notification_sweep_state
-- Singleton table used as an atomic multi-instance guard for worker's daily
-- notification digest sweep. See packages/database/prisma/schema.prisma for
-- the full rationale.

CREATE TABLE "notification_sweep_state" (
    "id"          INTEGER NOT NULL,
    "lastSweptAt" TIMESTAMP(3),

    CONSTRAINT "notification_sweep_state_pkey" PRIMARY KEY ("id")
);

-- Seed the single row the sweep's claim query depends on (id = 1, never
-- swept yet). Without this row the claim's UPDATE ... WHERE id = 1 would
-- always affect zero rows and the sweep would never run.
INSERT INTO "notification_sweep_state" ("id", "lastSweptAt") VALUES (1, NULL);
