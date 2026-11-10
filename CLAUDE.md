# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Overview

This is a monorepo containing three Node.js services plus one NextJS front interface that together form an AI business assistant platform:

- **`aba-web/`** — Next.js 14 frontend (port 3000). Uses MUI, TanStack Query, next-auth, and react-i18next. Role: Customer dashboard, admin panel, Swagger/Postman importer, test results visualisation.
Communication: REST/GraphQL calls to NestJS API, JWT authentication.
Deployment: Vercel (serverless) or same VPS as API (Docker container with Node).
- **`aba-bl/`** — NestJS BFF/backend (port 8000 in dev). Handles auth, users, companies, packages, and email. Uses PostgreSQL (Prisma) as its only datastore; API docs served via Swagger at `/api/docs`.
- **`Kafka Cluster/`** —
Brokers: 3 minimum (can start with 1 in dev).
Topics & Partitions:
1: Topic	Partitions	Producers	Consumers
1: test.scheduled,	10 Partitions, Producers: NestJS API (TestRun module),	Consumers: Test Executor Worker — **not implemented**, aspirational.
2: test.result	10 Partitions, Producers:	Test Executor Worker,	Consumers: NestJS API (update DB, notify) — **not implemented**, aspirational.
3: package.scan	5 Partitions, Producers:	NestJS API (Package module),	Consumers: Vulnerability Fetcher Worker — implemented; see Data Flow A below.
4: vulnerability.fetched	5 Partitions, Producers:	Vulnerability Fetcher Worker,	Consumers:	NestJS API (store in DB) — implemented; see Data Flow A below.
5: vulnerability.notification.pending	Producers: NestJS API (scan-persistence logic),	Consumers: worker — implemented; see Data Flow A below. Replaces the synchronous email call that used to live directly in the scan code.
6: notification.req	3 Partitions, Producers:	Any service (API, workers),	Consumers: Notifier Worker — **not implemented**, aspirational. Still reserved for a future generic (e.g. test-failure) notification bus; the vulnerability-notification pipeline below does not use this topic.
- **`worker/`** — Express a worker service that communicates with Kafka (port 3001). Handles the vulnerability fetcher, the vulnerability-notification consumer/digest sweep, and (aspirationally) the test executor/notifier. Uses Prisma + PostgreSQL (not TypeORM — see `worker/README.md` for the migration note). These are dedicated processes (or containers) that only consume from Kafka plus one internal HTTP endpoint. They are part of a monorepo (packages/workers).

a. Test Executor Worker — **not implemented**, aspirational.
1: Consumes test.scheduled messages containing: { testRunId, serviceId, testDefinitions[], rateLimitConfig, baseUrl }.
2: Instantiates Playwright (using playwright-core + browser binaries) to execute API and browser tests sequentially or in parallel.
3: Respects per-service rate limits using a token bucket backed by Redis (shared with API).
4: Publishes results (per test step) to test.result topic.
5: Handles retries and dead letters.
b. Vulnerability Fetcher Worker — implemented.
1: Consumes package.scan events (list of package names + ecosystems).
2: Calls OSV.dev or other APIs, aggregates findings.
3: Produces vulnerability.fetched events for the API to store in PostgreSQL.
c. Vulnerability Notification pipeline — implemented (see Data Flow A below for the full design).
1: Consumes vulnerability.notification.pending, upserting per-(service,package) notification-tracking state — never sends email itself.
2: A daily cron sweep (new to worker, not Kafka-driven) finds due, unmuted packages, re-checks they're still vulnerable, resolves recipients (company primary owner + team-linked BUSINESS_ADMINs), and sends one combined digest email per recipient per service via its own SendGrid/nodemailer client.
3: Logs every send (and every skip) to the shared audit trail, surfaced in aba-web's admin dashboard.
d. Notifier Worker (generic, for test-failure alerts) — **not implemented**, aspirational.
1: Consumes notification.req, sends emails (via SendGrid) or Slack webhooks.
2: Keeps notification logic out of the API.

- **`PostgreSQL (with Prisma)`** — 
Single source of truth for all business data, vulnerabilities, test definitions, results, billing.

Prisma client is used in the API and can be shared (via library) with workers that need read access (e.g., fetching test definitions). However, workers should not directly mutate the DB except via API topics to maintain a clear boundary (CQRS lite). Alternatively, workers can be granted limited write access for performance, but the recommended pattern is to have the API consume result topics and persist.

