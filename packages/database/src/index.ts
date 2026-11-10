/**
 * @aba/database — public API
 *
 * Import the singleton client or Prisma types from here in both
 * aba-bl (NestJS) and worker (Express).  Never import directly from
 * '@prisma/client' in application code; always go through this package
 * so the schema stays the single source of truth.
 *
 * Usage in Express / worker:
 *   import { prisma } from '@aba/database';
 *   const user = await prisma.user.findUnique({ where: { id: 1 } });
 *
 * Usage in NestJS (aba-bl):
 *   import { PrismaClient } from '@aba/database';
 *   export class PrismaService extends PrismaClient { ... }
 */

// ── Client ────────────────────────────────────────────────────────────────────

export { prisma, createPrismaClient } from './client';

// ── Prisma types ──────────────────────────────────────────────────────────────
// Re-export every type consumers need so they never have to import
// from @prisma/client directly.

export {
  PrismaClient,
  Prisma,

  // Models
  type User,
  type Company,
  type Post,
  type UserSettings,
  type PricingPackage,
  type Log,
  type Environment,
  type Team,
  type TeamMembership,
  type Service,
  type Package,
  type ServicePackage,
  type ServicePackageNotificationState,
  type Vulnerability,
  type VulnerabilityOnPackage,
  type SubscriptionPlan,
  type NotificationLog,
  type ActivityLog,
  type NotificationSweepState,
  type ServiceRepositoryConnection,
  type TestPage,
  type TestDefinition,
  type TestRun,
  type TestResult,
  type AiUsageLog,
  type AiTokenPurchase,

  // Enums
  UserRole,
  UserStatus,
  CompanyStatus,
  EnvironmentStatus,
  EnvironmentType,
  TeamStatus,
  ServiceStatus,
  ServiceType,
  DependencyEcosystem,
  ServicePackageStatus,
  NotificationRecipientKind,
  ActivityEventType,
  RepositoryProvider,
  RepositoryConnectionStatus,
  RepositoryTriggerMode,
  TestType,
  TestEngine,
  TestDefinitionSource,
  TestPageStatus,
  TestPageType,
  TestAuthKind,
  TestRunTrigger,
  TestRunStatus,
  TestResultStatus,
  AiAssistFeature,
} from '@prisma/client';
