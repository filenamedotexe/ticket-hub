import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'file:./dev.db',
    },
  },
});

async function main() {
  console.log('🌱 Seeding database...');

  // Create demo tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo-company' },
    update: {},
    create: {
      name: 'Demo Company',
      slug: 'demo-company',
    },
  });

  console.log('✅ Created tenant:', tenant.name);

  // Create demo users - one for each role (pre-verified since they use passwords)
  const users = [
    {
      email: 'client@demo.com',
      name: 'Demo Client',
      role: 'CLIENT' as const,
      emailVerified: new Date(), // Pre-verified for demo
    },
    {
      email: 'staff@demo.com',
      name: 'Demo Staff',
      role: 'STAFF' as const,
      emailVerified: new Date(), // Pre-verified for demo
    },
    {
      email: 'admin@demo.com',
      name: 'Demo Admin',
      role: 'ADMIN' as const,
      emailVerified: new Date(), // Pre-verified for demo
    },
  ];

  for (const userData of users) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {
        emailVerified: userData.emailVerified, // Update verification status
      },
      create: {
        ...userData,
        tenantId: tenant.id,
      },
    });
    console.log(`✅ Created user: ${user.name} (${user.role}) - Pre-verified`);
  }

  console.log('🎉 Database seeded successfully!');
}

main()
  .catch(e => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
