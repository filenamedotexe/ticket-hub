import { expect, test, describe, beforeAll } from 'bun:test';

// Skip database tests if no DATABASE_URL is provided
const hasDatabase = !!process.env.DATABASE_URL;

describe('Phase 3.2 - WorkItem CRUD Server Actions (Simplified)', () => {
  if (!hasDatabase) {
    test.skip('Database tests skipped - no DATABASE_URL provided', () => {});
    return;
  }

  // Import after database check
  const {
    PrismaClient,
    createWorkItem,
    getWorkItems,
    getWorkItem,
    updateWorkItem,
    updateWorkItemStatus,
    getWorkItemsKanban,
  } = require('@ticket-hub/db');

  let testTenant: any;
  let staffUser: any;
  let adminUser: any;

  beforeAll(async () => {
    const adminPrisma = new PrismaClient();

    // Get test tenant and users (created by seed script)
    testTenant = await adminPrisma.tenant.findFirst({
      where: { slug: 'acme-corp' },
    });

    staffUser = await adminPrisma.user.findFirst({
      where: { email: 'staff@acme.com' },
    });

    adminUser = await adminPrisma.user.findFirst({
      where: { email: 'admin@acme.com' },
    });

    if (!testTenant || !staffUser || !adminUser) {
      throw new Error('Test data not found. Please run seed script first.');
    }

    await adminPrisma.$disconnect();
  });

  describe('Core CRUD Operations', () => {
    test('should create, read, update workitem and meet performance requirements', async () => {
      const startTime = performance.now();

      // CREATE
      const createInput = {
        type: 'TICKET' as const,
        title: 'Test: Performance CRUD Test',
        description: 'Full CRUD round-trip test',
        priority: 'HIGH' as const,
        meta: {
          tags: ['test', 'performance'],
          browser: 'Chrome',
        },
      };

      const created = await createWorkItem(
        testTenant.id,
        staffUser.id,
        staffUser.role,
        createInput
      );

      // Verify create
      expect(created.id).toBeTruthy();
      expect(created.type).toBe('TICKET');
      expect(created.title).toBe('Test: Performance CRUD Test');
      expect(created.status).toBe('TODO');
      expect(created.priority).toBe('HIGH');
      expect(created.tenantId).toBe(testTenant.id);
      expect(created.createdById).toBe(staffUser.id);
      expect(created.meta).toEqual({
        tags: ['test', 'performance'],
        browser: 'Chrome',
      });
      expect(created._performance.duration).toBeLessThan(300);

      // READ (single)
      const read = await getWorkItem(
        testTenant.id,
        staffUser.id,
        staffUser.role,
        created.id
      );

      expect(read.id).toBe(created.id);
      expect(read.title).toBe('Test: Performance CRUD Test');
      expect(read._performance.duration).toBeLessThan(300);

      // UPDATE
      const update = await updateWorkItem(
        testTenant.id,
        staffUser.id,
        staffUser.role,
        {
          id: created.id,
          status: 'IN_PROGRESS' as const,
          title: 'Test: Updated CRUD Test',
        }
      );

      expect(update.id).toBe(created.id);
      expect(update.status).toBe('IN_PROGRESS');
      expect(update.title).toBe('Test: Updated CRUD Test');
      expect(update._performance.duration).toBeLessThan(300);

      const totalTime = performance.now() - startTime;
      expect(totalTime).toBeLessThan(300); // Full round-trip under 300ms
    });

    test('should get work items list with filtering', async () => {
      const result = await getWorkItems(
        testTenant.id,
        adminUser.id,
        adminUser.role,
        { type: 'TICKET' }
      );

      expect(result.items).toBeInstanceOf(Array);
      expect(result.items.length).toBeGreaterThan(0);
      expect(result.items.every(item => item.type === 'TICKET')).toBe(true);
      expect(result._performance.duration).toBeLessThan(300);
    });

    test('should update work item status only', async () => {
      // First create a work item
      const created = await createWorkItem(
        testTenant.id,
        staffUser.id,
        staffUser.role,
        {
          type: 'TASK' as const,
          title: 'Test: Status Update',
        }
      );

      // Update status
      const updated = await updateWorkItemStatus(
        testTenant.id,
        staffUser.id,
        staffUser.role,
        created.id,
        'DONE'
      );

      expect(updated.id).toBe(created.id);
      expect(updated.status).toBe('DONE');
      expect(updated.title).toBe('Test: Status Update'); // Should remain unchanged
      expect(updated._performance.duration).toBeLessThan(300);
    });

    test('should get kanban grouped work items', async () => {
      const result = await getWorkItemsKanban(
        testTenant.id,
        adminUser.id,
        adminUser.role
      );

      expect(result.columns).toHaveProperty('TODO');
      expect(result.columns).toHaveProperty('IN_PROGRESS');
      expect(result.columns).toHaveProperty('QA');
      expect(result.columns).toHaveProperty('DONE');

      expect(result.columns.TODO).toBeInstanceOf(Array);
      expect(result.columns.IN_PROGRESS).toBeInstanceOf(Array);
      expect(result.columns.QA).toBeInstanceOf(Array);
      expect(result.columns.DONE).toBeInstanceOf(Array);

      expect(result._performance.duration).toBeLessThan(300);
    });

    test('should enforce tenant isolation', async () => {
      // Get work items for the test tenant
      const tenantItems = await getWorkItems(
        testTenant.id,
        adminUser.id,
        adminUser.role
      );

      // Should only see work items from this tenant
      expect(
        tenantItems.items.every(item => item.tenantId === testTenant.id)
      ).toBe(true);

      // Should not see items from other tenants (like Tech Solutions)
      const hasTechSolutionsItems = tenantItems.items.some(
        item =>
          item.title.includes('Database migration') ||
          item.title.includes('Code review')
      );
      expect(hasTechSolutionsItems).toBe(false);
    });
  });
});
