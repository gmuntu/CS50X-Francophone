import { prisma } from '@/lib/prisma';

export async function getIdentity(userId: string) {
  return prisma.identityProfile.findUnique({ where: { userId } });
}
export const faceList = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []);
