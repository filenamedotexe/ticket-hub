import { expect, test, describe } from 'bun:test';

const hasDatabase = !!process.env.DATABASE_URL;

describe('Debug Database Contents', () => {
  if (!hasDatabase) {
    test.skip('Database tests skipped - no DATABASE_URL provided', () => {});
    return;
  }

  const { PrismaClient } = require('@ticket-hub/db');

  test('should show database contents', async () => {
    const adminPrisma = new PrismaClient();

    try {
      console.log('=== DATABASE INSPECTION ===');

      const tenants = await adminPrisma.tenant.findMany();
      console.log('Tenants:', tenants);

      const users = await adminPrisma.user.findMany();
      console.log('Users:', users);

      const workItems = await adminPrisma.workItem.findMany();
      console.log('WorkItems:', workItems);

      expect(tenants.length).toBeGreaterThan(0);
      expect(users.length).toBeGreaterThan(0);
      expect(workItems.length).toBeGreaterThan(0);
    } finally {
      await adminPrisma.$disconnect();
    }
  });
});
