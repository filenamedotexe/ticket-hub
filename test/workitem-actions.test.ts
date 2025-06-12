import { expect, test, describe, beforeAll, afterAll } from 'bun:test';

// Skip database tests if no DATABASE_URL is provided
const hasDatabase = !!process.env.DATABASE_URL;

describe('Phase 3.2 - WorkItem CRUD Server Actions', () => {
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
    deleteWorkItem,
    updateWorkItemStatus,
    getWorkItemsKanban,
  } = require('@ticket-hub/db');

  // Import types separately
  type CreateWorkItemInput = {
    type: 'TICKET' | 'TASK';
    title: string;
    description?: string;
    status?: 'TODO' | 'IN_PROGRESS' | 'QA' | 'DONE';
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    assigneeId?: string;
    meta?: any;
  };

  type UpdateWorkItemInput = {
    id: string;
    title?: string;
    description?: string;
    status?: 'TODO' | 'IN_PROGRESS' | 'QA' | 'DONE';
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    assigneeId?: string;
    meta?: any;
  };

  const adminPrisma = new PrismaClient();
  let testTenant: any;
  let staffUser: any;
  let clientUser: any;
  let adminUser: any;

  beforeAll(async () => {
    // Clean up any existing test data
    await adminPrisma.workItem.deleteMany({
      where: {
        title: {
          startsWith: 'Test:',
        },
      },
    });

    // Get test tenant and users (created by seed script)
    testTenant = await adminPrisma.tenant.findFirst({
      where: { slug: 'acme-corp' },
    });

    staffUser = await adminPrisma.user.findFirst({
      where: { email: 'staff@acme.com' },
    });

    clientUser = await adminPrisma.user.findFirst({
      where: { email: 'client@acme.com' },
    });

    adminUser = await adminPrisma.user.findFirst({
      where: { email: 'admin@acme.com' },
    });

    if (!testTenant || !staffUser || !clientUser || !adminUser) {
      throw new Error('Test data not found. Please run seed script first.');
    }
  });

  afterAll(async () => {
    // Clean up test data
    await adminPrisma.workItem.deleteMany({
      where: {
        title: {
          startsWith: 'Test:',
        },
      },
    });
    await adminPrisma.$disconnect();
  });

  describe('Create WorkItem', () => {
    test('should create a ticket with valid data', async () => {
      const input: CreateWorkItemInput = {
        type: 'TICKET',
        title: 'Test: Create ticket',
        description: 'Test ticket creation',
        priority: 'HIGH',
        meta: {
          tags: ['test'],
          browser: 'Chrome',
        },
      };

      const result = await createWorkItem(
        testTenant.id,
        clientUser.id,
        clientUser.role,
        input
      );

      expect(result.id).toBeTruthy();
      expect(result.type).toBe('TICKET');
      expect(result.title).toBe('Test: Create ticket');
      expect(result.status).toBe('TODO'); // Default
      expect(result.priority).toBe('HIGH');
      expect(result.tenantId).toBe(testTenant.id);
      expect(result.createdById).toBe(clientUser.id);
      expect(result.meta).toEqual({
        tags: ['test'],
        browser: 'Chrome',
      });
      expect(result._performance.duration).toBeLessThan(300); // Performance requirement
    });

    test('should create a task with minimal data', async () => {
      const input: CreateWorkItemInput = {
        type: 'TASK',
        title: 'Test: Create task',
      };

      const result = await createWorkItem(
        testTenant.id,
        staffUser.id,
        staffUser.role,
        input
      );

      expect(result.type).toBe('TASK');
      expect(result.status).toBe('TODO'); // Default
      expect(result.priority).toBe('MEDIUM'); // Default
      expect(result._performance.duration).toBeLessThan(300);
    });
  });

  describe('Read WorkItems', () => {
    test('should get all work items for admin user', async () => {
      const result = await getWorkItems(
        testTenant.id,
        adminUser.id,
        adminUser.role
      );

      expect(result.items).toBeInstanceOf(Array);
      expect(result.items.length).toBeGreaterThan(0);
      expect(result._performance.duration).toBeLessThan(300);

      // Should include both test items and seed data
      const testItems = result.items.filter(item =>
        item.title.startsWith('Test:')
      );
      expect(testItems.length).toBe(2);
    });

    test('should get filtered work items by type', async () => {
      const result = await getWorkItems(
        testTenant.id,
        adminUser.id,
        adminUser.role,
        { type: 'TICKET' }
      );

      expect(result.items.every(item => item.type === 'TICKET')).toBe(true);
      expect(result._performance.duration).toBeLessThan(300);
    });

    test('should get filtered work items by status', async () => {
      const result = await getWorkItems(
        testTenant.id,
        adminUser.id,
        adminUser.role,
        { status: 'TODO' }
      );

      expect(result.items.every(item => item.status === 'TODO')).toBe(true);
      expect(result._performance.duration).toBeLessThan(300);
    });

    test('should limit results for client user', async () => {
      const result = await getWorkItems(
        testTenant.id,
        clientUser.id,
        clientUser.role
      );

      // Client should only see their own work items
      expect(
        result.items.every(
          item =>
            item.assigneeId === clientUser.id ||
            item.createdById === clientUser.id
        )
      ).toBe(true);
      expect(result._performance.duration).toBeLessThan(300);
    });
  });

  describe('Read Single WorkItem', () => {
    test('should get single work item by id', async () => {
      // First create a work item
      const created = await createWorkItem(
        testTenant.id,
        staffUser.id,
        staffUser.role,
        {
          type: 'TICKET',
          title: 'Test: Single item',
          priority: 'URGENT',
        }
      );

      const result = await getWorkItem(
        testTenant.id,
        staffUser.id,
        staffUser.role,
        created.id
      );

      expect(result.id).toBe(created.id);
      expect(result.title).toBe('Test: Single item');
      expect(result.priority).toBe('URGENT');
      expect(result._performance.duration).toBeLessThan(300);
    });

    test('should throw error for non-existent work item', async () => {
      await expect(
        getWorkItem(
          testTenant.id,
          staffUser.id,
          staffUser.role,
          'non-existent-id'
        )
      ).rejects.toThrow('WorkItem not found');
    });
  });

  describe('Update WorkItem', () => {
    test('should update work item fields', async () => {
      // Create work item first
      const created = await createWorkItem(
        testTenant.id,
        staffUser.id,
        staffUser.role,
        {
          type: 'TASK',
          title: 'Test: Update item',
          status: 'TODO',
        }
      );

      const update: UpdateWorkItemInput = {
        id: created.id,
        title: 'Test: Updated item',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        meta: {
          tags: ['updated'],
        },
      };

      const result = await updateWorkItem(
        testTenant.id,
        staffUser.id,
        staffUser.role,
        update
      );

      expect(result.id).toBe(created.id);
      expect(result.title).toBe('Test: Updated item');
      expect(result.status).toBe('IN_PROGRESS');
      expect(result.priority).toBe('HIGH');
      expect(result.meta).toEqual({ tags: ['updated'] });
      expect(result._performance.duration).toBeLessThan(300);
    });

    test('should update work item status only', async () => {
      const created = await createWorkItem(
        testTenant.id,
        staffUser.id,
        staffUser.role,
        {
          type: 'TICKET',
          title: 'Test: Status update',
          status: 'TODO',
        }
      );

      const result = await updateWorkItemStatus(
        testTenant.id,
        staffUser.id,
        staffUser.role,
        created.id,
        'DONE'
      );

      expect(result.id).toBe(created.id);
      expect(result.status).toBe('DONE');
      expect(result.title).toBe('Test: Status update'); // Should remain unchanged
      expect(result._performance.duration).toBeLessThan(300);
    });
  });

  describe('Delete WorkItem', () => {
    test('should delete work item', async () => {
      // Create work item first
      const created = await createWorkItem(
        testTenant.id,
        adminUser.id,
        adminUser.role,
        {
          type: 'TASK',
          title: 'Test: Delete item',
        }
      );

      const result = await deleteWorkItem(
        testTenant.id,
        adminUser.id,
        adminUser.role,
        created.id
      );

      expect(result.success).toBe(true);
      expect(result._performance.duration).toBeLessThan(300);

      // Verify it's deleted
      await expect(
        getWorkItem(testTenant.id, adminUser.id, adminUser.role, created.id)
      ).rejects.toThrow('WorkItem not found');
    });
  });

  describe('Kanban Operations', () => {
    test('should get work items grouped by status', async () => {
      // Create work items in different statuses
      await createWorkItem(testTenant.id, staffUser.id, staffUser.role, {
        type: 'TICKET',
        title: 'Test: Kanban TODO',
        status: 'TODO',
      });

      await createWorkItem(testTenant.id, staffUser.id, staffUser.role, {
        type: 'TICKET',
        title: 'Test: Kanban IN_PROGRESS',
        status: 'IN_PROGRESS',
      });

      await createWorkItem(testTenant.id, staffUser.id, staffUser.role, {
        type: 'TICKET',
        title: 'Test: Kanban QA',
        status: 'QA',
      });

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
  });

  describe('Performance Requirements', () => {
    test('should complete full CRUD round-trip under 300ms', async () => {
      const startTime = performance.now();

      // Create
      const created = await createWorkItem(
        testTenant.id,
        staffUser.id,
        staffUser.role,
        {
          type: 'TICKET',
          title: 'Test: Performance test',
        }
      );

      // Read
      await getWorkItem(
        testTenant.id,
        staffUser.id,
        staffUser.role,
        created.id
      );

      // Update
      await updateWorkItem(testTenant.id, staffUser.id, staffUser.role, {
        id: created.id,
        status: 'IN_PROGRESS',
      });

      const totalTime = performance.now() - startTime;
      expect(totalTime).toBeLessThan(300);
    });
  });

  describe('Tenant Isolation', () => {
    test('should isolate work items by tenant', async () => {
      // Get work items for the test tenant
      const tenant1Items = await getWorkItems(
        testTenant.id,
        adminUser.id,
        adminUser.role
      );

      // Should only see work items from this tenant
      expect(
        tenant1Items.items.every(item => item.tenantId === testTenant.id)
      ).toBe(true);

      // Should not see items from other tenants (like Tech Solutions)
      const hasTechSolutionsItems = tenant1Items.items.some(
        item =>
          item.title.includes('Database migration') ||
          item.title.includes('Code review')
      );
      expect(hasTechSolutionsItems).toBe(false);
    });
  });
});
