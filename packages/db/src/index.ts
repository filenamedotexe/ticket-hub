export * from '@prisma/client';
export { PrismaClient } from '@prisma/client';
import { PrismaClient } from '@prisma/client';

// Singleton Prisma client instance
declare global {
  // eslint-disable-next-line no-var, no-unused-vars
  var __prisma: PrismaClient | undefined;
}

export const prisma = globalThis.__prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma;
}