- **`Redis`** — 
1: Rate limiting: Workers check and update a token bucket per service before each request.
2: Session store (optional if using JWT only).
3: Caching: Frequently accessed package vulnerability summaries to avoid DB hits.

High‑Level Vision
You are building a Security as a Service (SECaaS) platform that gives companies continuous visibility into:
- Dependency risk – by mapping each microservice’s package manifest against known vulnerability databases.
- Runtime application security gaps – by running configurable E2E tests (global defaults + custom per‑service checks) triggered on every release.

Customers manage their Environments (dev, staging, prod) and each environment contains multiple Services. The platform pulls vulnerability data from public sources and executes tests on the customer’s endpoints, producing reports and alerts.

### 1: Customer Workflow
- In the dashboard, customer creates Environment → Service → uploads package.json (or we accept a package-lock.json / yarn.lock for precision).
- The backend immediately triggers a scan: compare all dependencies with the local Vulnerability table.
- Report shown in the dashboard: list of vulnerable packages, severity, recommended fix version.
- Optionally, let them provide a repository webhook so we can re‑scan on every push to a monitored branch.

### 2. E2E Security Testing Architecture
#### 2.1 Test Categories
A. Global Default Tests: 
Pre‑authored scripts that check for common vulnerabilities on public/baseline pages:
- CSRF token presence on login/register.
- SQL injection probes on input fields.
- XSS reflected payloads.
- Security headers (CSP, HSTS, X‑Frame‑Options).
- CORS misconfiguration.

These tests are parameterised: the customer just provides the base URL and optional credentials. We store a template ID and configuration in TestDefinition.

B. Custom Service‑Specific Tests
Customers define exact API calls and expectations. They can build these via:
- Dashboard form – request method, URL, headers, body, expected status code, expected headers, JSON‑path assertions on the response body.
- Swagger/OpenAPI import – upload a swagger.json or provide a URL; we parse it and auto‑generate one test per endpoint with sensible defaults (empty body, expected 2xx, optional auth header).
- Postman collection import – parse Postman Collection v2.1 JSON and convert each request into a test definition.

### Execution Engine
Use Playwright as the core test runner. It can handle both browser‑based pages (for global tests like CSRF, XSS) and direct HTTP requests (via page.evaluate or request API). For pure API tests, Playwright’s APIRequestContext is ideal. We’ll package it in a Docker container and attach it as a queue consumer.

All services are TypeScript and use `pnpm`.

## Detailed Data Flows
A. Package Vulnerability Scan

There are two distinct scan triggers today — this section originally described only the
target Kafka-based design; the actual behavior differs by trigger:

- **Manual (customer uploads a package or bulk-imports a package.json)**: still synchronous
  and in-process, no Kafka involved. `ServicePackageService.triggerScan()` (aba-bl) calls
  `VulnerabilityScanService.scanPackages()` directly, which queries OSV.dev itself. This path
  is unchanged and only ever checks the newly added/changed packages, not a service's full
  set.
- **Scheduled (plan-driven periodic rescan)**: the real Kafka flow, implemented in aba-bl's
  `src/modules/scheduler/` and worker's `src/infrastructure/kafka/`. See
  `aba-bl/README.md#plan-driven-package-rescanning` for the full design:
  - aba-bl's `PackageRescanSchedulerService` (cron) finds active services whose company plan
    (`SubscriptionPlan.rescanIntervalDays`) makes them due for a full rescan, and emits
    `package.scan`: `{ scanId, companyId, serviceId, packages: [{id, ecosystem, name, version}] }`.
  - worker's Vulnerability Fetcher Worker consumes it, queries OSV.dev, and produces
    `vulnerability.fetched`.
  - aba-bl's `VulnerabilityFetchedConsumerService` consumes the topic, upserts vulnerabilities
    into the DB (reusing the same persistence logic the manual path uses), and stamps
    `Service.lastScannedAt`.

  There is no `PackageSnapshot` model in this codebase; the linking unit is `Service` /
  `ServicePackage`, not a snapshot.

**Notification pipeline (both triggers feed into this — replaces the old synchronous email call):**
- Either trigger's scan-persistence logic (`VulnerabilityScanService.persistScanResults()`
  in aba-bl) ends by publishing `vulnerability.notification.pending` instead of emailing
  directly — detection and notification are now fully decoupled.
- worker's consumer for that topic only upserts a `ServicePackageNotificationState` row per
  affected package (muted flag, last-notified-at, next-notify-at) — it never sends email.
