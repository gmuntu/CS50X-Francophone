export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 });
    }

    const { id } = await params;
    const lessonId = parseInt(id, 10);
    if (Number.isNaN(lessonId)) {
      return NextResponse.json({ success: false, error: 'Identifiant invalide' }, { status: 400 });
    }

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        videoSummary: true,
        audioScripts: { orderBy: { dayOfWeek: 'asc' } },
        quizzes: { include: { questions: { orderBy: { order: 'asc' } } }, orderBy: { dayOfWeek: 'asc' } },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        videoSummary: lesson?.videoSummary ?? null,
        audioScripts: lesson?.audioScripts ?? [],
        quizzes: lesson?.quizzes ?? [],
      },
    });
  } catch (error: any) {
    console.error('content/modules GET error:', error);
    return NextResponse.json({ success: false, error: 'Erreur interne' }, { status: 500 });
  }
}
