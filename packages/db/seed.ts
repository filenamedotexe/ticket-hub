import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Clean up existing data
  await prisma.workItem.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();

  // Create test tenants
  const tenant1 = await prisma.tenant.create({
    data: {
      name: 'Acme Corp',
      slug: 'acme-corp',
    },
  });

  const tenant2 = await prisma.tenant.create({
    data: {
      name: 'Tech Solutions',
      slug: 'tech-solutions',
    },
  });

  // Create test users
  const adminUser = await prisma.user.create({
    data: {
      name: 'Admin User',
      email: 'admin@acme.com',
      role: 'ADMIN',
      tenantId: tenant1.id,
    },
  });

  const staffUser = await prisma.user.create({
    data: {
      name: 'Staff Member',
      email: 'staff@acme.com',
      role: 'STAFF',
      tenantId: tenant1.id,
    },
  });

  const clientUser = await prisma.user.create({
    data: {
      name: 'Client User',
      email: 'client@acme.com',
      role: 'CLIENT',
      tenantId: tenant1.id,
    },
  });

  const tenant2User = await prisma.user.create({
    data: {
      name: 'Tech User',
      email: 'user@tech.com',
      role: 'STAFF',
      tenantId: tenant2.id,
    },
  });

  // Create sample WorkItems for tenant 1
  const workItems1 = await prisma.workItem.createMany({
    data: [
      {
        tenantId: tenant1.id,
        type: 'TICKET',
        title: 'Fix login page bug',
        description: 'Users cannot log in with special characters in password',
        status: 'TODO',
        priority: 'HIGH',
        assigneeId: staffUser.id,
        createdById: clientUser.id,
        meta: JSON.stringify({
          tags: ['bug', 'urgent'],
          browser: 'Chrome',
          version: '1.2.3',
        }),
      },
      {
        tenantId: tenant1.id,
        type: 'TASK',
        title: 'Update user documentation',
        description: 'Add new features to user guide',
        status: 'IN_PROGRESS',
        priority: 'MEDIUM',
        assigneeId: staffUser.id,
        createdById: adminUser.id,
        meta: JSON.stringify({
          tags: ['documentation'],
          estimatedHours: 4,
          section: 'user-guide',
        }),
      },
      {
        tenantId: tenant1.id,
        type: 'TICKET',
        title: 'Performance optimization',
        description: 'Dashboard loads slowly for large datasets',
        status: 'QA',
        priority: 'MEDIUM',
        assigneeId: staffUser.id,
        createdById: clientUser.id,
        meta: JSON.stringify({
          tags: ['performance', 'dashboard'],
          dataset_size: 'large',
          load_time: '5s',
        }),
      },
      {
        tenantId: tenant1.id,
        type: 'TASK',
        title: 'Setup CI/CD pipeline',
        description: 'Automate deployment process',
        status: 'DONE',
        priority: 'HIGH',
        assigneeId: adminUser.id,
        createdById: adminUser.id,
        meta: JSON.stringify({
          tags: ['devops', 'automation'],
          tools: ['GitHub Actions', 'Docker'],
          completion_date: new Date().toISOString(),
        }),
      },
      {
        tenantId: tenant1.id,
        type: 'TICKET',
        title: 'Mobile responsive design',
        description: 'Make the app work better on mobile devices',
        status: 'TODO',
        priority: 'LOW',
        assigneeId: null,
        createdById: clientUser.id,
        meta: JSON.stringify({
          tags: ['mobile', 'ui/ux'],
          devices: ['iPhone', 'Android'],
          priority_reason: 'low_usage',
        }),
      },
    ],
  });

  // Create sample WorkItems for tenant 2 (to test tenant isolation)
  const workItems2 = await prisma.workItem.createMany({
    data: [
      {
        tenantId: tenant2.id,
        type: 'TICKET',
        title: 'Database migration issue',
        description: 'Schema changes not applying correctly',
        status: 'TODO',
        priority: 'URGENT',
        assigneeId: tenant2User.id,
        createdById: tenant2User.id,
        meta: JSON.stringify({
          tags: ['database', 'migration'],
          affected_tables: ['users', 'orders'],
          error_code: 'DB_001',
        }),
      },
      {
        tenantId: tenant2.id,
        type: 'TASK',
        title: 'Code review checklist',
        description: 'Create standardized code review process',
        status: 'IN_PROGRESS',
        priority: 'MEDIUM',
        assigneeId: tenant2User.id,
        createdById: tenant2User.id,
        meta: JSON.stringify({
          tags: ['process', 'quality'],
          checklist_items: 12,
          completion: 60,
        }),
      },
    ],
  });

  console.log('Database seeded successfully!');
  console.log(`Created ${workItems1.count} work items for ${tenant1.name}`);
  console.log(`Created ${workItems2.count} work items for ${tenant2.name}`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
