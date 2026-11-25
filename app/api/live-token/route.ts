import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { quotaIA } from '@/lib/quota';
import { reponseJetonLive } from '@/lib/live-jeton';
import { liveDisponible, relaisJetonLive } from '@/lib/relais-poste-ia';

export const dynamic = 'force-dynamic';

const LOCAL = () => process.env.SAVOIRIA_LOCAL === '1';

/**
 * BÊTA — Jeton éphémère pour Gemini Live.
 * La vraie clé GEMINI_API_KEY reste sur le serveur : le navigateur ne reçoit
 * qu'un jeton à usage unique, valable quelques minutes.
 * Sur un ordinateur d'école (aucune clé Gemini), le jeton est demandé au site en ligne
 * avec la clé de poste (/api/poste/live-token).
 */
export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Non connecté' }, { status: 401 });
    { const bloque = await quotaIA(session.user as any, 'live'); if (bloque) return bloque; }

  if (LOCAL()) {
    const r = await relaisJetonLive();
    return r.ok ? NextResponse.json({ token: r.token, model: r.model }) : NextResponse.json({ error: r.raison }, { status: r.status });
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) return NextResponse.json({ error: 'GEMINI_API_KEY absente' }, { status: 500 });
  return reponseJetonLive(key);
}

/** Ordinateur d'école : Gemini Live est-il possible (Internet + poste actif) ? Ne consomme aucun jeton. */
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ ok: false }, { status: 401 });
  if (!LOCAL()) return NextResponse.json({ ok: !!process.env.GEMINI_API_KEY });
  const ok = await liveDisponible();
  return NextResponse.json({ ok }, { status: ok ? 200 : 503 });
}
