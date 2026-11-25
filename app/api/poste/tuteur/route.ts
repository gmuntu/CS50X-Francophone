import { posteDeLaRequete } from '@/lib/poste-ecole';
import { depasse } from '@/lib/quota';
import { ENTETE_MOTEUR, fluxGemini } from '@/lib/gemini-tuteur';
import { CONSIGNE_MAX, MESSAGE_MAX, MESSAGES_MAX } from '@/lib/relais-poste-ia';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Le site en ligne choisit lui-même le modèle : le poste ne peut ni le changer, ni donner une adresse.
const MODELE = 'gemini-3.6-flash';
const MODELE_APPROFONDIR = 'gemini-3.8-flash';

/** Questions à Socrate par ordinateur d'école et par jour (coût Gemini). Réglable : POSTE_TUTEUR_PAR_JOUR. */
const limiteTuteurParJour = () => {
  const n = Number.parseInt(process.env.POSTE_TUTEUR_PAR_JOUR ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : 1500;
};

const erreur = (error: string, status: number) => Response.json({ error }, { status });

/**
 * Socrate relayé par un ordinateur d'école (l'élève y est déjà connecté, son inscription y est vérifiée).
 * Le poste envoie la consigne déjà construite et la conversation ; on répond en flux au format OpenAI.
 */
export async function POST(req: Request) {
  // Un ordinateur d'école ne se relaie pas à lui-même.
  if (process.env.SAVOIRIA_LOCAL === '1') return erreur('Indisponible sur un ordinateur d’école', 404);
  const poste = await posteDeLaRequete(req);
  if (!poste) return erreur('Poste inconnu ou désactivé', 401);
  const cle = process.env.GEMINI_API_KEY;
  if (!cle) return erreur('Service indisponible', 503);

  const body = await req.json().catch(() => null);
  const systeme = typeof body?.systeme === 'string' ? body.systeme.slice(0, CONSIGNE_MAX).trim() : '';
  if (!systeme || !Array.isArray(body?.messages)) return erreur('Demande illisible', 400);
  const messages = (body.messages as any[]).slice(-MESSAGES_MAX).map((m) => ({
    role: m?.role === 'assistant' ? 'assistant' : 'user',
    content: String(m?.content ?? '').slice(0, MESSAGE_MAX),
  }));

  if (await depasse(`ia:tutor-poste:${poste.id}:${new Date().toISOString().slice(0, 10)}`, limiteTuteurParJour(), 24 * 3600_000)) {
    return erreur("Limite du jour atteinte pour cet ordinateur d'école. Socrate continue avec l'IA de l'ordinateur.", 429);
  }

  try {
    return await fluxGemini({
      systeme, messages, cle,
      modele: body?.approfondir === true ? MODELE_APPROFONDIR : MODELE,
      entetes: { [ENTETE_MOTEUR]: 'gemini' },
    });
  } catch (e) {
    console.error('poste/tuteur :', e);
    return erreur('Gemini ne répond pas', 502);
  }
}
