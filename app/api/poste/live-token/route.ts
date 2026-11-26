import { posteDeLaRequete } from '@/lib/poste-ecole';
import { depasse } from '@/lib/quota';
import { reponseJetonLive } from '@/lib/live-jeton';

export const dynamic = 'force-dynamic';

/** Conversations Gemini Live par ordinateur d'école et par jour (coût). Réglable : POSTE_LIVE_PAR_JOUR. */
const limiteLiveParJour = () => {
  const n = Number.parseInt(process.env.POSTE_LIVE_PAR_JOUR ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : 200;
};

const erreur = (error: string, status: number) => Response.json({ error }, { status });

/** Un ordinateur d'école vérifie qu'il peut avoir des jetons Live (sans en consommer). */
export async function GET(req: Request) {
  if (process.env.SAVOIRIA_LOCAL === '1') return erreur('Indisponible sur un ordinateur d’école', 404);
  const poste = await posteDeLaRequete(req);
  if (!poste) return erreur('Poste inconnu ou désactivé', 401);
  return process.env.GEMINI_API_KEY ? Response.json({ ok: true }) : erreur('Service indisponible', 503);
}

/** Jeton Gemini Live à usage unique pour un ordinateur d'école (la clé Gemini reste ici). */
export async function POST(req: Request) {
  if (process.env.SAVOIRIA_LOCAL === '1') return erreur('Indisponible sur un ordinateur d’école', 404);
  const poste = await posteDeLaRequete(req);
  if (!poste) return erreur('Poste inconnu ou désactivé', 401);
  const cle = process.env.GEMINI_API_KEY;
  if (!cle) return erreur('Service indisponible', 503);
  if (await depasse(`ia:live-poste:${poste.id}:${new Date().toISOString().slice(0, 10)}`, limiteLiveParJour(), 24 * 3600_000)) {
    return erreur("Limite du jour atteinte pour cet ordinateur d'école (conversation en direct).", 429);
  }
  return reponseJetonLive(cle);
}
