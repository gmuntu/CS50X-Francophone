export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const { name } = await request.json();
    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: { name: name ?? undefined },
    });

    return NextResponse.json({ id: updated?.id, name: updated?.name, email: updated?.email });
  } catch (error: any) {
    console.error('Profile update error:', error);
    return NextResponse.json({ error: 'Erreur' }, { status: 500 });
  }
}
