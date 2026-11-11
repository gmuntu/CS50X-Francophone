import { auth } from '@/auth';
import { depasse, quotaIA } from '@/lib/quota';
import { analyserFormulaire, erreur } from '@/lib/approfondir/analyse';
import { relaisPoste } from '@/lib/approfondir/relais-poste';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Découpe le PDF ou les notes de l'élève en notions (gemini-3.8-flash, clé côté serveur, rien d'enregistré).
 * Sur un ordinateur d'école : l'analyse est relayée vers le site en ligne, avec la clé du poste.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return erreur('Non connecté', 401);
  if (process.env.SAVOIRIA_LOCAL === '1') {
    // Sur le poste, quotaIA ne limite personne : 20 analyses par élève et par jour, pour ne pas épuiser
    // à lui seul la limite de l'école (100 par jour sur le site).
    const cle = `ia:approfondir-eleve:${session.user.id}:${new Date().toISOString().slice(0, 10)}`;
    if (await depasse(cle, 20, 24 * 3600_000)) return erreur('Limite du jour atteinte. Réessayez demain.', 429);
    return relaisPoste(request);
  }
  return analyserFormulaire(request, () => quotaIA(session.user as any, 'approfondir'));
}
