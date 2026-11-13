export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { tropAujourdhui } from '@/lib/quota';
import { FORMATIONS_OUVERTES, titreFormation } from '@/lib/formations';
import { ajouterFormation } from '@/lib/inscriptions';

/** L'élève connecté, relu en base (le rôle et le statut ne viennent jamais du navigateur). */
async function eleveConnecte() {
  const session = await auth();
  const id = (session?.user as any)?.id as string | undefined;
  if (!id) return null;
  return prisma.user.findUnique({ where: { id }, select: { id: true, role: true, status: true } });
}

/** Les formations de l'élève connecté, et celles qu'il peut encore demander. */
export async function GET() {
  const eleve = await eleveConnecte();
  if (!eleve) return NextResponse.json({ error: 'Non connecté' }, { status: 401 });
  const inscriptions = await prisma.inscriptionFormation.findMany({
    where: { userId: eleve.id },
    orderBy: { createdAt: 'asc' },
    select: { formation: true, statut: true, paymentStatus: true, paymentAmount: true, studentType: true },
  });
  const prises = new Set(inscriptions.map((i) => i.formation));
  return NextResponse.json({
    inscriptions: inscriptions.map((i) => ({ ...i, titre: titreFormation(i.formation), href: FORMATIONS_OUVERTES.find((f) => f.id === i.formation)?.href ?? null })),
    disponibles: eleve.role === 'STUDENT' ? FORMATIONS_OUVERTES.filter((f) => !prises.has(f.id)).map((f) => ({ id: f.id, titre: f.titre, certificat: f.certificat, prixUsd: f.prixUsd })) : [],
  });
}

/** L'élève demande une formation de plus : elle reste « en attente » jusqu'à la validation de l'administration. */
export async function POST(request: Request) {
  const eleve = await eleveConnecte();
  if (!eleve) return NextResponse.json({ error: 'Non connecté' }, { status: 401 });
  if (eleve.role !== 'STUDENT') return NextResponse.json({ error: 'Réservé aux élèves.' }, { status: 403 });
  if (eleve.status !== 'ACTIVE') {
    return NextResponse.json({ error: 'Votre compte doit d\'abord être validé par l\'administration.' }, { status: 403 });
  }
  if (await tropAujourdhui('ajout-formation', eleve.id, 10)) {
    return NextResponse.json({ error: 'Trop de demandes aujourd\'hui. Réessayez demain.' }, { status: 429 });
  }
  const { formation } = (await request.json().catch(() => ({}))) ?? {};
  const resultat = await ajouterFormation(eleve.id, formation);
  if (resultat === 'inconnue') return NextResponse.json({ error: 'Cette formation n\'est pas ouverte aux inscriptions.' }, { status: 400 });
  if (resultat === 'deja') return NextResponse.json({ error: 'Vous êtes déjà inscrit à cette formation.' }, { status: 409 });
  if (resultat === 'trop') return NextResponse.json({ error: 'Vous avez déjà plusieurs demandes en attente de validation.' }, { status: 409 });
  return NextResponse.json({ success: true });
}
