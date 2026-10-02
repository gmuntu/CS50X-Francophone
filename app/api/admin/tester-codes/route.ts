export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { generateTesterCode } from '@/lib/tester-codes';

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return false;
  const u = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
  return u?.role === 'ADMIN';
}

// Fin de journée (23 h 59 UTC) de la date choisie : un code « jusqu'au 25 octobre » reste valable tout le 25.
const endOfDay = (d: string) => new Date(`${d}T23:59:59.000Z`);

async function list() {
  const codes = await prisma.testerCode.findMany({
    orderBy: { createdAt: 'desc' },
    include: { users: { select: { id: true, name: true, email: true, createdAt: true }, orderBy: { createdAt: 'desc' } } },
  });
  return codes;
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Accès réservé aux administrateurs' }, { status: 403 });
  return NextResponse.json({ codes: await list() });
}

/** Créer un code : { label, expiresOn: 'AAAA-MM-JJ', maxUses?: number } */
export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Accès réservé aux administrateurs' }, { status: 403 });
  const { label, expiresOn, maxUses } = (await req.json()) ?? {};
  if (!label || !/^\d{4}-\d{2}-\d{2}$/.test(String(expiresOn))) {
    return NextResponse.json({ error: 'Nom du groupe et date de fin obligatoires.' }, { status: 400 });
  }
  const expiresAt = endOfDay(expiresOn);
  if (expiresAt <= new Date()) return NextResponse.json({ error: 'La date de fin doit être dans le futur.' }, { status: 400 });
  const max = maxUses ? Math.max(1, Math.floor(Number(maxUses))) : null;

  for (let i = 0; i < 5; i++) {
    try {
      await prisma.testerCode.create({ data: { code: generateTesterCode(), label: String(label).slice(0, 80), expiresAt, maxUses: max } });
      return NextResponse.json({ codes: await list() });
    } catch (e: any) {
      if (e?.code !== 'P2002') throw e; // code déjà pris (très rare) : on en tire un autre
    }
  }
  return NextResponse.json({ error: 'Impossible de générer un code, réessayez.' }, { status: 500 });
}

/**
 * Modifier un code : { id, expiresOn?, maxUses?, active?, endNow? }
 * Changer la date de fin (ou « endNow ») s'applique aussi à tous les comptes créés avec ce code.
 */
export async function PATCH(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Accès réservé aux administrateurs' }, { status: 403 });
  const { id, expiresOn, maxUses, active, endNow } = (await req.json()) ?? {};
  if (!id) return NextResponse.json({ error: 'Code manquant.' }, { status: 400 });

  const data: { expiresAt?: Date; maxUses?: number | null; active?: boolean } = {};
  if (endNow) data.expiresAt = new Date();
  else if (expiresOn) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(expiresOn))) return NextResponse.json({ error: 'Date invalide.' }, { status: 400 });
    data.expiresAt = endOfDay(expiresOn);
  }
  if (maxUses !== undefined) data.maxUses = maxUses ? Math.max(1, Math.floor(Number(maxUses))) : null;
  if (active !== undefined) data.active = !!active;

  await prisma.$transaction([
    prisma.testerCode.update({ where: { id }, data }),
    ...(data.expiresAt ? [prisma.user.updateMany({ where: { testerCodeId: id }, data: { accessExpiresAt: data.expiresAt } })] : []),
  ]);
  return NextResponse.json({ codes: await list() });
}
