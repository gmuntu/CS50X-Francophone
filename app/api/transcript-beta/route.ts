import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * BÊTA — Contexte pédagogique pour le tuteur vocal.
 * Plutôt que d'aspirer les sous-titres YouTube (souvent bloqués depuis les
 * serveurs Vercel), on réutilise le résumé français horodaté déjà généré
 * par Gemini et stocké dans la base (VideoSummary).
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Non connecté' }, { status: 401 });

  const moduleId = Number(new URL(req.url).searchParams.get('module') ?? '0');
  if (!Number.isInteger(moduleId) || moduleId < 0 || moduleId > 20) {
    return NextResponse.json({ error: 'Module invalide' }, { status: 400 });
  }

  try {
    const s = await prisma.videoSummary.findUnique({ where: { lessonId: moduleId } });
    if (!s) return NextResponse.json({ context: '', available: false });

    const timeline = Array.isArray(s.timelineBreakdown)
      ? (s.timelineBreakdown as any[])
          .map((t) => `[${t?.timestamp ?? t?.time ?? ''}] ${t?.title ?? ''} — ${t?.description ?? t?.summary ?? ''}`)
          .join('\n')
      : '';
    const context = [
      `Titre : ${s.title}`,
      `Aperçu : ${s.overview}`,
      timeline && `Chronologie de la vidéo :\n${timeline}`,
      `Résumé complet :\n${s.fullMarkdown}`,
    ]
      .filter(Boolean)
      .join('\n\n')
      .slice(0, 30_000);

    return NextResponse.json({ context, available: true });
  } catch (e) {
    console.error('transcript-beta error', e);
    return NextResponse.json({ context: '', available: false });
  }
}
