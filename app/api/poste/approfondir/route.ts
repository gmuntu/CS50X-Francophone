import { posteDeLaRequete } from '@/lib/poste-ecole';
import { depasse } from '@/lib/quota';
import { analyserFormulaire, erreur } from '@/lib/approfondir/analyse';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const PAR_JOUR = 100; // analyses par ordinateur d'école et par jour (coût Gemini)

/** Un ordinateur d'école vérifie qu'il peut relayer une analyse (Internet + poste actif). */
export async function GET(req: Request) {
  const poste = await posteDeLaRequete(req);
  if (!poste) return erreur('Poste inconnu ou désactivé', 401);
  return process.env.GEMINI_API_KEY ? Response.json({ ok: true }) : erreur('Service indisponible', 503);
}

/** Analyse relayée par un ordinateur d'école (l'élève y est déjà connecté). */
export async function POST(req: Request) {
  const poste = await posteDeLaRequete(req);
  if (!poste) return erreur('Poste inconnu ou désactivé', 401);
  return analyserFormulaire(req, async () =>
    (await depasse(`ia:approfondir-poste:${poste.id}:${new Date().toISOString().slice(0, 10)}`, PAR_JOUR, 24 * 3600_000))
      ? erreur("Limite du jour atteinte pour cet ordinateur d'école. Réessayez demain.", 429)
      : null);
}
