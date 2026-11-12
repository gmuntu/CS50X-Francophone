export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { cronAutorise, roleActuel } from '@/lib/securite';
import { runWaReminders } from '@/lib/messaging/wa-reminder';
import { menageDossiersExpires } from '@/lib/inscription-confirmation';

// Tâche quotidienne (vercel.json) : rappel « join » WhatsApp avant l'expiration du bac à sable.
export async function GET(request: NextRequest) {
  if (!cronAutorise(request)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  // Ménage quotidien : inscriptions jamais confirmées dont le lien a expiré (même si personne ne s'inscrit ce jour-là).
  await menageDossiersExpires();
  const result = await runWaReminders();
  console.log('[cron rappel-whatsapp]', JSON.stringify(result));
  return NextResponse.json(result);
}

// Lancement manuel par un administrateur (bouton dans Admin → Socrate sur WhatsApp).
export async function POST() {
  if ((await roleActuel()) !== 'ADMIN') return NextResponse.json({ error: 'Réservé aux administrateurs' }, { status: 403 });
  return NextResponse.json(await runWaReminders());
}