- A new daily cron sweep in worker (`runNotificationDigestSweep`, guarded against
  double-running across replicas via a `NotificationSweepState` singleton row) finds every
  unmuted, due package, re-checks it's still actually vulnerable, resolves recipients, and
  sends **one combined digest email per recipient per service** (never one email per
  package) via its own outbound-email client (worker previously had none).
- Recipients: the company's single designated `Company.primaryOwnerId`, plus every active
  `BUSINESS_ADMIN` user linked (via the new generic `TeamMembership` table) to the team that
  owns the service's environment.
- Every send (or skip, e.g. zero recipients) is logged to `NotificationLog` /
  `ActivityLog` — the latter also captures package view/mute/snooze/update/remove events —
  surfaced in aba-web's admin dashboard (`/admin/vulnerabilities`, `/admin/activity-logs`).
- Customers can mute a package's notifications indefinitely or snooze to a specific date
  from the package's row actions in the dashboard; this state is shared per (service,
  package), not personal to whichever recipient set it.

B. E2E Test Execution (triggered by GitHub Webhook) — **not implemented, aspirational.**
- GitHub sends a push webhook → API Webhook module verifies signature, resolves environment/service, creates a TestRun with status QUEUED.
- API publishes test.scheduled with test run ID and context.
- Test Executor Worker picks up the message, loads detailed test definitions from the API (or DB directly, if permissions allow), and starts Playwright.
- After each test, partial results are streamed back via test.result (or a single final result message).
- API consumes results, updates TestRun status, creates TestResult records, and triggers notification.req if failures are above threshold.
- Notifier Worker sends alerts to the customer.

C. Repository-Connection Triggered Rescan (GitHub webhook) — **implemented**, and distinct
from B above despite both starting from "GitHub sends a webhook": this one re-scans packages,
never runs a test, and never reads the repository's code (no stored GitHub token; the
customer pastes our webhook URL + a secret we generate into their own repo's webhook
settings — we never call GitHub's API at all).
- Customer connects one repo+branch to a `Service` (`POST
  .../services/:serviceId/repository-connection`) — one connection per service. We generate a
  `webhookToken` (embedded in the callback URL) and a `webhookSecret` (HMAC key), shown to the
  customer exactly once.
