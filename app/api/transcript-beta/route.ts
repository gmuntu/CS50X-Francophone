import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * BÊTA — Contexte pédagogique pour le tuteur vocal (modèle Live Extended).
 * 1. Transcript COMPLET traduit en français et horodaté, s'il a été préparé
 *    (fichier transcripts/semaineN.fr.txt dans le stockage public des podcasts).
 * 2. + le résumé français déjà en base (VideoSummary), toujours ajouté.
 */
async function loadTranscript(moduleId: number): Promise<string> {
  try {
    // Le stockage public est celui des podcasts : on déduit son adresse d'un MP3 existant.
    const any = await prisma.audioScript.findFirst({
      where: { audioUrl: { not: null } },
      select: { audioUrl: true },
    });
    if (!any?.audioUrl) return '';
    const base = new URL(any.audioUrl).origin;
    const res = await fetch(`${base}/transcripts/semaine${moduleId}.fr.txt`, { cache: 'no-store' });
    return res.ok ? (await res.text()).slice(0, 600_000) : '';
  } catch {
    return '';
  }
}
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Non connecté' }, { status: 401 });

  const moduleId = Number(new URL(req.url).searchParams.get('module') ?? '0');
  if (!Number.isInteger(moduleId) || moduleId < 0 || moduleId > 20) {
    return NextResponse.json({ error: 'Module invalide' }, { status: 400 });
  }

  const transcript = await loadTranscript(moduleId);
  try {
    const s = await prisma.videoSummary.findUnique({ where: { lessonId: moduleId } });
    if (!s) {
      return NextResponse.json({
        context: transcript ? `TRANSCRIPT COMPLET DE LA VIDÉO (français, horodaté) :\n${transcript}` : '',
        available: !!transcript,
        transcript: !!transcript,
      });
    }

    const timeline = Array.isArray(s.timelineBreakdown)
      ? (s.timelineBreakdown as any[])
          .map((t) => `[${t?.timestamp ?? t?.time ?? ''}] ${t?.title ?? ''} — ${t?.description ?? t?.summary ?? ''}`)
          .join('\n')
      : '';
    const summary = [
      `Titre : ${s.title}`,
      `Aperçu : ${s.overview}`,
      timeline && `Chronologie de la vidéo :\n${timeline}`,
      !transcript && `Résumé complet :\n${s.fullMarkdown}`,
    ]
      .filter(Boolean)
      .join('\n\n')
      .slice(0, 30_000);
    const context = transcript
      ? `${summary}\n\nTRANSCRIPT COMPLET DE LA VIDÉO (français, horodaté) :\n${transcript}`
      : summary;

    return NextResponse.json({ context, available: true, transcript: !!transcript });
  } catch (e) {
    console.error('transcript-beta error', e);
    return NextResponse.json({ context: '', available: false });
  }
}
