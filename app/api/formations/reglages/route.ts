export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { reglagesFormations } from '@/lib/reglages-formations';

/** Réglages publics des formations, lus par le menu (aucune donnée d'élève) : onglet « Prof WhatsApp » ouvert ou non. */
export async function GET() {
  const reglages = await reglagesFormations();
  return NextResponse.json(
    { profWhatsApp: reglages.filter((r) => r.profWhatsApp).map((r) => r.formation) },
    { headers: { 'Cache-Control': 'public, max-age=300' } },
  );
}
