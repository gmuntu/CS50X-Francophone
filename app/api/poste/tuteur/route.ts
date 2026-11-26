import { posteDeLaRequete } from '@/lib/poste-ecole';
import { depasse } from '@/lib/quota';
import { ENTETE_MOTEUR, fluxGemini } from '@/lib/gemini-tuteur';
import { bornerMessages, lireJsonBorne, parametresPropres, preparerTuteur } from '@/lib/tuteur-consigne';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const entier = (v: string | undefined, defaut: number) => {
  const n = Number.parseInt(v ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : defaut;
};
/** Questions à Socrate par ordinateur d'école et par jour (coût Gemini). Réglable : POSTE_TUTEUR_PAR_JOUR. */
const limitePoste = () => entier(process.env.POSTE_TUTEUR_PAR_JOUR, 300);
/** Plafond pour tous les ordinateurs d'une même école. Réglable : POSTE_TUTEUR_INST_PAR_JOUR. */
const limiteInstitution = () => entier(process.env.POSTE_TUTEUR_INST_PAR_JOUR, 2000);

const erreur = (error: string, status: number) => Response.json({ error }, { status });

/**
 * Socrate relayé par un ordinateur d'école (l'élève y est déjà connecté, son inscription et sa limite
 * personnelle y sont vérifiées). Le poste n'envoie que le contexte (leçon, semaine, voix…) et la
 * conversation : la consigne est reconstruite ici, comme sur le poste (aucune consigne libre acceptée).
 * Le modèle est fixé ici. Réponse en flux au format OpenAI.
 */
export async function POST(req: Request) {
  // Un ordinateur d'école ne se relaie pas à lui-même.
  if (process.env.SAVOIRIA_LOCAL === '1') return erreur('Indisponible sur un ordinateur d’école', 404);
  const poste = await posteDeLaRequete(req);
  if (!poste) return erreur('Poste inconnu ou désactivé', 401);
  const cle = process.env.GEMINI_API_KEY;
  if (!cle) return erreur('Service indisponible', 503);

  const body: any = await lireJsonBorne(req);
  if (body === null) return erreur('Demande trop grande', 413);
  if (!body || typeof body !== 'object' || !Array.isArray(body.messages)) return erreur('Demande illisible', 400);

  const jour = new Date().toISOString().slice(0, 10);
  if (await depasse(`ia:tutor-poste:${poste.id}:${jour}`, limitePoste(), 24 * 3600_000)) {
    return erreur("Limite du jour atteinte pour cet ordinateur d'école. Socrate continue avec l'IA de l'ordinateur.", 429);
  }
  if (await depasse(`ia:tutor-inst:${poste.institutionId}:${jour}`, limiteInstitution(), 24 * 3600_000)) {
    return erreur("Limite du jour atteinte pour les ordinateurs de cette école. Socrate continue avec l'IA de l'ordinateur.", 429);
  }

  // Consigne d'ordinateur d'école (local: true), à partir des seuls paramètres reconnus.
  const { systeme, messages, modeleTexte } = await preparerTuteur(parametresPropres(body), bornerMessages(body.messages), { local: true });
  try {
    return await fluxGemini({ systeme, messages, cle, modele: modeleTexte, entetes: { [ENTETE_MOTEUR]: 'gemini' } });
  } catch (e) {
    console.error('poste/tuteur :', e);
    return erreur('Gemini ne répond pas', 502);
  }
}
