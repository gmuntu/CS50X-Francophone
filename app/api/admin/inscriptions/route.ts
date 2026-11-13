export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { exigerAdmin } from '@/lib/admin-garde';
import { STATUTS_INSCRIPTION, titreFormation } from '@/lib/formations';
import { changerInscription } from '@/lib/inscriptions';

/** Inscriptions aux formations, avec filtre par formation et par statut (administrateurs seulement). */
export async function GET(request: Request) {
  const g = await exigerAdmin();
  if (!g.ok) return NextResponse.json({ error: g.error }, { status: g.status });
  const p = new URL(request.url).searchParams;
  const formation = p.get('formation');
  const statut = p.get('statut');
  const inscriptions = await prisma.inscriptionFormation.findMany({
    where: {
      ...(formation ? { formation } : {}),
      ...(statut && (STATUTS_INSCRIPTION as readonly string[]).includes(statut) ? { statut } : {}),
      user: { role: 'STUDENT' },
    },
    orderBy: [{ statut: 'asc' }, { createdAt: 'desc' }],
    take: 500,
    select: {
      id: true, formation: true, statut: true, studentType: true, university: true,
      paymentStatus: true, paymentMethod: true, paymentAmount: true, valideeLe: true, createdAt: true,
      user: { select: { id: true, name: true, email: true, dossierNumber: true, status: true, accessExpiresAt: true } },
    },
  });
  // Totaux par formation et par statut, pour les onglets du filtre.
  const groupes = await prisma.inscriptionFormation.groupBy({ by: ['formation', 'statut'], where: { user: { role: 'STUDENT' } }, _count: { _all: true } });
  return NextResponse.json({
    inscriptions: inscriptions.map((i) => ({ ...i, titre: titreFormation(i.formation) })),
    totaux: groupes.map((x) => ({ formation: x.formation, statut: x.statut, n: x._count._all })),
  });
}

/** Valider, mettre en attente, suspendre ou refuser une inscription ; noter son paiement. */
export async function PUT(request: Request) {
  const g = await exigerAdmin();
  if (!g.ok) return NextResponse.json({ error: g.error }, { status: g.status });
  const { id, statut, paymentStatus, paymentMethod, paymentAmount } = (await request.json().catch(() => ({}))) ?? {};
  const r = await changerInscription(id, { statut, paymentStatus, paymentMethod, paymentAmount });
  if (!r.ok) return NextResponse.json({ error: r.erreur }, { status: r.code });
  return NextResponse.json({ success: true, compteActive: r.compteActive });
}
