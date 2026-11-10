import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * One-time backfill for the new Company.primaryOwnerId designation (added by
 * the add_notification_pipeline migration). Assigns the earliest-created
 * BUSINESS_OWNER user of each company as its primary owner. Companies with no
 * BUSINESS_OWNER user are left unset — that's a legitimate steady state,
 * surfaced on the companies-with-vulnerabilities admin screen, not an error.
 *
 * Idempotent: only touches companies that don't already have a primaryOwnerId.
 */
async function main() {
  const companies = await prisma.company.findMany({
    where: { primaryOwnerId: null },
    select: { id: true },
  });

  console.log(`Backfilling primary owner for ${companies.length} company/companies...`);

  let assigned = 0;
  let skippedNoOwner = 0;

  for (const company of companies) {
    const earliestOwner = await prisma.user.findFirst({
      where: { companyId: company.id, role: 'BUSINESS_OWNER' },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });

    if (!earliestOwner) {
      skippedNoOwner++;
      continue;
    }

    await prisma.company.update({
      where: { id: company.id },
      data: { primaryOwnerId: earliestOwner.id },
    });
    assigned++;
  }

  console.log(`  ✓ assigned: ${assigned}`);
  console.log(`  – skipped (no BUSINESS_OWNER user yet): ${skippedNoOwner}`);
  console.log('Backfill complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
