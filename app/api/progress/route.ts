export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json([], { status: 200 });
  try {
    const progress = await prisma.progress.findMany({
      where: { userId: session.user.id },
      include: { lesson: { select: { id: true, title: true, slug: true } } },
      orderBy: { lessonId: 'asc' },
    });
    return NextResponse.json(progress);
  } catch (e: any) {
    console.error(e);
    return NextResponse.json([], { status: 200 });
  }
}
