export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const dbUser = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (dbUser?.role !== 'ADMIN' && dbUser?.role !== 'INSTRUCTOR') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const { submissionId, status, feedback, score } = await request.json();
    if (!submissionId || !status) return NextResponse.json({ error: 'submissionId et status requis' }, { status: 400 });

    const updated = await prisma.submission.update({
      where: { id: submissionId },
      data: {
        status,
        feedback: feedback ?? null,
        score: score ?? null,
        reviewedBy: session.user.id,
      },
    });

    return NextResponse.json({ id: updated?.id, status: updated?.status });
  } catch (error: any) {
    console.error('Admin submissions error:', error);
    return NextResponse.json({ error: 'Erreur' }, { status: 500 });
  }
}
