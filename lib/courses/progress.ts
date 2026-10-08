import { prisma } from '@/lib/prisma';

/** Semaines réussies (quiz ≥ seuil) pour un élève et une formation. */
export async function passedWeeks(userId: string, courseSlug: string): Promise<Set<number>> {
  try {
    const rows = await prisma.courseProgress.findMany({
      where: { userId, courseSlug, passedAt: { not: null } },
      select: { week: true },
    });
    return new Set(rows.map((r) => r.week));
  } catch {
    return new Set();
  }
}

/** La semaine n est ouverte si c'est la 1re ou si la précédente est réussie. */
export const isWeekOpen = (n: number, passed: Set<number>) => n === 1 || passed.has(n - 1);
