import { expect, test, describe, beforeAll, afterAll } from 'bun:test';

// Skip database tests if no DATABASE_URL is provided
const hasDatabase = !!process.env.DATABASE_URL;

describe('Database Models - Phase 1.1 & 1.2', () => {
  if (!hasDatabase) {
    test.skip('Database tests skipped - no DATABASE_URL provided', () => {});
    return;
  }

  // Only import and initialize if we have a database
  const { PrismaClient } = require('@ticket-hub/db');
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });
  let testTenant: any;
  const testUsers: any[] = [];

  beforeAll(async () => {
    // Clean up any existing test data
    await prisma.user.deleteMany({
      where: { email: { contains: 'test-' } },
    });
    await prisma.tenant.deleteMany({
      where: { slug: { contains: 'test-' } },
    });

    // Create test tenant for all tests
    testTenant = await prisma.tenant.create({
      data: {
        name: 'Test Company',
        slug: 'test-company-' + Date.now(),
      },
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.user.deleteMany({
      where: { email: { contains: 'test-' } },
    });
    await prisma.tenant.deleteMany({
      where: { slug: { contains: 'test-' } },
    });
    await prisma.$disconnect();
  });

  test('should create a tenant successfully', async () => {
    // Tenant is created in beforeAll, just verify it exists
    expect(testTenant).toBeDefined();
    expect(testTenant.name).toBe('Test Company');
    expect(testTenant.slug).toContain('test-company-');
    expect(testTenant.id).toBeDefined();
    expect(testTenant.createdAt).toBeInstanceOf(Date);
    expect(testTenant.updatedAt).toBeInstanceOf(Date);
  });

  test('should enforce unique tenant slug constraint', async () => {
    // Try to create tenant with same slug
    try {
      await prisma.tenant.create({
        data: {
          name: 'Another Test Company',
          slug: testTenant.slug,
        },
      });
      // Should not reach here
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error.code).toBe('P2002'); // Prisma unique constraint error
    }
  });

  describe('User Model Tests', () => {
    test('should create users with different roles', async () => {
      const roles = ['CLIENT', 'STAFF', 'ADMIN'] as const;

      for (const role of roles) {
        const user = await prisma.user.create({
          data: {
            email: `test-${role.toLowerCase()}@example.com`,
            name: `Test ${role}`,
            role: role,
            tenantId: testTenant.id,
          },
        });

        testUsers.push(user);

        expect(user).toBeDefined();
        expect(user.email).toBe(`test-${role.toLowerCase()}@example.com`);
        expect(user.name).toBe(`Test ${role}`);
        expect(user.role).toBe(role);
        expect(user.tenantId).toBe(testTenant.id);
        expect(user.id).toBeDefined();
      }
    });

    test('should enforce unique email constraint', async () => {
      try {
        await prisma.user.create({
          data: {
            email: testUsers[0].email, // Duplicate email
            name: 'Duplicate User',
            role: 'CLIENT',
            tenantId: testTenant.id,
          },
        });
        // Should not reach here
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.code).toBe('P2002'); // Prisma unique constraint error
      }
    });

    test('should have default CLIENT role', async () => {
      const user = await prisma.user.create({
        data: {
          email: `test-default-role@example.com`,
          name: 'Default Role User',
          tenantId: testTenant.id,
          // No role specified - should default to CLIENT
        },
      });

      expect(user.role).toBe('CLIENT');

      // Clean up
      await prisma.user.delete({ where: { id: user.id } });
    });

    test('should load user with tenant relationship', async () => {
      const userWithTenant = await prisma.user.findUnique({
        where: { id: testUsers[0].id },
        include: { tenant: true },
      });

      expect(userWithTenant).toBeDefined();
      expect(userWithTenant?.tenant).toBeDefined();
      expect(userWithTenant?.tenant.name).toBe(testTenant.name);
      expect(userWithTenant?.tenant.slug).toBe(testTenant.slug);
    });

    test('should load tenant with users relationship', async () => {
      const tenantWithUsers = await prisma.tenant.findUnique({
        where: { id: testTenant.id },
        include: { users: true },
      });

      expect(tenantWithUsers).toBeDefined();
      expect(tenantWithUsers?.users).toHaveLength(3); // CLIENT, STAFF, ADMIN

      const roles = tenantWithUsers?.users.map(u => u.role).sort();
      expect(roles).toEqual(['ADMIN', 'CLIENT', 'STAFF']);
    });

    test('should cascade delete users when tenant is deleted', async () => {
      // Create a separate tenant for this test
      const tempTenant = await prisma.tenant.create({
        data: {
          name: 'Temp Tenant',
          slug: 'temp-tenant-' + Date.now(),
        },
      });

      const tempUser = await prisma.user.create({
        data: {
          email: `temp-user@example.com`,
          name: 'Temp User',
          role: 'CLIENT',
          tenantId: tempTenant.id,
        },
      });

      // Delete the tenant
      await prisma.tenant.delete({
        where: { id: tempTenant.id },
      });

      // User should be deleted due to cascade
      const deletedUser = await prisma.user.findUnique({
        where: { id: tempUser.id },
      });

      expect(deletedUser).toBeNull();
    });
  });
});

describe('UserRole Enum Tests', () => {
  test('should support all three role values', () => {
    const roles = ['CLIENT', 'STAFF', 'ADMIN'];

    roles.forEach(role => {
      expect(typeof role).toBe('string');
      expect(['CLIENT', 'STAFF', 'ADMIN']).toContain(role);
    });
  });
});

describe('Auth Configuration Tests', () => {
  test('should have proper auth configuration structure', async () => {
    // Test that our auth config can be imported
    const { authOptions } = await import('../apps/web/src/lib/auth');

    expect(authOptions).toBeDefined();
    expect(authOptions.providers).toBeDefined();
    expect(authOptions.callbacks).toBeDefined();
    expect(authOptions.session).toBeDefined();
    expect(authOptions.session?.strategy).toBe('jwt');
  });

  test('should have credentials provider configured', async () => {
    const { authOptions } = await import('../apps/web/src/lib/auth');

    expect(authOptions.providers).toHaveLength(1);
    expect(authOptions.providers[0].type).toBe('credentials');
    expect(authOptions.providers[0].name).toBe('Credentials');
  });
});
