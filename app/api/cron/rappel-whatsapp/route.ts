export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { runWaReminders } from '@/lib/messaging/wa-reminder';

// Tâche quotidienne (vercel.json) : rappel « join » WhatsApp avant l'expiration du bac à sable.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  const result = await runWaReminders();
  console.log('[cron rappel-whatsapp]', JSON.stringify(result));
  return NextResponse.json(result);
}

// Lancement manuel par un administrateur (bouton dans Admin → Socrate sur WhatsApp).
export async function POST() {
  const session = await auth();
  if ((session?.user as any)?.role !== 'ADMIN') return NextResponse.json({ error: 'Réservé aux administrateurs' }, { status: 403 });
  return NextResponse.json(await runWaReminders());
}
