import { NextResponse } from 'next/server';
import { roleActuel } from '@/lib/securite';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Un administrateur autorise un étudiant à refaire son empreinte (micro ou caméra défectueux).
export async function PATCH(req: Request) {
  if ((await roleActuel()) !== 'ADMIN') return NextResponse.json({ error: 'Réservé aux administrateurs' }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  if (!body?.userId) return NextResponse.json({ error: 'Requête invalide' }, { status: 400 });
  await prisma.identityProfile.update({ where: { userId: String(body.userId) }, data: { resetAllowed: true } });
  return NextResponse.json({ ok: true });
}
