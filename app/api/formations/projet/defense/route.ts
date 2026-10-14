import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { geminiJson } from '@/lib/gemini-json';
import { projectText } from '@/lib/courses/final-project';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Fin de la défense orale : on enregistre la TRANSCRIPTION (texte seulement) et Socrate propose une note.
export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Non connecté' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const course = String(body?.course || '');
  const transcript = (Array.isArray(body?.transcript) ? body.transcript : [])
    .filter((l: any) => (l?.who === 'eleve' || l?.who === 'socrate') && typeof l?.text === 'string')
    .map((l: any) => ({ who: l.who, text: String(l.text).slice(0, 4000) }))
    .slice(0, 200);
  const studentWords = transcript.filter((l: any) => l.who === 'eleve').map((l: any) => l.text).join(' ').trim();
  if (studentWords.split(/\s+/).length < 30) {
    return NextResponse.json({ error: 'La défense est trop courte : répondez aux questions de Socrate avant de terminer.' }, { status: 400 });
  }

  const project = await prisma.finalProject.findUnique({ where: { userId_courseSlug: { userId, courseSlug: course } } });
  if (!project) return NextResponse.json({ error: 'Déposez d’abord votre projet.' }, { status: 404 });

  let evalResult = { score: 0, feedback: '' };
  try {
    evalResult = await geminiJson<{ score: number; feedback: string }>(
      `Tu évalues la défense orale d'un projet final (formation SavoirIA). Réponds en JSON {"score": entier 0-5, "feedback": "3 à 5 phrases en français pour le formateur"}.
Barème : l'élève montre-t-il qu'il a réellement fait CE projet (détails concrets, cohérence avec le projet écrit, explication de ses choix et vérifications) ? 5 = maîtrise évidente ; 3 = correct mais vague ; 0-1 = semble ne pas connaître son projet. Signale toute incohérence entre l'oral et l'écrit.`,
      `${projectText(project)}\n\n--- TRANSCRIPTION DE LA DÉFENSE ---\n${transcript.map((l: any) => `${l.who === 'eleve' ? 'ÉLÈVE' : 'SOCRATE'} : ${l.text}`).join('\n')}`,
    );
  } catch (e) {
    console.error('Évaluation défense', e);
  }
  const score = Math.max(0, Math.min(5, Math.round(Number(evalResult.score) || 0)));

  await prisma.finalProject.update({
    where: { id: project.id },
    data: { defenseTranscript: transcript, defenseScore: score, defenseFeedback: String(evalResult.feedback || '').slice(0, 4000), defenseCount: { increment: 1 }, status: 'DEFENDED' },
  });
  return NextResponse.json({ ok: true });
}
