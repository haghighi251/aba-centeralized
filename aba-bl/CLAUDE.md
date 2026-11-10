# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
This software is a backend service which provides some API endpoints to execute some functionality. The purpose is providing some features to different companies as our customer to provide some information of their software and we try to find security issues in their softwares. Each company can have some different environments for their services like dev, test, prod, etc. This means they can make different stages, then for each stage they can register different services they have, for each service they can implement API endpoints and expected entry data and also result. Then, we can run our E2E security tests to make sure all the API endpoints are safe. Another feature is that we get a list of packages they use and from our database we can see if those packages are risky and have any security issue so then we can let them know in different ways.

## Architecture

NestJS BFF/backend. All feature code is in `src/modules/`; cross-cutting utilities are in `src/shared/`.

We implement different modules here like users, auth, company, admin, etc. Each entity type should have it's own module where we make different URLs for that module and usecases, services, etc.
The auth module implements JWT issuance, RBAC, company onboarding.
The company module is about everything that is related to a company entity in our software.
Environment:	CRUD operations on each environment. The environment is about a company can have some different environments for their services like dev, stage, prod, etc.
Each company can have some different features like below:
1: Service:	Each service is a micro-service they use like a BFF, API-Gateway, etc... Each service should have some different parts like: Service registration, base URL, rate-limit config, association with env.
2: Package:	Package.json upload, parsing, trigger scan. Here customer are able to set a packages list that each of their services is using.
3: Vulnerability:	Query/upsert vulnerabilities from OSV, serve findings to customers.
4: TestDefinition:	Custom/global test creation, Swagger/Postman import, template management.
5: TestRun:	Schedule test runs (manual, webhook, cron), produce test.scheduled events.
6: Webhook:	Implemented, scoped to package-scan triggering only — `src/modules/webhook/` (`GithubWebhookController`, `POST /webhooks/github/:webhookToken`) ingests GitHub push/release events, validates the `X-Hub-Signature-256` HMAC signature, and maps the URL's opaque token to a `ServiceRepositoryConnection` (`src/modules/repository-connection/`). The E2E-test-execution webhook (`test.scheduled`, item 5 above) is a separate, still-aspirational flow and does not share this endpoint. See `aba-bl/README.md#repository-connections-github-triggered-rescans` for the full design (trigger cadence, one-prod-environment-per-team rule, plan-tier defaults).
7: Scheduler:	Implemented in `src/modules/scheduler/`. `PackageRescanSchedulerService` runs on a `@Cron` tick (`RESCAN_POLL_CRON`) and publishes `package.scan` for every active service whose company's `SubscriptionPlan.rescanIntervalDays` makes it due — see `aba-bl/README.md#plan-driven-package-rescanning` for the full pipeline (worker queries OSV.dev, publishes `vulnerability.fetched`, `src/modules/service-package/consumers/vulnerabilityFetchedConsumer.service.ts` persists + notifies + stamps `Service.lastScannedAt`). This is separate from the manual add-package/bulk-import scan path (`VulnerabilityScanService.scanPackages()`), which is unchanged.
8: Notification:	Vulnerability notifications no longer go through a generic `notification.req` topic (that remains undone/aspirational for other alert types, e.g. test failures). Instead, `VulnerabilityScanService.persistScanResults()` — shared by the manual and scheduled scan paths — publishes `vulnerability.notification.pending` whenever it finds an affected package, replacing the direct synchronous email call that used to live there. `worker` owns everything downstream: tracking state, the daily digest sweep, recipient resolution, and actually sending email. See `src/modules/service-package/dtos/UpdateServicePackageNotificationDto.ts` and the `updateNotificationPreference` endpoint for the customer-facing mute/snooze action, and `src/shared/repositories/activityLog.repository.ts` for the audit trail the admin dashboard reads.
9: Usage:	Meter: test runs, service counts, for billing.
9a: Team membership:	`src/modules/team/` also exposes a generic `TeamMembership` (user↔team) assignment, used both for future general user-management and — today — to resolve which `BUSINESS_ADMIN` users receive a service's vulnerability digest (the team that owns the service's environment).
9b: Repository connections:	`src/modules/repository-connection/` — customer-facing CRUD for connecting one GitHub repo+branch per `Service` (never reads repo contents; webhook-signature-only trust). A connection's `triggerMode` (`INSTANT`/`PUSH_COUNT`/`TIME_INTERVAL`) decides how a matching webhook delivery turns into a `package.scan` publish, defaulting per `SubscriptionPlan`/`Environment.isProduction` — see the README section linked above. Connections carry a `provider` (`GITHUB` default, or `BITBUCKET` Cloud); Bitbucket deliveries arrive at `POST /webhooks/bitbucket/:webhookToken` (`BitbucketWebhookController`, `X-Hub-Signature` HMAC, `repo:push` + `diagnostics:ping`) and feed the same cadence/sweep/`package.scan` pipeline. `EnvironmentService` now also enforces at most one `isProduction: true` environment per team, since that flag is what "is this branch prod" derives from.
Integration with Kafka:
The API acts as a producer for test and scanning events using kafkajs (plain pub/sub, not `@nestjs/microservices`'s Kafka transport — see `src/modules/kafka/`).
It does not do the actual heavy processing (OSV.dev queries happen in `worker`); it reads result topics (`vulnerability.fetched`) to update records, and publishes `vulnerability.notification.pending` for `worker` to track/notify on instead of notifying itself.
Currently implemented: `package.scan` (produced by `PackageRescanSchedulerService`), `vulnerability.fetched` (consumed by `VulnerabilityFetchedConsumerService`), and `vulnerability.notification.pending` (produced from `VulnerabilityScanService`, consumed in `worker`). `test.scheduled` and the generic `notification.req` remain undone.

## Code Architecture

### `aba-bl` — Feature-Module Architecture
All feature code lives under `src/modules/`. Each module is self-contained with consistent internal layering:

```
src/modules/
  auth/         controllers/ services/ usecases/ dtos/ guards/ types/ helpers/
  users/        controllers/ services/ usecases/ dtos/ repositories/ types/ helpers/
  company/      controllers/ services/ usecases/ dtos/ repositories/ types/ mappers/
  admin/        controllers/ services/ usecases/ dtos/ guards/ types/ helpers/
  shared/       controllers/ services/ modules/ dtos/ exceptions/ types/ helpers/
```

Within each module:
- **`controllers/`** — NestJS route handlers. Validate input with `ZodValidationPipe` (see `src/shared/nest/pipes/validation.pipe.ts`). In Controllers, we don't do any business logic and just permissions, validating, routing, returning a result. DTOs validated with Zod via `ZodValidationPipe`.
- **`usecases/`** — One class per operation, implementing `UseCase<IRequest, IResponse>` from `src/modules/shared/types/useCase.ts`. Orchestrate services and throw HTTP exceptions.
- **`services/`** — Business logic returning `neverthrow` `Result<T, E>` types.
- **`repositories/`** — Concrete Prisma repositories extending `BaseRepository` (in `src/shared/repositories/`)
- **`guards/`** — NestJS guards (e.g., `AuthGuard`, `AdminGuard`)

Each module follows: `controllers/ → usecases/ → services/ → repositories/`

Cross-cutting concerns live in `src/shared/`: constants, middleware, base repository, utility functions, Swagger helpers (`src/shared/swagger/`), NestJS pipes/interceptors (`src/shared/nest/`).

The `AppModule` (`src/app.module.ts`) wires all modules, controllers, and use cases together explicitly — use cases are registered as module providers rather than auto-discovered. Use cases are **not** auto-discovered — they must be listed explicitly in the `providers` array of `AppModule` (`src/app.module.ts`) or their feature module. Forgetting this causes `Cannot inject dependency` errors at startup.

**Database setup**: PostgreSQL (Prisma) handles `User`, `Company`, and `Post` via `PrismaService` in `src/modules/shared/services/prisma/`. Prisma multi-file schema lives in `prisma/` (flat: `schema.prisma`, `user.prisma`, `company.prisma`, `post.prisma`) using the `prismaSchemaFolder` feature; all `db:*` scripts pass `--schema ./prisma`. Prisma client is generated to the pnpm-internal `.prisma/client` path.

`neverthrow` is used for result types in domain/use-case return values.

**PostgreSQL (Prisma)** — primary store for `User`, `Company`, `Post`, etc... Access via `UserRepository` / `CompanyRepository` which extend `BaseRepository`. We use Postgres for everything means PostgreSQL is the only database for this project.

**MongoDB (Mongoose)** — removed entirely. PostgreSQL (Prisma) is the only datastore; the
former Mongo-backed collections (`UserMeta`, `Packages`, `Log`, etc.) now live as Prisma
models (`UserSettings`, `PricingPackage`, `Log`).

### Prisma / `@aba/database`

The schema lives in `packages/database/prisma/schema.prisma` (monorepo root).  
`PrismaService` extends `PrismaClient` imported from `@aba/database` — **never from `@prisma/client` directly**.  
Only `packages/database` runs `db:migrate` or `db:push`. Running migrations from `aba-bl` will break the monorepo.

### Guards

- `AuthGuard` (`src/modules/auth/guards/auth.guard.ts`) — verifies Bearer JWT, sets `request['user']` to the decoded payload.
- `AdminGuard` (`src/modules/admin/guards/admin.guard.ts`) — checks `user.role` is `SUPER_ADMIN` or `ADMIN`. Always stack after `AuthGuard`: `@UseGuards(AuthGuard, AdminGuard)`.

### Roles

Defined in `packages/database/prisma/schema.prisma` as the `UserRole` enum:  
`SUPER_ADMIN`, `ADMIN`, `BUSINESS_OWNER`, `BUSINESS_ADMIN`, `BUSINESS_MEMBER`.

Platform roles (`SUPER_ADMIN`, `ADMIN`) manage the whole platform. Business roles are scoped to a single company.
e
### Path aliases 
`@/` → `src/`,
`@modules/` → `src/modules/`,
`@test/` → `test/`,
`@infrastructure/` → `src/shared/infrastructure/`.

### Response shape

All endpoints return via `createResponse()` from `src/shared/utils/createResponse.ts`:  
`{ success: boolean, error: string | null, data: T }`.

Errors are caught globally by `GlobalExceptionFilter` (`src/shared/exceptions/globalExceptionFilter.ts`), which maps any `HttpException` to the same shape with `success: false`.

### JWT

Access token: 60 min (`ACCESS_TOKEN_SECRET`). Refresh token: 30 days (`REFRESH_TOKEN_SECRET`). Fallback secrets are hardcoded in `src/shared/constants/jwtConstants.ts` — always override with real env vars.

## Commands

```bash
pnpm start:dev        # hot-reload dev server (port 3002)
pnpm build            # nest build
pnpm test             # unit tests (jest --config jest.config.ts)
pnpm test:watch       # jest watch mode
pnpm test:cov         # tests with coverage
pnpm test:e2e         # e2e tests (test/jest-e2e.json)
pnpm lint             # eslint with auto-fix
pnpm db:generate      # regenerate Prisma client from packages/database schema
```

Run a single test file:
```bash
pnpm test -- src/modules/users/usecases/addUser.usecase.spec.ts
```
## Implementation and code changes flow
1: We implement a module if needed otherwise make changes in the dedicated module.
2: Describing the endpoints in the CLI window and how it can be tested via Postman and after getting approval, we should go to the next step which is writing unit tests.
2: One the expected functionality is done and approved, we must implement all required unit tests. For each file in the module, we must make a 100% isolated unit test and mock everything from external and/or other modules.
3: Need to get approval again when unit tests are done. After getting approval for the unit tests, E2E tests should be implemented.
3: We must make E2E tests for the changes at the end in the test folder.
4: Each time that we need to touch a part of the code from before, specially if we need to change E2E tests or Unit tests, it should be marked in the console and after getting confirmation the changes should be placed otherwise we have to make the right changes that will be described in the CLI.
5: If any of these steps gets failed, we need to repeat just that step otherwise there is some changes in the step 1 or 2 so we need jump to those steps and continue from there.

## Code execution and deployment
We must have a separated docker file and configuration here based on the .env file to be able run this service independently without considering other services.

## Documentation
We make clear and helpful documentation on the ReadMe file about all the changes have done. Every time that a new logic is going to change something we had from before, It mast be marked in the CLI and after getting final approval it can be considered as the new logic so means all documents and Claude files should be updated accordingly.

## Swagger 
All the dedicated API paths should be declared in a Swagger list. It should provide all the helpful information about how to use the endpoints. 
## Help & Support page
Customer-visible behaviour defined in this service (plan limits, rescan intervals, repository trigger cadence and defaults, notification digest rules, role permissions) is documented in aba-web's Help & Support page: `aba-web/src/modules/help/constants/helpArticles.ts`. When you change such behaviour here, flag it in the console and update the matching help article(s) in the same piece of work (see "Help & Support page" in `aba-web/CLAUDE.md`).
