#!/bin/sh
set -e

# Dev-only schema sync. `prisma db push` applies the schema directly (production
# uses `migrate deploy`, not this entrypoint). We intentionally do NOT pass
# --skip-generate: db push regenerates the Prisma client here too, so aba-bl's
# code always matches the schema inside this container's node_modules volume
# (prevents the "client is stale after a schema change" boot failures).
#
# NOTE: a *destructive* dev schema change (e.g. a renamed/dropped table) makes
# db push stop and ask for --accept-data-loss. That's deliberate — resolve it
# once, by hand, so dev data is never wiped silently:
#   docker compose -f docker-compose.dev.yml run --rm --entrypoint sh api \
#     -c "pnpm --filter @aba/database exec prisma db push --accept-data-loss"
echo "Syncing Prisma schema (dev db push) and regenerating client..."
pnpm --filter @aba/database db:push

echo "Starting NestJS app..."
exec pnpm run start:dev
