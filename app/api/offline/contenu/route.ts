import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * Contenu pédagogique pour les ordinateurs SavoirIA hors ligne (savoiria-maj).
 * Leçons, résumés, audios socratiques, quiz et exercices — aucune donnée d'élève.
 * Protégé par la clé CONTENU_SYNC_CLE (les quiz contiennent les bonnes réponses).
 */
export async function GET(req: Request) {
  const attendue = process.env.CONTENU_SYNC_CLE?.trim();
  if (!attendue) return NextResponse.json({ error: 'Synchronisation non configurée (CONTENU_SYNC_CLE)' }, { status: 503 });
  if (req.headers.get('x-savoiria-cle') !== attendue) return NextResponse.json({ error: 'Clé invalide' }, { status: 401 });

  const lecons = await prisma.lesson.findMany({
    orderBy: { id: 'asc' },
    include: {
      course: true,
      videoSummary: true,
      audioScripts: true,
      exercises: true,
      quizzes: { include: { questions: { orderBy: { order: 'asc' } } } },
    },
  });
  return NextResponse.json({ genereLe: new Date().toISOString(), lecons });
}
