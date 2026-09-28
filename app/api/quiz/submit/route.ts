export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    const body = await request.json();
    const { quizId, answers } = body ?? {};

    if (!quizId) return NextResponse.json({ error: 'quizId requis' }, { status: 400 });

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { questions: { orderBy: { order: 'asc' } } },
    });

    if (!quiz) return NextResponse.json({ error: 'Quiz introuvable' }, { status: 404 });

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
      },
    });

    return NextResponse.json({ id: attempt?.id, score, total, passed });
  } catch (error: any) {
    console.error('Quiz submit error:', error);
    return NextResponse.json({ error: 'Erreur lors de la soumission du quiz' }, { status: 500 });
  }
}
