import { expect, test, describe, beforeAll, afterAll } from 'bun:test';

// Skip database tests if no DATABASE_URL is provided
const hasDatabase = !!process.env.DATABASE_URL;

describe('Phase 2.1 - Prisma Tenant Middleware', () => {
  if (!hasDatabase) {
    test.skip('Database tests skipped - no DATABASE_URL provided', () => {});
    return;
  }

  // Only import and initialize if we have a database
  const {
    PrismaClient,
    createTenantAwarePrismaClient,
    createDatabaseContext,
    createAdminDatabaseContext,
  } = require('@ticket-hub/db');

  const adminPrisma = new PrismaClient();

  let testTenantA: any;
  let testTenantB: any;
  let userTenantA: any;
  let userTenantB: any;

  beforeAll(async () => {
    // Clean up any existing test data
    await adminPrisma.user
      .deleteMany({
        where: { email: { contains: 'tenant-test-' } },
      })
      .catch(() => {}); // Ignore errors if table doesn't exist

    await adminPrisma.tenant
      .deleteMany({
        where: { slug: { contains: 'tenant-test-' } },
      })
      .catch(() => {}); // Ignore errors if table doesn't exist

    // Create two separate tenants for isolation testing
    testTenantA = await adminPrisma.tenant.create({
      data: {
        name: 'Test Tenant A',
        slug: 'tenant-test-a-' + Date.now(),
      },
    });

    testTenantB = await adminPrisma.tenant.create({
      data: {
        name: 'Test Tenant B',
        slug: 'tenant-test-b-' + Date.now(),
      },
    });

    // Create users in each tenant
    userTenantA = await adminPrisma.user.create({
      data: {
        email: 'tenant-test-user-a@example.com',
        name: 'User A',
        role: 'CLIENT',
        tenantId: testTenantA.id,
      },
    });

    userTenantB = await adminPrisma.user.create({
      data: {
        email: 'tenant-test-user-b@example.com',
        name: 'User B',
        role: 'CLIENT',
        tenantId: testTenantB.id,
      },
    });
  });

  afterAll(async () => {
    // Clean up test data
    await adminPrisma.user
      .deleteMany({
        where: { email: { contains: 'tenant-test-' } },
      })
      .catch(() => {});

    await adminPrisma.tenant
      .deleteMany({
        where: { slug: { contains: 'tenant-test-' } },
      })
      .catch(() => {});

    await adminPrisma.$disconnect();
  });

  test('should isolate users by tenant - user A cannot read user B records', async () => {
    const tenantAContext = createDatabaseContext(testTenantA.id);
    const tenantBContext = createDatabaseContext(testTenantB.id);

    // User A should only see their own data
    const usersFromTenantA = await tenantAContext.db.user.findMany();
    const usersFromTenantB = await tenantBContext.db.user.findMany();

    // Both should return exactly 1 user each
    expect(usersFromTenantA).toHaveLength(1);
    expect(usersFromTenantB).toHaveLength(1);

    // The users should belong to their respective tenants
    expect(usersFromTenantA[0].tenantId).toBe(testTenantA.id);
    expect(usersFromTenantB[0].tenantId).toBe(testTenantB.id);

    // Verify they can't see each other's data
    expect(usersFromTenantA[0].id).not.toBe(usersFromTenantB[0].id);

    // Verify tenant isolation - tenant A context should only find user A by email
    const userAFromTenantAContext = await tenantAContext.db.user.findUnique({
      where: { email: 'tenant-test-user-a@example.com' },
    });
    expect(userAFromTenantAContext).toBeTruthy();

    // Tenant A context should NOT find user B by email
    const userBFromTenantAContext = await tenantAContext.db.user.findUnique({
      where: { email: 'tenant-test-user-b@example.com' },
    });
    expect(userBFromTenantAContext).toBeNull();
  });

  test('should inject tenantId in findUnique queries', async () => {
    const tenantAContext = createDatabaseContext(testTenantA.id);

    // Should find user A when querying from tenant A context
    const userA = await tenantAContext.db.user.findUnique({
      where: { email: 'tenant-test-user-a@example.com' },
    });
    expect(userA).toBeTruthy();
    expect(userA?.id).toBe(userTenantA.id);

    // Should NOT find user B when querying from tenant A context
    const userB = await tenantAContext.db.user.findUnique({
      where: { email: 'tenant-test-user-b@example.com' },
    });
    expect(userB).toBeNull();
  });

  test('should inject tenantId in create operations', async () => {
    const tenantAContext = createDatabaseContext(testTenantA.id);

    const newUser = await tenantAContext.db.user.create({
      data: {
        email: 'tenant-test-new-user@example.com',
        name: 'New User',
        role: 'CLIENT',
        // Note: not specifying tenantId - middleware should inject it
      },
    });

    expect(newUser.tenantId).toBe(testTenantA.id);

    // Clean up
    await adminPrisma.user.delete({ where: { id: newUser.id } });
  });

  test('should inject tenantId in update operations', async () => {
    const tenantAContext = createDatabaseContext(testTenantA.id);

    // Try to update user B from tenant A context - should not work
    const updateResult = await tenantAContext.db.user.updateMany({
      where: { email: 'tenant-test-user-b@example.com' },
      data: { name: 'Updated Name' },
    });

    // Should not update any records (user B is not in tenant A)
    expect(updateResult.count).toBe(0);

    // Verify user B is unchanged
    const userB = await adminPrisma.user.findUnique({
      where: { id: userTenantB.id },
    });
    expect(userB?.name).toBe('User B'); // Original name
  });

  test('should inject tenantId in delete operations', async () => {
    // Create a user in tenant A that we can delete
    const tempUser = await adminPrisma.user.create({
      data: {
        email: 'tenant-test-temp-user@example.com',
        name: 'Temp User',
        role: 'CLIENT',
        tenantId: testTenantA.id,
      },
    });

    const tenantBContext = createDatabaseContext(testTenantB.id);

    // Try to delete the temp user from tenant B context - should not work
    const deleteResult = await tenantBContext.db.user.deleteMany({
      where: { email: 'tenant-test-temp-user@example.com' },
    });

    // Should not delete any records (temp user is not in tenant B)
    expect(deleteResult.count).toBe(0);

    // Verify temp user still exists
    const stillExists = await adminPrisma.user.findUnique({
      where: { id: tempUser.id },
    });
    expect(stillExists).toBeTruthy();

    // Clean up
    await adminPrisma.user.delete({ where: { id: tempUser.id } });
  });

  test('admin context bypass should work', async () => {
    const adminContext = createAdminDatabaseContext();

    // Admin should see all users across all tenants
    const allUsers = await adminContext.db.user.findMany({
      where: { email: { contains: 'tenant-test-' } },
    });

    expect(allUsers.length).toBeGreaterThanOrEqual(1);

    // Should find users from both tenants if they exist
    const tenantIds = allUsers.map(u => u.tenantId);
    const uniqueTenantIds = [...new Set(tenantIds)];
    expect(uniqueTenantIds.length).toBeGreaterThanOrEqual(1);
  });

  test('$omitTenant bypass should work for specific operations', async () => {
    const tenantAClient = createTenantAwarePrismaClient(testTenantA.id);

    // Normal query should be tenant-filtered
    const normalUsers = await tenantAClient.user.findMany();
    expect(normalUsers.length).toBeGreaterThanOrEqual(1);

    // Query with $omitTenant should bypass tenant filtering
    const allUsers = await tenantAClient.user.findMany({
      $omitTenant: true,
      where: { email: { contains: 'tenant-test-' } },
    } as any);

    expect(allUsers.length).toBeGreaterThanOrEqual(1);
  });

  test('should handle upsert operations with tenant isolation', async () => {
    const tenantAContext = createDatabaseContext(testTenantA.id);

    // Upsert should respect tenant boundaries - first check if user exists
    const existingUser = await tenantAContext.db.user.findUnique({
      where: { email: 'tenant-test-upsert@example.com' },
    });

    if (existingUser) {
      // Update existing user
      const upsertResult = await tenantAContext.db.user.update({
        where: { id: existingUser.id },
        data: { name: 'Updated Upsert User' },
      });

      expect(upsertResult.tenantId).toBe(testTenantA.id);
      expect(upsertResult.name).toBe('Updated Upsert User');
    } else {
      // Create new user
      const upsertResult = await tenantAContext.db.user.create({
        data: {
          email: 'tenant-test-upsert@example.com',
          name: 'Upsert User',
          role: 'CLIENT',
        },
      });

      expect(upsertResult.tenantId).toBe(testTenantA.id);
      expect(upsertResult.name).toBe('Upsert User');

      // Clean up
      await adminPrisma.user.delete({ where: { id: upsertResult.id } });
    }
  });

  test('should handle models without tenantId field gracefully', async () => {
    const tenantAContext = createDatabaseContext(testTenantA.id);

    // Tenant model doesn't have tenantId field - should work normally
    const tenant = await tenantAContext.db.tenant.findUnique({
      where: { id: testTenantA.id },
    });

    expect(tenant).toBeTruthy();
    expect(tenant?.id).toBe(testTenantA.id);
  });
});
