import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Validation du projet final par un formateur (ou demande d'une 2e défense).
export async function PATCH(req: Request) {
  const session = await auth();
  if (!['ADMIN', 'INSTRUCTOR'].includes((session?.user as any)?.role)) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  if (body?.voiceMatch !== undefined && body?.id) {
    const voiceMatch = body.voiceMatch === 'MATCH' ? 'MATCH' : body.voiceMatch === 'MISMATCH' ? 'MISMATCH' : null;
    await prisma.finalProject.update({ where: { id: String(body.id) }, data: { voiceMatch } });
    return NextResponse.json({ ok: true });
  }
  const status = body?.status === 'VALIDATED' ? 'VALIDATED' : body?.status === 'REDO' ? 'REDO' : null;
  if (!status || !body?.id) return NextResponse.json({ error: 'Requête invalide' }, { status: 400 });
  await prisma.finalProject.update({ where: { id: String(body.id) }, data: { status, reviewedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
