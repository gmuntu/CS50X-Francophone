import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { IA_SLUG, IA_PASS_SCORE, getIaWeek } from '@/lib/courses/ia-essentiels';
import { passedWeeks, isWeekOpen } from '@/lib/courses/progress';
import { quizFor } from '@/lib/courses/shuffle';

export const dynamic = 'force-dynamic';

// Correction du quiz côté serveur + enregistrement de la progression.
export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Non connecté' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const week = Number(body?.week);
  // Réponses : { indice d'origine de la question : indice d'origine de la réponse }
  const answers: Record<string, number> = body?.answers && typeof body.answers === 'object' ? body.answers : {};
  if (body?.course !== IA_SLUG) return NextResponse.json({ error: 'Formation inconnue' }, { status: 400 });

  const w = getIaWeek(week);
  if (!w?.quiz?.length) return NextResponse.json({ error: 'Quiz introuvable' }, { status: 404 });
  const staff = ['ADMIN', 'INSTRUCTOR'].includes((session?.user as any)?.role);
  if (!staff && !isWeekOpen(week, await passedWeeks(userId, IA_SLUG))) {
    return NextResponse.json({ error: 'Semaine pas encore ouverte' }, { status: 403 });
  }

  // Questions réellement posées à CET élève (même tirage que sur la page).
  const asked = quizFor(w.quiz, `${userId}:${IA_SLUG}:${week}`).map((x) => x.qi);
  const correct = asked.filter((qi) => Number(answers[qi]) === w.quiz![qi].answer);
  const score = correct.length / asked.length;
  const passed = score >= IA_PASS_SCORE;

  const prev = await prisma.courseProgress.findUnique({
    where: { userId_courseSlug_week: { userId, courseSlug: IA_SLUG, week } },
  });
  await prisma.courseProgress.upsert({
    where: { userId_courseSlug_week: { userId, courseSlug: IA_SLUG, week } },
    update: {
      bestScore: Math.max(prev?.bestScore ?? 0, score),
      passedAt: prev?.passedAt ?? (passed ? new Date() : null),
    },
    create: { userId, courseSlug: IA_SLUG, week, bestScore: score, passedAt: passed ? new Date() : null },
  });

  return NextResponse.json({
    score,
    passed,
    results: Object.fromEntries(asked.map((qi) => [qi, { correct: Number(answers[qi]) === w.quiz![qi].answer, answer: w.quiz![qi].answer, explain: w.quiz![qi].explain }])),
  });
}
