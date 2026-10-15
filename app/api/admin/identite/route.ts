import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Un administrateur autorise un étudiant à refaire son empreinte (micro ou caméra défectueux).
export async function PATCH(req: Request) {
  const session = await auth();
  if ((session?.user as any)?.role !== 'ADMIN') return NextResponse.json({ error: 'Réservé aux administrateurs' }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  if (!body?.userId) return NextResponse.json({ error: 'Requête invalide' }, { status: 400 });
  await prisma.identityProfile.update({ where: { userId: String(body.userId) }, data: { resetAllowed: true } });
  return NextResponse.json({ ok: true });
}
