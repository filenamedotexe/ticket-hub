import { expect, test, describe } from 'bun:test';
import { PrismaClient } from '@prisma/client';

describe('Phase 3.2 - WorkItem CRUD (Direct Test)', () => {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: 'file:./packages/db/dev.db',
      },
    },
  });

  test('should demonstrate WorkItem CRUD operations work', async () => {
    try {
      // Verify database has data
      const tenants = await prisma.tenant.findMany();
      const users = await prisma.user.findMany();
      const existingWorkItems = await prisma.workItem.findMany();

      console.log('Found tenants:', tenants.length);
      console.log('Found users:', users.length);
      console.log('Found work items:', existingWorkItems.length);

      expect(tenants.length).toBeGreaterThan(0);
      expect(users.length).toBeGreaterThan(0);
      expect(existingWorkItems.length).toBeGreaterThan(0);

      // Get first tenant and user for testing
      const tenant = tenants[0];
      const user = users[0];

      console.log('Using tenant:', tenant.slug);
      console.log('Using user:', user.email);

      // Test CREATE
      const startTime = performance.now();
      const newWorkItem = await prisma.workItem.create({
        data: {
          tenantId: tenant.id,
          type: 'TICKET',
          title: 'Direct Test: CRUD Operation',
          description: 'Testing direct CRUD operations',
          status: 'TODO',
          priority: 'HIGH',
          createdById: user.id,
          meta: JSON.stringify({
            tags: ['test', 'direct'],
            browser: 'Test',
          }),
        },
        include: {
          assignee: true,
          createdBy: true,
          tenant: true,
        },
      });

      const createTime = performance.now() - startTime;
      console.log('CREATE time:', createTime, 'ms');

      expect(newWorkItem.id).toBeTruthy();
      expect(newWorkItem.type).toBe('TICKET');
      expect(newWorkItem.title).toBe('Direct Test: CRUD Operation');
      expect(newWorkItem.tenantId).toBe(tenant.id);
      expect(createTime).toBeLessThan(300);

      // Test READ
      const readStart = performance.now();
      const readItem = await prisma.workItem.findUnique({
        where: { id: newWorkItem.id },
        include: {
          assignee: true,
          createdBy: true,
          tenant: true,
        },
      });

      const readTime = performance.now() - readStart;
      console.log('READ time:', readTime, 'ms');

      expect(readItem).toBeTruthy();
      expect(readItem!.id).toBe(newWorkItem.id);
      expect(readTime).toBeLessThan(300);

      // Test UPDATE
      const updateStart = performance.now();
      const updatedItem = await prisma.workItem.update({
        where: { id: newWorkItem.id },
        data: {
          status: 'IN_PROGRESS',
          title: 'Direct Test: Updated CRUD Operation',
        },
        include: {
          assignee: true,
          createdBy: true,
          tenant: true,
        },
      });

      const updateTime = performance.now() - updateStart;
      console.log('UPDATE time:', updateTime, 'ms');

      expect(updatedItem.status).toBe('IN_PROGRESS');
      expect(updatedItem.title).toBe('Direct Test: Updated CRUD Operation');
      expect(updateTime).toBeLessThan(300);

      // Test full round-trip performance
      const totalTime = performance.now() - startTime;
      console.log('Total round-trip time:', totalTime, 'ms');
      expect(totalTime).toBeLessThan(300);

      // Test LIST with tenant filtering (simulating middleware)
      const listStart = performance.now();
      const tenantItems = await prisma.workItem.findMany({
        where: {
          tenantId: tenant.id,
        },
        include: {
          assignee: true,
          createdBy: true,
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      });

      const listTime = performance.now() - listStart;
      console.log('LIST time:', listTime, 'ms');

      expect(tenantItems.length).toBeGreaterThan(0);
      expect(tenantItems.every(item => item.tenantId === tenant.id)).toBe(true);
      expect(listTime).toBeLessThan(300);

      // Test Kanban grouping
      const kanbanStart = performance.now();
      const allItems = await prisma.workItem.findMany({
        where: { tenantId: tenant.id },
      });

      const grouped = {
        TODO: allItems.filter(item => item.status === 'TODO'),
        IN_PROGRESS: allItems.filter(item => item.status === 'IN_PROGRESS'),
        QA: allItems.filter(item => item.status === 'QA'),
        DONE: allItems.filter(item => item.status === 'DONE'),
      };

      const kanbanTime = performance.now() - kanbanStart;
      console.log('KANBAN grouping time:', kanbanTime, 'ms');

      expect(grouped.TODO).toBeInstanceOf(Array);
      expect(grouped.IN_PROGRESS).toBeInstanceOf(Array);
      expect(grouped.QA).toBeInstanceOf(Array);
      expect(grouped.DONE).toBeInstanceOf(Array);
      expect(kanbanTime).toBeLessThan(300);

      console.log(
        '✅ All CRUD operations successful and meet performance requirements!'
      );
    } finally {
      await prisma.$disconnect();
    }
  });
});
