import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { depasse, quotaIA } from '@/lib/quota';
import { reponseJetonLive } from '@/lib/live-jeton';
import { liveDisponible, relaisJetonLive } from '@/lib/relais-poste-ia';

export const dynamic = 'force-dynamic';

const LOCAL = () => process.env.SAVOIRIA_LOCAL === '1';

/** Conversations Gemini Live par élève et par jour sur un ordinateur d'école. Réglable : POSTE_ELEVE_LIVE_PAR_JOUR. */
const limiteEleveLive = () => {
  const n = Number.parseInt(process.env.POSTE_ELEVE_LIVE_PAR_JOUR ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : 10;
};

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
    // Limite personnelle atteinte : erreur, et le tuteur vocal continue en tour par tour sur l'ordinateur.
    const id = String((session.user as any).id ?? '');
    if (await depasse(`ia:live-poste-eleve:${id}:${new Date().toISOString().slice(0, 10)}`, limiteEleveLive(), 24 * 3600_000)) {
      return NextResponse.json({ error: 'Limite du jour atteinte pour la conversation en direct.' }, { status: 429 });
    }
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
