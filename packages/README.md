# @aba/database

Single source of truth for the ABA platform's PostgreSQL schema, Prisma client, and migrations.

## Why this package exists

Two services share the same database:
- **`aba-bl`** (NestJS BFF) — reads/writes companies, users, test runs, results
- **`worker`** (Express) — reads test definitions, writes test results and vulnerability findings

Without centralising the schema, running `prisma db push` from either service could silently overwrite
the other's pending changes or, worse, drop columns the other service depends on.

This package solves that by being the **only place** allowed to run schema-changing commands.

## Rules

| Command | Allowed in | Forbidden in |
|---|---|---|
| `db:migrate` | `packages/database` only | `aba-bl`, `worker` |
| `db:push` | `packages/database` only | `aba-bl`, `worker` |
| `db:generate` | All services (generates types) | — |
| `db:studio` | `packages/database` only | — |

## Setup

```bash
# From the monorepo root — install everything including this package
pnpm install

# Copy the example env file and fill in your DATABASE_URL
cp packages/database/.env.example packages/database/.env
```

## Daily workflow

### Making a schema change

```bash
# 1. Edit the schema
code packages/database/prisma/schema.prisma

# 2. Create a migration (updates the DB and records the migration file)
cd packages/database
pnpm db:migrate        # dev — prompts for a migration name

# 3. Regenerate the typed client in every consuming service
cd ../../aba-bl && pnpm db:generate
cd ../worker   && pnpm db:generate
```

### Applying migrations in CI / production

```bash
cd packages/database
pnpm db:migrate:deploy  # runs pending migrations without prompting
```

### Checking migration status

```bash
cd packages/database
pnpm db:migrate:status
```

### Browsing the database visually

```bash
cd packages/database
pnpm db:studio          # opens Prisma Studio at http://localhost:5555
```

## Importing in application code

```typescript
// Express (worker)
import { prisma } from '@aba/database';
const user = await prisma.user.findUnique({ where: { id: 1 } });

// NestJS (aba-bl) — PrismaService extends PrismaClient from this package
import { PrismaClient } from '@aba/database';
export class PrismaService extends PrismaClient implements OnModuleInit { ... }

// Types
import type { User, Company, UserRole } from '@aba/database';
```

## Environment variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string, e.g. `postgresql://postgres:postgres@localhost:5432/aba` |

## File structure

```
packages/database/
  prisma/
    schema.prisma       ← The one schema to rule them all
    migrations/         ← Auto-generated migration files (commit these)
  src/
    client.ts           ← PrismaClient singleton factory
    index.ts            ← Public API re-exports
  .env.example          ← Copy to .env and fill in DATABASE_URL
  README.md
```
