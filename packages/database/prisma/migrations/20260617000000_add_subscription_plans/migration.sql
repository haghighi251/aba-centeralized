-- Migration: add_subscription_plans
-- Creates the subscription_plans table and links companies to their subscription plan.
-- Uses IF NOT EXISTS / DO blocks so it is safe to re-apply if a db:push already
-- created some of these objects.

-- ── subscription_plans ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "subscription_plans" (
    "id"                   SERIAL          NOT NULL,
    "name"                 TEXT            NOT NULL,
    "slug"                 TEXT            NOT NULL,
    "description"          TEXT,
    "maxServices"          INTEGER,
    "maxEnvironments"      INTEGER,
    "maxMonitoredBranches" INTEGER,
    "monthlyPrice"         DOUBLE PRECISION NOT NULL,
    "yearlyPrice"          DOUBLE PRECISION NOT NULL,
    "isActive"             BOOLEAN         NOT NULL DEFAULT true,
    "isDefault"            BOOLEAN         NOT NULL DEFAULT false,
    "createdAt"            TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"            TIMESTAMP(3)    NOT NULL,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "subscription_plans_name_key" ON "subscription_plans"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "subscription_plans_slug_key" ON "subscription_plans"("slug");

-- ── companies: add plan reference columns ─────────────────────────────────────

ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "payAsYouGo"         BOOLEAN  NOT NULL DEFAULT false;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "subscriptionPlanId" INTEGER;

CREATE INDEX IF NOT EXISTS "companies_subscriptionPlanId_idx" ON "companies"("subscriptionPlanId");

-- ── Foreign key (idempotent via DO block) ─────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'companies_subscriptionPlanId_fkey'
  ) THEN
    ALTER TABLE "companies"
      ADD CONSTRAINT "companies_subscriptionPlanId_fkey"
      FOREIGN KEY ("subscriptionPlanId")
      REFERENCES "subscription_plans"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
