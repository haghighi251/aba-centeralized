import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const plans = [
  {
    name: 'Starter',
    slug: 'starter',
    description: 'Perfect for individuals and small projects getting started with security monitoring.',
    maxServices: 1,
    maxEnvironments: 1,
    maxMonitoredBranches: null,
    monthlyPrice: 0,
    yearlyPrice: 0,
    isActive: true,
    isDefault: true,
  },
  {
    name: 'Basic',
    slug: 'basic',
    description: 'Great for small teams managing a handful of services.',
    maxServices: 3,
    maxEnvironments: null,
    maxMonitoredBranches: null,
    monthlyPrice: 69,
    yearlyPrice: 62,
    isActive: true,
    isDefault: false,
  },
  {
    name: 'Professional',
    slug: 'professional',
    description: 'For growing engineering teams with multiple services and environments.',
    maxServices: 10,
    maxEnvironments: 3,
    maxMonitoredBranches: 6,
    monthlyPrice: 380,
    yearlyPrice: 360,
    isActive: true,
    isDefault: false,
  },
  {
    name: 'Enterprise',
    slug: 'enterprise',
    description: 'For large organisations with extensive service portfolios and compliance needs.',
    maxServices: 50,
    maxEnvironments: null,
    maxMonitoredBranches: null,
    monthlyPrice: 850,
    yearlyPrice: 830,
    isActive: true,
    isDefault: false,
  },
];

async function main() {
  console.log('Seeding subscription plans...');

  for (const plan of plans) {
    await prisma.subscriptionPlan.upsert({
      where: { slug: plan.slug },
      update: {
        name: plan.name,
        description: plan.description,
        maxServices: plan.maxServices,
        maxEnvironments: plan.maxEnvironments,
        maxMonitoredBranches: plan.maxMonitoredBranches,
        monthlyPrice: plan.monthlyPrice,
        yearlyPrice: plan.yearlyPrice,
        isActive: plan.isActive,
        isDefault: plan.isDefault,
      },
      create: plan,
    });
    console.log(`  ✓ ${plan.name}`);
  }

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
