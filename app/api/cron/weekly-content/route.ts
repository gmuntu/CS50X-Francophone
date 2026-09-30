export const dynamic = 'force-dynamic';
export const maxDuration = 300;

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { runWeeklyContent } from '@/lib/weekly-content';
import { runTranscripts } from '@/lib/transcripts';

async function runAll(origin: string) {
  const content = await runWeeklyContent();
  const left = Math.max(30_000, 270_000 - content.seconds * 1000);
  const tr = await runTranscripts(origin, left);
  return { ...content, done: [...content.done, ...tr.done], errors: [...content.errors, ...tr.errors] };
}

/**
 * Tâche programmée (voir vercel.json) : chaque nuit, prépare le contenu manquant
 * (résumé, séances socratiques lundi/mercredi/vendredi, quiz) — d'abord pour la
 * semaine en cours et la suivante, puis pour le reste du programme.
 * Vercel envoie « Authorization: Bearer <CRON_SECRET> ».
 * Un administrateur connecté peut aussi la lancer manuellement (POST).
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: 'CRON_SECRET non configuré' }, { status: 503 });
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  const result = await runAll(request.nextUrl.origin);
  console.log('[cron weekly-content]', JSON.stringify(result));
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if ((session?.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Réservé aux administrateurs' }, { status: 403 });
  }
  const result = await runAll(request.nextUrl.origin);
  console.log('[manual weekly-content]', JSON.stringify(result));
  return NextResponse.json(result);
}
