// Singleton Prisma client. Avoids "PrismaClient is already running" warnings
// during Next.js dev hot-reloads.

import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const db: PrismaClient =
  globalThis.__prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

// One client per server instance, in production too: every extra client opens its own database connections.
globalThis.__prisma = db;
