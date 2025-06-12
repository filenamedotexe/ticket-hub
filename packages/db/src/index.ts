export * from '@prisma/client';
export * from './context';
export * from './permissions';
export * from './workitem-actions';

import { PrismaClient } from '@prisma/client';

// Singleton Prisma client instance
declare global {
  // eslint-disable-next-line no-var, no-unused-vars
  var __prisma: PrismaClient | undefined;
}

// Extended Prisma client with tenant isolation
export const prisma = globalThis.__prisma || new PrismaClient();

// Tenant context for bypassing isolation (admin operations)
export const createTenantAwarePrismaClient = (tenantId?: string) => {
  // Create a fresh client for each tenant to avoid middleware conflicts
  const client = new PrismaClient();

  // Add middleware for tenant isolation
  client.$use(async (params, next) => {
    // Skip tenant filtering if $omitTenant is explicitly set to true
    if (params.args && params.args.$omitTenant === true) {
      // Remove the $omitTenant flag to avoid Prisma errors
      delete params.args.$omitTenant;
      return next(params);
    }

    // Apply tenant filtering only if tenantId is provided
    if (tenantId && hasModelWithTenantId(params.model)) {
      // Inject tenantId for queries
      if (
        params.action === 'findFirst' ||
        params.action === 'findUnique' ||
        params.action === 'findMany' ||
        params.action === 'findFirstOrThrow' ||
        params.action === 'findUniqueOrThrow'
      ) {
        if (!params.args) params.args = {};
        if (!params.args.where) params.args.where = {};

        // Add tenantId to where clause
        params.args.where.tenantId = tenantId;
      }

      // Inject tenantId for mutations
      if (params.action === 'create') {
        if (!params.args) params.args = {};
        if (!params.args.data) params.args.data = {};

        // Add tenantId to create data
        params.args.data.tenantId = tenantId;
      }

      if (
        params.action === 'update' ||
        params.action === 'updateMany' ||
        params.action === 'upsert'
      ) {
        if (!params.args) params.args = {};
        if (!params.args.where) params.args.where = {};

        // Add tenantId to where clause for updates
        params.args.where.tenantId = tenantId;
      }

      if (params.action === 'delete' || params.action === 'deleteMany') {
        if (!params.args) params.args = {};
        if (!params.args.where) params.args.where = {};

        // Add tenantId to where clause for deletes
        params.args.where.tenantId = tenantId;
      }
    }

    return next(params);
  });

  return client;
};

// Helper function to check if a model has tenantId field
function hasModelWithTenantId(modelName: string | undefined): boolean {
  // List of models that have tenantId field
  const tenantModels = ['User']; // Add more models as they're created
  return modelName ? tenantModels.includes(modelName) : false;
}

// Extended client type with bypass functionality
export type PrismaClientWithBypass = PrismaClient & {
  $omitTenant: () => PrismaClient;
};

// Create the main client with bypass functionality
const createClientWithBypass = (): PrismaClientWithBypass => {
  const client = prisma as PrismaClientWithBypass;

  // Add bypass method for admin operations
  client.$omitTenant = () => {
    const bypassClient = new PrismaClient();
    // No middleware added to bypass client - operates without tenant isolation
    return bypassClient;
  };

  return client;
};

export const db = createClientWithBypass();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma;
}
