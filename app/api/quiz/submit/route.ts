export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    const body = await request.json();
    const { quizId, answers, takenAt, queued } = body ?? {};

    // Résultat fait hors ligne puis synchronisé : il doit être rattaché à un élève connecté.
    if (queued && !userId) return NextResponse.json({ error: 'Session expirée' }, { status: 401 });

    // Date réelle du quiz (bornée : pas dans le futur, pas plus de 90 jours en arrière).
    let createdAt: Date | undefined;
    const t = takenAt ? new Date(takenAt) : null;
    if (t && !isNaN(t.getTime()) && t.getTime() <= Date.now() && Date.now() - t.getTime() < 90 * 86_400_000) createdAt = t;

    if (!quizId) return NextResponse.json({ error: 'quizId requis' }, { status: 400 });

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { questions: { orderBy: { order: 'asc' } } },
    });

    if (!quiz) return NextResponse.json({ error: 'Quiz introuvable' }, { status: 404 });

    // Anti-doublon : si l'envoi a réussi mais que la réponse s'est perdue (réseau instable), on ne recrée pas.
    if (createdAt && userId) {
      const existing = await prisma.quizAttempt.findFirst({ where: { quizId, userId, createdAt } });
      if (existing) return NextResponse.json({ id: existing.id, score: existing.score, total: existing.total, passed: existing.passed });
    }

    let score = 0;
    const total = quiz?.questions?.length ?? 0;
    for (const q of (quiz?.questions ?? [])) {
      const userAns = String((answers ?? {})?.[q?.id] ?? '').trim().toUpperCase();
      const correctAns = String(q?.correctOption ?? '').trim().toUpperCase();
      if (userAns && userAns === correctAns) score++;
    }
    const passed = total > 0 ? (score / total) >= 0.7 : false;

    const attempt = await prisma.quizAttempt.create({
      data: {
        quizId,
        userId: userId ?? null,
        answers: answers ?? {},
        score,
        total,
        passed,
        ...(createdAt ? { createdAt } : {}),
      },
    });

    return NextResponse.json({ id: attempt?.id, score, total, passed });
  } catch (error: any) {
    console.error('Quiz submit error:', error);
    return NextResponse.json({ error: 'Erreur lors de la soumission du quiz' }, { status: 500 });
  }
}
