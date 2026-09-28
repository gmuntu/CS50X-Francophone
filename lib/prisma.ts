import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: any };

function createPrismaClient() {
  const basePrisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

  return basePrisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          let attempts = 0;
          while (attempts < 3) {
            try {
              return await query(args);
            } catch (err: any) {
              attempts++;
              const isConnectionError =
                err?.code === 'P1001' ||
                err?.code === 'P1002' ||
                err?.message?.includes("Can't reach database server") ||
                err?.message?.includes('Engine closed') ||
                err?.message?.includes('connection closed') ||
                err?.message?.includes('Connection timeout');

              if (attempts < 3 && isConnectionError) {
                // Pause pour laisser le temps au serveur Neon de se réveiller (cold start)
                await new Promise((res) => setTimeout(res, 1000 * attempts));
                continue;
              }
              throw err;
            }
          }
        },
      },
    },
  });
}

export const prisma = (globalForPrisma.prisma || createPrismaClient()) as unknown as PrismaClient;

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

