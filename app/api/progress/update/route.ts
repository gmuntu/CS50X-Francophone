export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const { lessonId, status, score } = await request.json();
    if (lessonId === undefined || lessonId === null) {
      return NextResponse.json({ error: 'lessonId requis' }, { status: 400 });
    }

    const progress = await prisma.progress.upsert({
      where: {
        userId_lessonId: { userId: session.user.id, lessonId: Number(lessonId) },
      },
      update: {
        status: status ?? 'IN_PROGRESS',
        score: score ?? undefined,
        completedAt: status === 'COMPLETED' ? new Date() : undefined,
      },
      create: {
        userId: session.user.id,
        lessonId: Number(lessonId),
        status: status ?? 'IN_PROGRESS',
        score: score ?? null,
        completedAt: status === 'COMPLETED' ? new Date() : null,
      },
    });

    return NextResponse.json(progress);
  } catch (error: any) {
    console.error('Progress update error:', error);
    return NextResponse.json({ error: 'Erreur de mise à jour' }, { status: 500 });
  }
}
