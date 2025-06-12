import { createTenantAwarePrismaClient } from './index';

export interface DatabaseContext {
  db: ReturnType<typeof createTenantAwarePrismaClient>;
  tenantId: string;
}

export function createDatabaseContext(tenantId: string): DatabaseContext {
  return {
    db: createTenantAwarePrismaClient(tenantId),
    tenantId,
  };
}

export function createAdminDatabaseContext(): DatabaseContext {
  return {
    db: createTenantAwarePrismaClient(), // No tenantId = no filtering
    tenantId: 'admin',
  };
}
