import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { passedWeeks, isWeekOpen } from '@/lib/courses/progress';
import { FINAL_WEEK, projectText, CS50_SLUG } from '@/lib/courses/final-project';
import { similarity } from '@/lib/courses/similarity';

export const dynamic = 'force-dynamic';

const FIELDS = ['prompt', 'aiResponse', 'verification', 'finalVersion'] as const;

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Non connecté' }, { status: 401 });
  const course = new URL(req.url).searchParams.get('course') || '';
  const project = await prisma.finalProject.findUnique({ where: { userId_courseSlug: { userId: session.user.id, courseSlug: course } } });
  return NextResponse.json({ project: project && { ...project, similarToUserId: undefined } });
}

// Dépôt (ou nouvelle version) du projet final + comparaison avec les autres projets.
export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Non connecté' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const course = String(body?.course || '');
  const week = FINAL_WEEK[course];
  if (!week) return NextResponse.json({ error: 'Formation inconnue' }, { status: 400 });

  const staff = ['ADMIN', 'INSTRUCTOR'].includes((session?.user as any)?.role);
  // CS50x : la semaine 10 est ouverte à tous les inscrits ; formations SavoirIA : semaines débloquées par les quiz.
  if (!staff && course !== CS50_SLUG && !isWeekOpen(week, await passedWeeks(userId, course))) {
    return NextResponse.json({ error: 'Le projet final s’ouvre en dernière semaine.' }, { status: 403 });
  }

  const data: Record<string, string> = {};
  for (const f of FIELDS) {
    const v = String(body?.[f] ?? '').trim();
    if (v.length < 20) return NextResponse.json({ error: 'Chaque partie du projet doit contenir au moins quelques phrases.' }, { status: 400 });
    data[f] = v.slice(0, 20_000);
  }

  const existing = await prisma.finalProject.findUnique({ where: { userId_courseSlug: { userId, courseSlug: course } } });
  if (existing?.status === 'VALIDATED') return NextResponse.json({ error: 'Projet déjà validé.' }, { status: 409 });

  // Comparaison avec les autres projets de la même formation.
  const mine = projectText(data as any, course);
  // Seulement les champs utiles à la comparaison (pas les photos, voix, transcriptions…)
  const others = await prisma.finalProject.findMany({
    where: { courseSlug: course, NOT: { userId } },
    select: { userId: true, prompt: true, aiResponse: true, verification: true, finalVersion: true },
    orderBy: { updatedAt: 'desc' },
    take: 2000,
  });
  let best = 0, bestUser: string | null = null;
  for (const o of others) {
    const s = similarity(mine, projectText(o, course));
    if (s > best) { best = s; bestUser = o.userId; }
  }

  const project = await prisma.finalProject.upsert({
    where: { userId_courseSlug: { userId, courseSlug: course } },
    update: { ...data, similarity: best, similarToUserId: bestUser, status: 'SUBMITTED', defenseScore: null, defenseFeedback: null },
    create: { userId, courseSlug: course, ...(data as any), similarity: best, similarToUserId: bestUser },
  });
  return NextResponse.json({ ok: true, status: project.status });
}
