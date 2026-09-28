export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json([], { status: 200 });
  try {
    const attempts = await prisma.quizAttempt.findMany({
      where: { userId: session.user.id },
      include: { quiz: { select: { title: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    return NextResponse.json(attempts);
  } catch (e: any) {
    console.error(e);
    return NextResponse.json([], { status: 200 });
  }
}
