import { createHmac } from 'node:crypto';
import { prisma } from '@/lib/prisma';

/**
 * « Empreinte » des quiz de chaque leçon CS50x, pour reconnaître un paquet hors ligne périmé.
 * Elle change dès qu'une question, une réponse, la bonne réponse ou l'explication change,
 * même si la modification a été faite directement dans la base (pas de date de mise à jour fiable).
 *
 * Calculée avec la clé secrète du serveur : sans elle, on ne peut pas essayer A, B, C, D
 * et comparer l'empreinte pour deviner la bonne réponse.
 */
export async function versionsCs50x(): Promise<Record<number, string>> {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) return {};
  const quiz = await prisma.quiz
    .findMany({
      orderBy: [{ lessonId: 'asc' }, { dayOfWeek: 'asc' }],
      select: {
        id: true,
        lessonId: true,
        title: true,
        questions: {
          orderBy: { order: 'asc' },
          select: { id: true, question: true, options: true, correctOption: true, explanation: true },
        },
      },
    })
    .catch(() => [] as never[]);

  const parLecon = new Map<number, unknown[]>();
  for (const q of quiz) parLecon.set(q.lessonId, [...(parLecon.get(q.lessonId) ?? []), q]);

  const versions: Record<number, string> = {};
  for (const [id, contenu] of parLecon) {
    versions[id] = createHmac('sha256', secret).update(JSON.stringify(contenu)).digest('hex').slice(0, 16);
  }
  return versions;
}
