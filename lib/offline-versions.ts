import { createHmac } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { CS50_MODULES } from '@/config/course-modules';

// Gardées 5 minutes en mémoire : le tableau de bord demande les empreintes à chaque visite.
const DUREE_MS = 5 * 60 * 1000;
let memoire: { le: number; versions: Record<number, string> } | null = null;

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
  if (memoire && Date.now() - memoire.le < DUREE_MS) return memoire.versions;
  const quiz = await prisma.quiz
    .findMany({
      where: { lessonId: { in: CS50_MODULES.map((m) => m.id) } },
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
    .catch(() => null);
  if (!quiz) return {};

  const parLecon = new Map<number, unknown[]>();
  for (const q of quiz) parLecon.set(q.lessonId, [...(parLecon.get(q.lessonId) ?? []), q]);

  const versions: Record<number, string> = {};
  for (const [id, contenu] of parLecon) {
    versions[id] = createHmac('sha256', secret).update(JSON.stringify(contenu)).digest('hex').slice(0, 16);
  }
  memoire = { le: Date.now(), versions };
  return versions;
}