- GitHub pushes to the watched branch, or publishes a release → `POST
  /webhooks/github/:webhookToken` (aba-bl's `GithubWebhookController`) → verifies
  `X-Hub-Signature-256` over the raw body, looks up the connection by token.
- The connection's `triggerMode` decides what happens next: `INSTANT` scans immediately;
  `PUSH_COUNT` batches until a configured number of matching pushes accumulate;
  `TIME_INTERVAL` only accumulates, and a separate daily cron
  (`RepositoryTriggerSweepService`) fires once the configured interval has elapsed **and**
  something actually happened since the last scan.
- Either path publishes `package.scan` via the same `PackageRescanSchedulerService
  .publishScanForService()` the plan-driven cron scheduler uses (data flow A above) — from
  there it's the identical `vulnerability.fetched` → persist → `vulnerability.notification
  .pending` pipeline.
- Cadence defaults from the company's `SubscriptionPlan` (a production-environment branch
  defaults to `INSTANT` on any paid plan; free tier and non-production branches default to the
  plan's configured batching, or a system default) but is always customer-editable afterward
  regardless of plan. See `aba-bl/README.md#repository-connections-github-triggered-rescans`
  for the full design.
- **Known limitation**: GitHub requires a publicly reachable HTTPS URL for a webhook's Payload
  URL — it cannot call back to a `localhost` address, so real end-to-end testing (an actual
  `git push`, as opposed to a simulated signed `curl`) isn't possible against a local dev
  server without a tunnel (e.g. `cloudflared tunnel --url http://localhost:8000`, no account
  needed) until the service is deployed to a real domain. No code changes are needed either
  way — the webhook URL customers are shown is always built from the live request's own host.

## Running the Stack

```bash
# Dev (with hot reload, mounts source volumes):
docker-compose -f docker-compose.dev.yml up --build

# Tear down (including volumes):
docker-compose -f docker-compose.dev.yml down -v
```

Copy root `.env` values into each service's `.env.local` file before running. Services require MongoDB (port 27017) and PostgreSQL (port 5432). Docker compose reads each service's `.env.local` via `env_file`. Each service exposes a health endpoint at `/api/health`.

Docker containers run with a 2 GB memory limit (`--max-old-space-size=2048`); if a service crashes on startup, an OOM is the most likely cause.


### `aba-web` (Next.js)
```bash
pnpm dev              # dev server
pnpm build            # production build
pnpm lint             # eslint
pnpm unit-test        # jest unit tests
pnpm e2e-test         # Playwright E2E (UI mode)
pnpm e2e-report       # view last Playwright report
```

To run a single Jest test:
```bash
pnpm unit-test -- --testPathPattern=ComponentName
```

### `api-gateway` (Express)
```bash
pnpm dev              # ts-node-dev with path aliases
pnpm build            # tsc compile
pnpm test             # jest
```

## Code Architecture

### `aba-web` — Next.js App Router

Route groups: `(users)/` and `(company)/` use Next.js grouped routing. Auth is handled by next-auth with JWT strategy, proxied through `src/app/api/` route handlers.

Data fetching uses TanStack Query (`@tanstack/react-query`). Global shared utilities, types, and services live in `src/modules/shared/`.

**i18n**: Server components use `getServerTranslations()` from `@/shared/utils/i18n/server`; client components use `react-i18next` with localStorage backend and language detection.

Jest uses a separate `tsconfig.jest.json` and a `jest.setup.ts` that configures `jest-fetch-mock` and `@testing-library/jest-dom`. Mocks for `next/router` and `next/navigation` are in `src/__mocks__/`. Unit test files co-locate with the source files they test; `src/__tests__/` holds cross-cutting tests.

## Environment Variables

Key variables required across services (set in root `.env`, copied to each service's `.env.local`):

| Variable | Used by | Purpose |
|---|---|---|
| `PORT_WORKER` | worker | Listening port (default 3001) |
| `PORT_BFF` | aba-bl | Listening port (default 3002) |
| `PORT_WEB` | aba-web | Listening port (default 3000) |
| `DATABASE_URL` | aba-bl, worker | PostgreSQL connection string |
| `BFF_URL` | worker | URL of the NestJS BFF to proxy to |
| `FRONTEND_URL` | aba-bl | Allowed CORS origin (default `http://localhost:3000`) |
| `COOKIE_SECRET` | aba-bl | Cookie-parser signing secret |
| `ENCRYPTION_IV` | aba-bl, aba-web, worker | Shared encryption IV |
| `NEXTAUTH_SECRET` | aba-web | next-auth JWT secret |
| `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASS` | aba-bl, worker | Outbound email transport. Same variable names in both services — aba-bl still sends other transactional email (password reset); worker sends only the vulnerability notification digest. |
| `NOTIFICATION_DIGEST_CRON` | worker | Cron expression for how often the digest sweep *checks* for due packages (default: daily at 08:00) — not how often any one package is actually re-notified. |
| `NOTIFICATION_DIGEST_INTERVAL_HOURS` | worker | Minimum time between two digest emails for the same package (default 24), applied after a successful send. |
| `INTERNAL_API_KEY` | worker, aba-bl | Shared-secret header required by internal endpoints: worker's `POST /internal/notifications/sweep`, and aba-bl's `POST /internal/ai/token-grants` (AI token top-up grant). Empty allows any caller outside production. |
| `ANTHROPIC_API_KEY` | aba-bl | Claude API key for the AI-assist features (Phase B: suggest tests, explain runs, improve a test). Unset ⇒ AI assist reports disabled and never calls out. |
| `AI_TOKEN_MARGIN` | aba-bl | Gross margin used to derive the AI-token sell price for reporting (default `0.6`). See `aba-bl/README.md#ai-assist-token-metering--package-billing-phase-b--implemented`. |

## Git Workflow

Branch from `development`, name branches `feature/{issue-number}-{issue-title}`. PRs target `development` only — never `demo` or `production` directly. Commit prefixes: `feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `doc:`.

## Component Conventions (aba-web)

- Props types named `{ComponentName}Props`
- Double quotes for JS strings/classNames
- All test descriptions written in English

## Help & Support page
Every customer-facing change (new page, button, form, role rule, plan limit, scan/automation or notification behaviour in any service) must also update the in-app Help & Support articles in `aba-web/src/modules/help/constants/helpArticles.ts`. Full rule: see "Help & Support page" in `aba-web/CLAUDE.md`. This includes changes made in `aba-bl` or `worker`, such as the GitHub trigger cadence or the notification digest.
