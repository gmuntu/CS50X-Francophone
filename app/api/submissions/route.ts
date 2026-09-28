export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const { exerciseId, content } = await request.json();
    if (!exerciseId || !content?.trim?.()) {
      return NextResponse.json({ error: 'exerciseId et content requis' }, { status: 400 });
    }

    const submission = await prisma.submission.create({
      data: {
        exerciseId,
        userId: session.user.id,
        content: content.trim(),
        status: 'PENDING',
      },
    });

    return NextResponse.json({ id: submission?.id });
  } catch (error: any) {
    console.error('Submission error:', error);
    return NextResponse.json({ error: 'Erreur' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const submissions = await prisma.submission.findMany({
      where: { userId: session.user.id },
      include: { exercise: { select: { title: true, lessonId: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return NextResponse.json(submissions);
  } catch (error: any) {
    console.error('Get submissions error:', error);
    return NextResponse.json({ error: 'Erreur' }, { status: 500 });
  }
}
