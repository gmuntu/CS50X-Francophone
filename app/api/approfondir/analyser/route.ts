import { auth } from '@/auth';
import { quotaIA } from '@/lib/quota';
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
  if (process.env.SAVOIRIA_LOCAL === '1') return relaisPoste(request);
  return analyserFormulaire(request, () => quotaIA(session.user as any, 'approfondir'));
}
