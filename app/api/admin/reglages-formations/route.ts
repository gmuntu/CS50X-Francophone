export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { exigerAdmin } from '@/lib/admin-garde';
import { changerReglage, reglagesFormations } from '@/lib/reglages-formations';

/** Réglages de chaque formation (bourse universitaire, Prof WhatsApp), administrateurs seulement. */
export async function GET() {
  const g = await exigerAdmin();
  if (!g.ok) return NextResponse.json({ error: g.error }, { status: g.status });
  return NextResponse.json({ reglages: await reglagesFormations() });
}

export async function PUT(request: Request) {
  const g = await exigerAdmin();
  if (!g.ok) return NextResponse.json({ error: g.error }, { status: g.status });
  const { formation, bourseUniversitaire, profWhatsApp } = (await request.json().catch(() => ({}))) ?? {};
  const champ = typeof bourseUniversitaire === 'boolean' ? 'bourseUniversitaire' : typeof profWhatsApp === 'boolean' ? 'profWhatsApp' : null;
  if (!champ) return NextResponse.json({ error: 'Valeur attendue : activé ou désactivé.' }, { status: 400 });
  if (!(await changerReglage(formation, champ, champ === 'bourseUniversitaire' ? bourseUniversitaire : profWhatsApp))) {
    return NextResponse.json({ error: 'Formation inconnue.' }, { status: 400 });
  }
  return NextResponse.json({ success: true, reglages: await reglagesFormations() });
}
