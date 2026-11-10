# aba-bl — NestJS BFF (Backend for Frontend)

Core API service for the ABA platform. Handles auth, company management, user management, and acts as a Kafka producer for async processing.

## Stack

- **NestJS** with TypeScript
- **PostgreSQL** via Prisma (schema owned by `packages/database`) — the only datastore; MongoDB has been removed
- **KafkaJS** — produces `package.scan` (plan-driven rescan scheduler) and consumes
  `vulnerability.fetched` (see [Plan-driven package rescanning](#plan-driven-package-rescanning)).
  `test.scheduled` and `notification.req` are documented in the root `CLAUDE.md` but not yet implemented.
- **Redis** — rate limiting, session store, vulnerability caching
- **Swagger** — interactive API docs served at `/api/docs`

## Running locally

```bash
# From monorepo root — start infrastructure (Postgres, Redis, Kafka)
.\start-infra.ps1

# Then start this service
cd aba-bl
pnpm start:dev        # hot-reload on :8000
```

Once running, open `http://localhost:8000/api/docs` for the Swagger UI covering all endpoints
(bearer auth supported).

## Running with Docker (development)

`Dockerfile.dev` and `docker-compose.dev.yml` build a standalone development image for this
service plus its own Postgres instance (useful for testing this service in isolation, without
the rest of the monorepo's `docker-compose.dev.yml` stack at the root).

```bash
# Build and start (always rebuild — this image bakes in source code and the
# compiled @aba/database package, so a stale image will run stale code):
docker compose -f docker-compose.dev.yml up --build

# Tear down (including the Postgres volume):
docker compose -f docker-compose.dev.yml down -v
```

Because the image copies the source tree at build time (no live source volume mounts), you
must pass `--build` every time you want the container to reflect local changes — `up` without
`--build` will happily start the previous image again. A separate `Dockerfile.prod` /
`docker-compose.prod.yml` should be added later for production builds.

## Commands

```bash
pnpm start:dev        # hot-reload dev server
pnpm build            # compile via nest build
pnpm test             # unit tests (jest)
pnpm test:watch       # jest watch mode
pnpm test:cov         # tests with coverage
pnpm test:e2e         # e2e tests
pnpm lint             # eslint with auto-fix
pnpm db:generate      # regenerate Prisma client from shared schema
```

## Database

This service uses the shared schema from `packages/database`.

### Regenerating the Prisma client

Run this after any schema change in `packages/database`:

```bash
pnpm db:generate
```

### Making schema changes

**Never run `db:push` or `db:migrate` from this service.**
All schema changes must go through `packages/database`:

```bash
cd ../packages/database
pnpm db:migrate       # create + apply migration
cd ../aba-bl
pnpm db:generate      # regenerate typed client
```

### Why?

The `worker` service shares the same database. If both services could run migrations independently they could silently overwrite each other's changes. `packages/database` is the single gatekeeper for all schema-changing operations.

## Module structure

```
src/modules/
  auth/         JWT auth, RBAC, Google/GitHub OAuth
  users/        User CRUD, settings
  company/      Company profile, user management
  team/         Company teams CRUD — groups that own environments
  environment/  Team environments (dev/test/staging/prod/custom) CRUD
  admin/        Platform admin endpoints (SUPER_ADMIN / ADMIN only)
  shared/       PrismaService, email, packages, common utilities
```

## Environment variables

Copy `.env.local.example` to `.env.local` and fill in the values. Key variables:

| Variable | Purpose |
|---|---|
| `PORT` | Listening port (default 8000) |
| `DATABASE_URL` | PostgreSQL connection string |
| `ACCESS_TOKEN_SECRET` | JWT access token signing secret |
| `REFRESH_TOKEN_SECRET` | JWT refresh token signing secret |
| `KAFKA_BROKERS` | Kafka broker list (e.g. `localhost:9092`) |
| `RESCAN_POLL_CRON` | How often `PackageRescanSchedulerService` checks for due rescans (default: hourly). Not the per-plan interval — that's `SubscriptionPlan.rescanIntervalDays` in the database. |
| `REPOSITORY_TRIGGER_SWEEP_CRON` | How often `RepositoryTriggerSweepService` checks `TIME_INTERVAL`-mode repository connections (default: daily at 01:00). Not the per-connection interval — that's `ServiceRepositoryConnection.intervalDays`. |
| `REDIS_URL` | Redis connection (e.g. `redis://localhost:6379`) |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` | Email credentials |

## API documentation (Swagger)

All endpoints are documented via `@nestjs/swagger` decorators and served at `/api/docs`
(`SwaggerModule.setup('api/docs', app, document)` in `src/main.ts`). Responses follow the
shared `{ success, error, data }` envelope (`createResponse()`), wrapped per-endpoint via
`apiResponseSchema()` in `src/shared/swagger/apiResponseSchema.ts`.

### Authorizing requests in Swagger

Click the **Authorize** button (top right of `/api/docs`) to set credentials once — Swagger UI
persists them (`persistAuthorization: true`) and attaches them to every request you try from
the page:

- **Bearer (`bearer`)** — paste the `accessToken` returned by `POST /auth/login` (or
  `/auth/refresh`). Required for any endpoint guarded by `AuthGuard`
  (e.g. all `/company/:id/environments...` routes).
- **X-CSRF-Token (`csrf-token`)** — paste the token returned by `GET /auth/csrf-token`. Only
  needed for state-changing requests (`POST`/`PUT`/`PATCH`/`DELETE`) that are **not**
  authenticated with a Bearer token (cookie-session based flows). Requests carrying a valid
  `Authorization: Bearer ...` header skip the CSRF check entirely (see `src/main.ts`), so for
  the Environment endpoints this can usually be left blank once a Bearer token is set.

## Authentication notes

- `POST /users/new` has been removed. Company-scoped users are created via
  `POST /company/new` (first admin user) or the company user-management endpoints.
- **Google/GitHub OAuth sign-in** (`POST /auth/google`, `POST /auth/github`) never creates a
  new user. The verified email is looked up against existing `User` records; if no user is
  registered with that email, the request is rejected with an error explaining that the email
  is not associated with any company, and that the user should either register or ask their
  company admin to add them as a company user.

## Data model additions

Three Postgres models (defined in `packages/database/prisma/schema.prisma`) replace the
former Mongo collections:

- **`UserSettings`** — per-user AI usage settings (`/users/settings`), replacing the old
  Mongo `UserMeta`.
- **`PricingPackage`** — AI token pricing tiers (`/packages`), replacing the old Mongo
  `Packages`.
- **`Log`** — application log entries, replacing the old Mongo-backed logger.

Two additional models support the teams/environments hierarchy:

- **`Team`** — a group within a company that owns environments. See
  [Teams](#teams) below.
- **`Environment`** — a team's deployment stages (dev/test/staging/prod/custom). See
  [Team environments](#team-environments) below.

## Company dashboard stats

#### `GET /company/:id/stats`

Guard: `AuthGuard` + `CompanyAccessGuard` (any company member). Returns counts used by the
customer dashboard:

```json
{
  "success": true,
  "error": null,
  "data": { "teamsCount": 3, "environmentsCount": 7 }
}
```

`teamsCount` is the total number of teams owned by the company; `environmentsCount` is the
total number of environments across all of the company's teams.

## Teams

Each company is organised into one or more **teams** (e.g. "Platform", "Mobile", "Security").
A team is the parent of [environments](#team-environments) — every environment belongs to
exactly one team, and a company creates a team before it can create environments for it.

### Model (`Team`)

| Field | Type | Notes |
|---|---|---|
| `id` | number | Primary key |
| `name` | string | Display name, e.g. "Platform" |
| `slug` | string | URL/key-safe identifier, unique per company. Auto-derived from `name` if not provided (e.g. "Platform" → `platform`) |
| `description` | string \| null | Optional free-text notes |
| `status` | enum | `ACTIVE` or `ARCHIVED` (default `ACTIVE`) |
| `companyId` | number | Owning company |
| `createdAt` / `updatedAt` | DateTime | Timestamps |

A company cannot have two teams with the same `slug` (`@@unique([companyId, slug])`).
Deleting a team cascades and deletes all of its environments (and their services).

### Endpoints

All routes require a Bearer JWT (`AuthGuard`). Base path: `/company/:id` where `:id` is the
company id.

| Method | Path | Guard | Roles |
|---|---|---|---|
| `GET` | `/company/:id/teams` | `CompanyAccessGuard` | Any company member (OWNER, ADMIN, MEMBER) |
| `GET` | `/company/:id/teams/:teamId` | `CompanyAccessGuard` | Any company member |
| `POST` | `/company/:id/teams` | `CompanyManagerGuard` | `BUSINESS_OWNER`, `BUSINESS_ADMIN` only — `BUSINESS_MEMBER` gets `403` |
| `PUT` | `/company/:id/teams/:teamId` | `CompanyManagerGuard` | `BUSINESS_OWNER`, `BUSINESS_ADMIN` only — `BUSINESS_MEMBER` gets `403` |
| `DELETE` | `/company/:id/teams/:teamId` | `CompanyManagerGuard` | `BUSINESS_OWNER`, `BUSINESS_ADMIN` only — `BUSINESS_MEMBER` gets `403` |

`CompanyAccessGuard`/`CompanyManagerGuard` also reject (`403`) any caller whose JWT
`companyId` does not match the `:id` path param.

#### `GET /company/:id/teams`

Optional query params: `search` (matches `name`/`slug`, case-insensitive), `status`,
`sortBy` (`name` | `createdAt`, default `name`), `sortOrder` (`asc` | `desc`, default `asc`).
Returns `{ success, error, data: { data: Team[], total: number } }`.

#### `POST /company/:id/teams`

Body:

```json
{
  "name": "Platform",
  "slug": "platform",
  "description": "Core platform and infrastructure team"
}
```

Only `name` is required; `slug` is derived from `name` if omitted. Returns `201` with the
created team, `409` if the `slug`/`name` is already taken for this company, or `400` on
validation errors.

#### `PUT /company/:id/teams/:teamId`

Same body as create, but every field is optional (plus `status`: `ACTIVE` | `ARCHIVED`).
Returns `404` if the team doesn't exist or belongs to another company, `409` on a `slug`
collision.

#### `DELETE /company/:id/teams/:teamId`

Returns `200` with the deleted team (cascade-deletes its environments), or `404` if it
doesn't exist / belongs to another company.

### Testing via Postman/Swagger

1. Sign in (`POST /auth/login`) to obtain an access token, and set it as a Bearer token.
2. `GET /company/:id/teams` to list teams for your company.
3. `POST /company/:id/teams` with a `BUSINESS_OWNER`/`BUSINESS_ADMIN` token to create one —
   try the same request with a `BUSINESS_MEMBER` token to confirm it returns `403`.
4. `PUT` / `DELETE /company/:id/teams/:teamId` using the `id` returned from step 3.
5. Use the returned team `id` as the `teamId` when creating environments (see
   [Team environments](#team-environments)).

Full request/response schemas are available in Swagger at `/api/docs` under the **Team**
tag.

## Team environments

Each team can define multiple environments (e.g. Dev, Test, Staging, Prod, or custom
stages), similar to clusters in AWS ECR. Environments are used to group the services a
team registers for security testing and vulnerability scanning, and to drive
promotion/pipeline ordering in the dashboard.

### Model (`Environment`)

| Field | Type | Notes |
|---|---|---|
| `id` | number | Primary key |
| `name` | string | Display name, e.g. "Production" |
| `slug` | string | URL/key-safe identifier, unique per team. Auto-derived from `name` if not provided (e.g. "Production" → `production`) |
| `type` | enum | `DEVELOPMENT`, `TESTING`, `STAGING`, `PRODUCTION`, `CUSTOM` (default `CUSTOM`) |
| `isProduction` | boolean | Safety flag — UI/automation can use this to add extra confirmation steps before running tests against this environment |
| `order` | number | Pipeline order for sorting/promotion (1=Dev, 2=Test, 3=Staging, 4=Prod, ...). Auto-assigned to `max(order) + 1` within the team if omitted |
| `description` | string \| null | Optional free-text notes |
| `status` | enum | `ACTIVE` or `ARCHIVED` (default `ACTIVE`) |
| `companyId` | number | Owning company (denormalised from `team.companyId` for fast company-wide queries) |
| `teamId` | number | Owning team — see [Teams](#teams) |
| `createdAt` / `updatedAt` | DateTime | Timestamps |

A team cannot have two environments with the same `slug` (`@@unique([teamId, slug])`).

### Endpoints

All routes require a Bearer JWT (`AuthGuard`). Base path: `/company/:id` where `:id` is the
company id.

| Method | Path | Guard | Roles |
|---|---|---|---|
| `GET` | `/company/:id/environments` | `CompanyAccessGuard` | Any company member (OWNER, ADMIN, MEMBER) |
| `GET` | `/company/:id/environments/:envId` | `CompanyAccessGuard` | Any company member |
| `POST` | `/company/:id/environments` | `CompanyManagerGuard` | `BUSINESS_OWNER`, `BUSINESS_ADMIN` only — `BUSINESS_MEMBER` gets `403` |
| `PUT` | `/company/:id/environments/:envId` | `CompanyManagerGuard` | `BUSINESS_OWNER`, `BUSINESS_ADMIN` only — `BUSINESS_MEMBER` gets `403` |
| `DELETE` | `/company/:id/environments/:envId` | `CompanyManagerGuard` | `BUSINESS_OWNER`, `BUSINESS_ADMIN` only — `BUSINESS_MEMBER` gets `403` |

`CompanyAccessGuard`/`CompanyManagerGuard` also reject (`403`) any caller whose JWT
`companyId` does not match the `:id` path param.

#### `GET /company/:id/environments`

Optional query params: `search` (matches `name`/`slug`, case-insensitive), `teamId`
(restrict to a single team's environments), `type`, `status`, `sortBy`
(`order` | `name` | `createdAt`, default `order`), `sortOrder` (`asc` | `desc`,
default `asc`). Returns `{ success, error, data: { data: Environment[], total: number } }`.

#### `POST /company/:id/environments`

Body:

```json
{
  "teamId": 1,
  "name": "Production",
  "slug": "production",
  "type": "PRODUCTION",
  "isProduction": true,
  "order": 4,
  "description": "EU production cluster"
}
```

`teamId` and `name` are required — `teamId` must reference a team owned by this company
(`404` if it doesn't). `slug` is derived from `name` if omitted, `type` defaults to
`CUSTOM`, `isProduction` defaults to `false`, and `order` defaults to the next available
slot within the team. Returns `201` with the created environment, `409` if the `slug` is
already taken within the team, or `400` on validation errors.

#### `PUT /company/:id/environments/:envId`

Same body as create, but every field is optional (plus `status`: `ACTIVE` | `ARCHIVED`).
Moving an environment to a different team is supported by passing a new `teamId` (must
belong to the same company). Returns `404` if the environment or target team doesn't exist
or belongs to another company, `409` on a `slug` collision within the target team.

#### `DELETE /company/:id/environments/:envId`

Returns `200` with the deleted environment, or `404` if it doesn't exist / belongs to
another company.

### Testing via Postman/Swagger

1. Sign in (`POST /auth/login`) to obtain an access token, and set it as a Bearer token.
2. `POST /company/:id/teams` to create a team (or reuse an existing one) and note its `id`.
3. `GET /company/:id/environments` to list environments for your company (optionally
   filter with `?teamId=`).
4. `POST /company/:id/environments` with a `BUSINESS_OWNER`/`BUSINESS_ADMIN` token and the
   team's `id` as `teamId` to create one — try the same request with a `BUSINESS_MEMBER`
   token to confirm it returns `403`.
5. `PUT` / `DELETE /company/:id/environments/:envId` using the `id` returned from step 4.

Full request/response schemas are available in Swagger at `/api/docs` under the
**Environment** tag.

> **Note:** the `Team` and `Environment` models and their tables are defined in
> `packages/database/prisma/schema.prisma` and the Prisma client has been regenerated, but
> the schema has **not yet been applied to a running database**. Before testing against a
> live database, run from `packages/database`:
>
> ```bash
> pnpm db:migrate   # or: pnpm db:push
> ```

## Plan-driven package rescanning

Until now, a company's packages were only checked against OSV.dev at the moment a customer
manually added a package or bulk-imported a `package.json`
(`ServicePackageService.triggerScan()` → `VulnerabilityScanService.scanPackages()`, in-process).
Nothing ever re-checked packages already on file, so a vulnerability disclosed *after* the
initial scan was never caught unless the customer re-uploaded.

This is now covered by a real Kafka pipeline — the "Scheduler" module named in this file's
own architecture notes above, and the `package.scan` / `vulnerability.fetched` topics
documented in the root `CLAUDE.md`, both now actually implemented instead of just described:

```
PackageRescanSchedulerService (cron, checks SubscriptionPlan.rescanIntervalDays)
  -> produces "package.scan"                              (Kafka)
     -> worker's Vulnerability Fetcher Worker consumes it, queries OSV.dev
        -> produces "vulnerability.fetched"                (Kafka)
           -> aba-bl's VulnerabilityFetchedConsumerService consumes it,
              persists findings + notifies + stamps Service.lastScannedAt
```

This is entirely separate from — and does not change the behavior of — the existing manual
add-package/bulk-import scan path. That path only ever checks the newly changed packages, not
a service's *entire* active package set, so it can never fulfil a plan's "promised timerange"
guarantee. Only the scheduled path checks everything a service currently has on file, which is
why only it is allowed to touch `Service.lastScannedAt`.

### Data model

- **`SubscriptionPlan.rescanIntervalDays`** (`Int?`) — days between automatic full rescans
  promised to companies on this plan. `null` disables scheduled rescanning for that plan
  (manual scan-on-change still works as before).
- **`Service.lastScannedAt`** (`DateTime?`) — when this service's full active package set was
  last completely rescanned by the scheduler. `null` means it has never had a scheduled
  rescan yet (and is therefore immediately due, once its plan has an interval set).

### PackageRescanSchedulerService

`src/modules/scheduler/services/packageRescanScheduler.service.ts` runs on a `@Cron` tick
(`RESCAN_POLL_CRON`, default hourly — see [Environment variables](#environment-variables)).
Each tick it asks `ServiceRepository.findServicesEligibleForRescan()` for every active service
whose company is on an active, rescan-enabled plan, then — in application code, since the
"is it actually due" comparison depends on each row's own `rescanIntervalDays` — filters to
just the ones where `lastScannedAt` is `null` or older than that interval **and** which have
at least one active package. Each due service gets its own `package.scan` message.

### VulnerabilityFetchedConsumerService

`src/modules/service-package/consumers/vulnerabilityFetchedConsumer.service.ts` consumes
`vulnerability.fetched` and calls `VulnerabilityScanService.persistScanResults(..., {
isFullRescan: true })` — the same upsert/alarm-bump/notify logic the manual path already
used, refactored out of `scanPackages()` so both paths share it. `isFullRescan: true` is what
stamps `Service.lastScannedAt`, including when zero vulnerabilities are found (a clean scan is
still a completed scan).

A malformed/unparseable Kafka message is logged and dropped (unrecoverable). A failure inside
`persistScanResults()` itself (e.g. a transient DB error) is allowed to propagate instead, so
kafkajs won't commit the offset and will redeliver the message for a retry rather than
silently losing the scan.

Connecting to Kafka never blocks app bootstrap: both this consumer and the scheduler's
producer connect lazily/in the background, so a Kafka broker that's briefly unreachable never
prevents aba-bl from serving HTTP traffic.

### Manually testing this locally

1. Start the full stack (`docker-compose -f docker-compose.dev.yml up --build` from the repo
   root) so Kafka and Postgres are both up.
2. Set a small `rescanIntervalDays` on a `SubscriptionPlan` row (e.g. via `prisma studio` or
   `pnpm db:seed`), and make sure a `Company` on that plan has a `Service` with at least one
   active `ServicePackage`.
3. Either wait for the next `RESCAN_POLL_CRON` tick, or lower it temporarily
   (e.g. `RESCAN_POLL_CRON="*/1 * * * *"` for every minute) while testing.
4. Watch aba-bl's logs for `Published package.scan for N due service(s).`, then worker's logs
   for the OSV query, then aba-bl's logs again for the `vulnerability.fetched` consumer
   processing the result. Confirm `Service.lastScannedAt` was updated and, if the scanned
   packages have known vulnerabilities, that `ServicePackage.alarmCount` increased and a
   `vulnerability.notification.pending` event was published — see [Vulnerability notification
   pipeline](#vulnerability-notification-pipeline) below for what happens to it from there
   (email is no longer sent synchronously from this path).

## Vulnerability notification pipeline

Both scan triggers above (manual and scheduled) used to end by calling an email service
directly and synchronously from aba-bl — with no memory of "did we already tell them this,"
so an unresolved vulnerability re-triggered a fresh email on every scan that still found it.
That direct call is gone. `VulnerabilityScanService.persistScanResults()` now ends by
publishing `vulnerability.notification.pending` instead — detection and notification are
fully decoupled, and `worker` owns everything downstream.

```
persistScanResults() (aba-bl, shared by both scan triggers)
  -> produces "vulnerability.notification.pending"                    (Kafka)
     -> worker's consumer upserts ServicePackageNotificationState only
        (muted flag, lastNotifiedAt, nextNotifyAt) — never sends email
        -> worker's daily cron sweep (NOTIFICATION_DIGEST_CRON, independent
           of the Kafka message) finds due + unmuted packages, re-checks
           they're still vulnerable, resolves recipients, and sends ONE
           combined digest email per recipient per service
           -> logs every send/skip to NotificationLog + ActivityLog
```

### Why worker, not aba-bl, sends the email

This is a deliberate divergence from the round-trip-through-aba-bl pattern the
`package.scan`/`vulnerability.fetched` pair uses: `worker` reads and writes its three new
tables (`ServicePackageNotificationState`, `NotificationLog`, `ActivityLog`) directly, using
the same shared Prisma client it already reads through, rather than publishing results back
for aba-bl to persist. These tables have no other writer, so there's no collision risk the
round-trip pattern exists elsewhere to prevent — and adding a second broker hop here would
only recreate the "two services must agree what happened" problem that moving off a
synchronous email call was meant to remove. `worker` needed to gain its own outbound email
client for this (nothing like that existed there before); it does not share code with
aba-bl's equivalent, matching how Kafka message types are already duplicated (not shared)
between the two services.

### Recipient resolution

For a given service: the company's single `Company.primaryOwnerId` (if set and the user is
active) is one recipient; every active `BUSINESS_ADMIN` user linked — via the new generic
`TeamMembership` table — to the team that owns the service's environment is added on top
(zero, one, or many). Recipients are always resolved fresh at send time, never cached, so a
team reassignment or a primary-owner change takes effect on the very next sweep. Until real
`BUSINESS_ADMIN` users are actually linked to teams, that second recipient category is
empty — assigning team members (`POST /company/:id/teams/:teamId/members`) is a real
prerequisite for a service to get more than just the primary owner notified.

### Mute / snooze

A customer can mute a package's notifications indefinitely or snooze them to a specific date
from that package's row actions in the dashboard (`PUT
.../packages/:servicePackageId/notification-preference`, actions `MUTE` / `UNMUTE` /
`SNOOZE`). This state is shared for the whole service — not personal to whichever recipient
set it — so it affects the one combined digest for every recipient. Merely viewing a
package's vulnerability detail is logged for the audit trail but never postpones or silences
its notification; only these explicit actions (plus an actual version update or removal) do.

### Manual sweep trigger

Since a cron tick isn't naturally testable the way request/response endpoints are, worker
exposes `POST /internal/notifications/sweep` (protected by the `INTERNAL_API_KEY` shared
secret in production) to force an immediate sweep — useful for E2E automation and for
recovering after a failed night's run.

## Repository connections (GitHub-triggered rescans)

Fulfils the "Webhook" module named in this file's own architecture notes above (`Ingest
GitHub/Bitbucket events, validate signatures, map to environments`), scoped specifically to
triggering a package rescan — not to the separate, still-aspirational E2E test-execution
webhook flow described in the root `CLAUDE.md`'s Data Flow B. A customer connects a GitHub
repository to one `Service`; GitHub then pings us on a push to the watched branch (or a
published release), and — depending on the connection's cadence — we re-scan the packages
**already registered** for that service. We deliberately never read the customer's repository
contents: no GitHub API token is stored, no Contents-API call is ever made. The only outbound
call this feature makes to GitHub is none at all — GitHub always initiates the request.

```
GitHub push/release
  -> POST /webhooks/github/:webhookToken            (public, HMAC-signed, no Bearer/CSRF)
     -> GithubWebhookController verifies X-Hub-Signature-256 over the raw body
        -> matching branch/event? dispatch by ServiceRepositoryConnection.triggerMode:
             INSTANT       -> publishScanForService() immediately
             PUSH_COUNT    -> accumulate pendingPushCount; fire at pushCountThreshold
             TIME_INTERVAL -> only accumulate; RepositoryTriggerSweepService (daily cron)
                              fires once intervalDays has passed AND something accumulated
                 -> either path calls the same PackageRescanSchedulerService
                    .publishScanForService() the plan-driven cron already uses
                    -> produces "package.scan"                              (Kafka)
```

### Data model

- **`ServiceRepositoryConnection`** (`src/modules/repository-connection/`) — one row per
  `Service` (`serviceId` unique). Holds `owner`/`name`/`watchedBranch` (cosmetic + branch
  match), `webhookToken` (unique, embedded in the inbound URL, used to look up the row before
  the signature is even checked) and `webhookSecretEnc` (`CryptoService`-encrypted; the
  plaintext is returned to the customer exactly once, at connect/rotate time, and never
  again). `lastPingedAt` is any verified delivery; `lastTriggeredAt` is one that actually
  caused a scan.
- **`RepositoryTriggerMode`** (`INSTANT` / `PUSH_COUNT` / `TIME_INTERVAL`) plus
  `pushCountThreshold`, `intervalDays`, and `pendingPushCount` (matching pushes since the last
  scan; reset to 0 whenever one fires) — see "Trigger cadence" below.
- **`SubscriptionPlan.maxMonitoredBranches`** (pre-existing field, previously unused) — gates
  how many connections a company may have across all its services; `null` = unlimited,
  bypassed entirely by `Company.payAsYouGo`, same pattern as `maxServices`/`maxEnvironments`.
- **`SubscriptionPlan.defaultTriggerMode` / `defaultPushCountThreshold` / `defaultIntervalDays`**
  — what a new connection defaults to when the customer doesn't pick a cadence explicitly (see
  below). All three `null` falls back to a hardcoded system default (`PUSH_COUNT` / 5 / 7).
- **`Environment.isProduction`** (pre-existing field) — a team may have **at most one**
  environment with this set (`EnvironmentService.createEnvironment`/`updateEnvironment` now
  reject a second with 409). This is what "is this connection's branch prod" is derived from —
  there is no separate branch-name concept for it.

### Trigger cadence resolution

Computed once, at connection-creation time, in `RepositoryConnectionService.create()`:

1. If the request explicitly sets `triggerMode`, that wins outright (customer choice always
   available, on any plan, forever — editable anytime after via
   `PUT .../repository-connection/trigger-settings`).
2. Otherwise: a connection on a **production** environment's service defaults to `INSTANT`,
   *unless* the company is on the free tier (`SubscriptionPlan.monthlyPrice === 0`) — free-tier
   production branches fall through to the same plan-default path as any other branch.
3. Otherwise: the plan's `defaultTriggerMode`/`defaultPushCountThreshold`/`defaultIntervalDays`
   (or the hardcoded system default if the plan hasn't set any).

### Testing via Postman/Swagger

1. `POST /company/:id/environments/:envId/services/:serviceId/repository-connection`
   `{ "owner": "acme-corp", "name": "billing-api", "watchedBranch": "main" }` — capture the
   returned `webhookUrl` + `webhookSecret` (shown once).
2. Compute an HMAC-SHA256 signature over a raw JSON body using that secret and POST it back to
   the webhook URL with `X-GitHub-Event: push` and `X-Hub-Signature-256: sha256=<hex>`:
   ```bash
   BODY='{"ref":"refs/heads/main"}'
   SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "<secret>" | sed 's/^.* //')
   curl -X POST "<webhookUrl>" \
     -H "X-GitHub-Event: push" -H "X-Hub-Signature-256: sha256=$SIG" \
     -H "Content-Type: application/json" -d "$BODY"
   ```
3. `GET .../repository-connection` to confirm `lastPingedAt`/`lastTriggeredAt` updated (for
   `INSTANT`), or `PUT .../repository-connection/trigger-settings` first to switch to
   `PUSH_COUNT`/`TIME_INTERVAL` and confirm the batching behavior instead.

### Testing with a real GitHub repository (local dev)

GitHub rejects a webhook Payload URL that points at `localhost` — it isn't reachable from
GitHub's servers, so real end-to-end testing (an actual `git push`, not a simulated `curl`)
needs a publicly reachable URL even before this is deployed. Two options:

- **Wait for a real deployment** — once `aba-bl` is on a real domain with HTTPS, the flow
  above needs no changes at all; `webhookUrl` is built from the actual request host
  (`RepositoryConnectionController`'s `buildWebhookUrl()`), so it's already correct in
  production with zero configuration.
- **Tunnel your local server in the meantime** — expose local `:8000` with a public HTTPS URL
  that forwards to it. Cloudflare's quick tunnel needs no account or signup:
  ```bash
  # one-time install: winget install --id Cloudflare.cloudflared
  cloudflared tunnel --url http://localhost:8000
  # prints a random https://<random>.trycloudflare.com URL — use that as the
  # connection's "owner/name" don't change, just use this as the public host
  # when creating the GitHub webhook itself (paste it as the base of Payload URL,
  # i.e. https://<random>.trycloudflare.com/webhooks/github/<token>)
  ```
  (`ngrok http 8000` is the equivalent if you already have an ngrok account/authtoken set up.)
  The tunnel URL changes every time you restart it, so treat it as throwaway — re-paste it
  into the GitHub webhook's Payload URL field each session rather than relying on it staying
  stable.

### Bitbucket Cloud connections

The same feature works for **Bitbucket Cloud** repositories. It reuses the whole GitHub
pipeline (connection model, cadence modes, daily sweep, activity log, `package.scan`) — only
the inbound webhook differs.

- **Connect:** `POST .../repository-connection` accepts an optional `provider`
  (`GITHUB` default, or `BITBUCKET`). `owner` is the Bitbucket workspace, `name` the repo slug.
  The response's `webhookUrl` is `/webhooks/bitbucket/:webhookToken` for Bitbucket and
  `/webhooks/github/:webhookToken` for GitHub; the secret is shown once, as before. A service
  still has at most one connection (either provider), and Bitbucket connections count towards
  the plan's `maxMonitoredBranches`. Status, rotate-secret, trigger-settings and delete are
  unchanged and keep the connection's provider.
- **Inbound webhook:** `POST /webhooks/bitbucket/:webhookToken` (`BitbucketWebhookController`),
  public and CSRF-exempt like the GitHub one. Authentication is the HMAC-SHA256 of the raw body
  keyed by the connection secret, sent by Bitbucket as `X-Hub-Signature: sha256=<hex>`.
- **Events:** `X-Event-Key: repo:push` triggers when any entry of `push.changes[]` is a
  *branch* named like the watched branch (tags and deleted branches — `new: null` — are
  ignored); `diagnostics:ping` ("Test connection") only records `lastPingedAt`. Bitbucket has
  no "release published" event, so releases do not apply. Everything else is acknowledged with
  `{ triggered: false }`.
- **Isolation:** a token only works on its own provider's path; the other path answers the
  same generic 404.
- **Not supported:** Bitbucket Server / Data Center (`repo:refs_changed`) payloads.
- **Customer setup:** Bitbucket → Repository settings → Webhooks → Add webhook; paste the
  URL, set the **Secret**, and tick *Repository: Push*.
- **Tests:** unit specs beside each file plus
  `test/modules/webhook/controllers/bitbucketWebhook.controller.e2e-spec.ts` and the
  Bitbucket sections of the repository-connection e2e specs.

## E2E Security Testing (Pages, tests & runs)

Lets a customer register the **pages/endpoints** of a service, attach **tests**
(the form simulator + assertions), and execute them. See
`src/modules/test-page/`, `src/modules/test-definition/`,
`src/modules/test-run/`, and worker's `testScheduledConsumer` + `testExecutor`.

### Data model (`@aba/database`)
- `TestPage` — a page/endpoint of a `Service` (`pageType`: LOGIN/REGISTER/
  CHECKOUT/…, `path` or `absoluteUrl`, `method`, `accessConfig`, encrypted
  `authSecretEnc`, forward-declared schedule fields).
- `TestDefinition` — one test on a page (`type` CUSTOM_API/GLOBAL_SECURITY/
  BROWSER, `engine` POSTMAN/PLAYWRIGHT, `config` incl. the simulated `form`,
  `assertions`). CUSTOM_API runs today; the others are skipped until the
  Playwright engine ships.
- `TestRun` / `TestResult` — one execution + per-test outcomes.

### Pipeline
`POST …/test-runs` (manual, plan-gated by `maxTestRunsPerMonth`) creates a
QUEUED `TestRun` and publishes `test.scheduled`. The worker consumes it, runs
each CUSTOM_API test via an in-process axios executor (building the body from
the form fields + content type, evaluating the assertions), and publishes
`test.result`, which `TestResultConsumerService` persists. Auth secrets never
travel on Kafka — the worker fetches decrypted material from the internal,
`INTERNAL_API_KEY`-guarded `GET /internal/test-runs/:runKey/materials`.

### Endpoints (all under `company/:id/environments/:envId/services/:serviceId`)
- Pages: `POST|GET /test-pages`, `GET|PATCH|DELETE /test-pages/:pageId`
- Tests: `POST|GET /test-pages/:pageId/test-definitions`,
  `PATCH|DELETE /…/:definitionId`, `POST /…/:definitionId/clone`
- Runs: `POST /test-runs` (body `{ pageId?, definitionId? }` — omit for all,
  `pageId` for one page, `pageId`+`definitionId` for a single test),
  `GET /test-runs`, `GET /test-runs/:runId`

### Plan limits (`SubscriptionPlan`)
`maxTestPages`, `maxTestDefinitions` (per page), `maxTestRunsPerMonth`,
`allowScheduledTests`, `minTestScheduleIntervalHours`, `allowWebhookTests`.
All nullable/defaulted; null = unlimited / not offered.

## AI assist token metering & package billing (Phase B — implemented)

AI features (suggest test cases, explain results, improve a test) call Claude,
which costs real money per token. These features stay **disabled** until a plan
grants an AI-token allowance *and* that allowance has tokens left *and*
`ANTHROPIC_API_KEY` is configured. The algorithm below keeps per-customer token
spend profitable and self-limiting.

Implemented in `src/modules/ai-assist/` (official `@anthropic-ai/sdk`). Model
routing: **Claude Haiku 5.5** for bulk test suggestions (cheap), **Claude Opus
5.5** for explaining run results and improving a test (quality). The allowance
pool is **token-denominated** — every call decrements `remaining` by the actual
`inputTokens + outputTokens` returned by Claude regardless of model; `costMicroUsd`
records real provider spend for margin reporting only. Top-ups in this phase have
no payment gateway: they are direct grants via the internal, `INTERNAL_API_KEY`-
guarded `POST /internal/ai/token-grants` endpoint.

### Endpoints (customer, under `company/:id/environments/:envId/services/:serviceId`)
- `GET /ai/status` — `{ offered, apiKeyConfigured, enabled, monthlyAllowance,
  purchasedThisPeriod, usedThisPeriod, remaining, periodStart }`. Drives the UI
  gating (greys out AI actions when disabled/exhausted).
- `POST /test-pages/:pageId/ai/suggest-tests` — body `{ count?, instructions? }`;
  returns `{ suggestions: [{ title, summary, detail, type, config, assertions }],
  usage }`. `config`/`assertions` are validated against the same Zod schemas a
  manual test uses, so the client can select-to-add them directly.
- `POST /test-runs/:runId/ai/explain` — returns `{ summary, perTest[],
  recommendations, usage }` for a finished run.
- `POST /test-pages/:pageId/test-definitions/:definitionId/ai/improve` — body
  `{ instructions? }`; returns `{ rationale, improved: { name, config,
  assertions }, usage }`. All three are **managers-only** (BUSINESS_OWNER /
  BUSINESS_ADMIN), return **402** when the allowance is exhausted and **403**
  when AI is disabled (no plan allowance or no API key).

### Config (env)
- `ANTHROPIC_API_KEY` — the Claude key. Unset ⇒ AI reports disabled (never calls out).
- `AI_TOKEN_MARGIN` — gross margin used to derive the sell price for reporting
  (default `0.6`).
- `SubscriptionPlan.aiMonthlyTokenAllowance` — tokens/month included (null/0 ⇒ AI
  not offered on that plan).

**Definitions**
- `TOKEN_BUY_COST(model)` — provider price per input/output token (from config,
  priced separately per model; tracks Anthropic's published rates).
- `MARGIN` — required gross margin (e.g. `0.6`).
- `TOKEN_SELL_PRICE(model) = TOKEN_BUY_COST(model) × (1 + MARGIN)`.
- `SubscriptionPlan.aiMonthlyTokenAllowance` — tokens/month included in the plan.
  Sized so `aiMonthlyTokenAllowance × blended TOKEN_SELL_PRICE ≤ (share of
  monthlyPrice budgeted for AI)`, guaranteeing the included allowance is
  profitable.

**State (per company, per billing period)**
`remaining = aiMonthlyTokenAllowance + Σ(purchased top-ups) − Σ(consumed)`.
Every AI call writes an `AiUsageLog` row `{ companyId, feature, model,
inputTokens, outputTokens, costMicroUsd, createdAt }` (tokens read from Claude's
`usage` in the response); top-ups are `AiTokenPurchase { tokens, pricePaidUsd }`.

**Per-call algorithm**
1. **Availability check** — if the plan grants no allowance, or `ANTHROPIC_API_KEY`
   is unset, AI endpoints return "disabled" and the UI greys out AI actions.
2. **Pre-call reservation** — estimate an upper bound
   `estimate = promptTokens + maxOutputTokens`. If `remaining < estimate`,
   reject with HTTP 402 "AI token allowance exhausted — top up to continue"; the
   UI disables AI until a top-up. This bounds overspend to one capped call.
3. **Call** Claude with an explicit `max_tokens` cap (the reservation ceiling).
4. **Post-call settle** — read actual `input_tokens`/`output_tokens`, write the
   `AiUsageLog`, compute `costMicroUsd` from `TOKEN_BUY_COST`, and decrement
   `remaining` by the actual total (releasing the unused part of the reservation).
5. **Model routing for cost control** — cheap model (e.g. Haiku) for bulk
   suggestions, a larger model only where quality matters (result explanation);
   each priced with its own rate.

**Top-ups & reset** — a customer buys additional token packs through the normal
billing flow; packs add to `remaining`. The base allowance resets at the billing
period boundary (base does not roll over; top-up roll-over is a configurable
policy). All caps (per-call max, optional per-day soft cap, hard monthly cap =
allowance + purchased) are enforced server-side; the client only mirrors state.

**Profit invariant** — because every sold token is priced at `TOKEN_SELL_PRICE`
(buy cost × (1 + MARGIN)) and no AI call is allowed unless reserved tokens are
already paid for (via allowance or top-up), revenue from AI always exceeds the
provider token cost by at least `MARGIN`.
