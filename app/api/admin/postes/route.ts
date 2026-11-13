export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { empreinteCle, genererClePoste } from '@/lib/poste-ecole';
import { FORMATIONS_PAR_POSTE_MAX, formationsDuPoste } from '@/lib/formations-poste';

async function estAdmin() {
  const session = await auth();
  if (!session?.user?.id) return false;
  const u = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
  return u?.role === 'ADMIN';
}

const champs = { id: true, nom: true, active: true, derniereSynchro: true, createdAt: true, institutionId: true, formations: true } as const;

/** Liste des ordinateurs d'école (jamais la clé). */
export async function GET() {
  if (!(await estAdmin())) return NextResponse.json({ error: 'Accès réservé aux administrateurs' }, { status: 403 });
  const postes = await prisma.posteEcole.findMany({ orderBy: { createdAt: 'desc' }, select: champs });
  return NextResponse.json({ postes });
}

/** Nouvel ordinateur d'école : la clé est renvoyée UNE seule fois, seule son empreinte est gardée. */
export async function POST(req: Request) {
  if (!(await estAdmin())) return NextResponse.json({ error: 'Accès réservé aux administrateurs' }, { status: 403 });
  const body = await req.json().catch(() => null);
  const institutionId = String(body?.institutionId ?? '');
  const nom = String(body?.nom ?? '').trim().slice(0, 80);
  if (!institutionId || !nom) return NextResponse.json({ error: 'Établissement et nom du poste requis' }, { status: 400 });
  const inst = await prisma.institution.findUnique({ where: { id: institutionId }, select: { id: true } });
  if (!inst) return NextResponse.json({ error: 'Établissement introuvable' }, { status: 404 });
  const cle = genererClePoste();
  const poste = await prisma.posteEcole.create({ data: { institutionId, nom, cleHash: empreinteCle(cle) }, select: champs });
  return NextResponse.json({ poste, cle });
}

/** Activer / désactiver un poste (perdu, volé, remplacé), ou choisir ses formations (3 au plus). */
export async function PATCH(req: Request) {
  if (!(await estAdmin())) return NextResponse.json({ error: 'Accès réservé aux administrateurs' }, { status: 403 });
  const body = await req.json().catch(() => null);
  const id = String(body?.id ?? '');
  const data: { active?: boolean; formations?: string[] } = {};
  if (typeof body?.active === 'boolean') data.active = body.active;
  if (body?.formations !== undefined) {
    const formations = formationsDuPoste(body.formations);
    if (!formations) return NextResponse.json({ error: `Choisissez de 1 à ${FORMATIONS_PAR_POSTE_MAX} formations ouvertes.` }, { status: 400 });
    data.formations = formations;
  }
  if (!id || !Object.keys(data).length) return NextResponse.json({ error: 'id et active ou formations requis' }, { status: 400 });
  const poste = await prisma.posteEcole.update({ where: { id }, data, select: champs }).catch(() => null);
  if (!poste) return NextResponse.json({ error: 'Poste introuvable' }, { status: 404 });
  return NextResponse.json({ poste });
}
