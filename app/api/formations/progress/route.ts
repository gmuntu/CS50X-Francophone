import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { IA_SLUG, IA_PASS_SCORE, getIaWeek } from '@/lib/courses/ia-essentiels';
import { passedWeeks, isWeekOpen } from '@/lib/courses/progress';

export const dynamic = 'force-dynamic';

// Correction du quiz côté serveur + enregistrement de la progression.
export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Non connecté' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const week = Number(body?.week);
  const answers: number[] = Array.isArray(body?.answers) ? body.answers.map(Number) : [];
  if (body?.course !== IA_SLUG) return NextResponse.json({ error: 'Formation inconnue' }, { status: 400 });

  const w = getIaWeek(week);
  if (!w?.quiz?.length) return NextResponse.json({ error: 'Quiz introuvable' }, { status: 404 });
  if (!isWeekOpen(week, await passedWeeks(userId, IA_SLUG))) {
    return NextResponse.json({ error: 'Semaine pas encore ouverte' }, { status: 403 });
  }

  const results = w.quiz.map((q, i) => answers[i] === q.answer);
  const score = results.filter(Boolean).length / w.quiz.length;
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
    results: w.quiz.map((q, i) => ({ correct: results[i], answer: q.answer, explain: q.explain })),
  });
}
