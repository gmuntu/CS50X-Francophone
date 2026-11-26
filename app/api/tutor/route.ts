export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { quotaIA } from '@/lib/quota';
import { refusSiPasInscrit } from '@/lib/acces-formation';
import { IA_SLUG } from '@/lib/courses/ia-essentiels';
import { depasse } from '@/lib/quota';
import { bornerMessages, lireJsonBorne, parametresPropres, preparerTuteur, type ParametresTuteur } from '@/lib/tuteur-consigne';
import {
  ENTETE_MOTEUR, ENTETES_FLUX, JETONS_VOIX_GEMMA, fluxGemini, modeleGemma, moteurValide,
  type MessageTuteur, type Moteur,
} from '@/lib/gemini-tuteur';
import { DELAI_GEMINI_FORCE_MS, echecRecent, relaisIAPossible, relaisTuteur } from '@/lib/relais-poste-ia';

const LOCAL = () => process.env.SAVOIRIA_LOCAL === '1';

/** Questions relayées vers Gemini par élève et par jour depuis un ordinateur d'école (Gemma reste illimité). */
const limiteEleveParJour = () => {
  const n = Number.parseInt(process.env.POSTE_ELEVE_PAR_JOUR ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : 60;
};

/** L'interception locale (lib/local-ai.ts) est-elle active ? Sinon, un appel « Gemma » partirait chez Google. */
const interceptionLocale = () => (globalThis as any).__savoiriaLocal === true;

const jsonErreur = (error: string, status: number) => new Response(JSON.stringify({ error }), {
  status, headers: { 'Content-Type': 'application/json' },
});

/**
 * Réponse selon le moteur choisi.
 * - Site en ligne : Auto et Gemini = Gemini, comme d'habitude.
 * - Ordinateur d'école (aucune clé Gemini) : Gemini passe par le site en ligne avec la clé de poste.
 *   En Auto, si le site en ligne ne donne pas son premier mot en 5 s (ou erreur, ou pas d'Internet),
 *   Gemma répond sans rien demander. En Gemini forcé, pas de repli : un message clair.
 * La même conversation (messages) est envoyée quel que soit le moteur.
 */
async function repondreAvecMoteur({ moteur, systeme, messages, modeleTexte, voix, horsLigne, userId, parametres, messagesBruts }: {
  moteur: Moteur; systeme: string; messages: MessageTuteur[]; modeleTexte: string; voix: boolean; horsLigne: boolean;
  userId: string;
  /** Pour le relais : seulement les paramètres de contexte et la conversation d'origine (le site en ligne refait la consigne). */
  parametres: ParametresTuteur; messagesBruts: MessageTuteur[];
}): Promise<Response | null> {
  if (!LOCAL()) {
    const cle = process.env.GEMINI_API_KEY || process.env.EMINI_API_KEY;
    // Auto sans clé Gemini : chemin historique (autre moteur éventuel).
    if (!cle && moteur === 'auto') return null;
    if (!cle) return jsonErreur('Gemini indisponible : aucune clé configurée sur le serveur.', 503);
    try {
      return await fluxGemini({ systeme, messages, modele: modeleTexte, cle, entetes: { [ENTETE_MOTEUR]: 'gemini' } });
    } catch {
      return jsonErreur('Gemini indisponible : le service ne répond pas. Réessaie dans un instant.', 502);
    }
  }

  // Gemma sur cet ordinateur (lib/local-ai.ts détourne l'appel « Gemini » vers Ollama).
  // Réponse vocale : 2 à 3 phrases, donc peu de jetons.
  const gemma = async () => {
    // Sans l'interception locale, on refuse plutôt que d'appeler Google avec une fausse clé.
    if (!interceptionLocale()) return jsonErreur("L'IA de cet ordinateur (Gemma) n'est pas démarrée.", 503);
    try {
      return await fluxGemini({
        systeme, messages, modele: modeleTexte, cle: 'local',
        maxTokens: voix ? JETONS_VOIX_GEMMA : 2048,
        entetes: { [ENTETE_MOTEUR]: modeleGemma() },
      });
    } catch {
      return jsonErreur("L'IA de cet ordinateur (Gemma) ne répond pas. Réessaie dans une minute.", 503);
    }
  };
  const viaGemini = (r: Response) => new Response(r.body, { headers: { ...ENTETES_FLUX, [ENTETE_MOTEUR]: 'gemini' } });

  // Limite Gemini par élève sur ce poste (compteur de la base de l'ordinateur), vérifiée juste avant de relayer.
  const eleveAuMaximum = () => depasse(`ia:tutor-poste-eleve:${userId}:${new Date().toISOString().slice(0, 10)}`, limiteEleveParJour(), 24 * 3600_000);
  const relais = { parametres: parametresPropres(parametres), messages: bornerMessages(messagesBruts) };

  if (moteur === 'gemma') return gemma();
  if (moteur === 'gemini') {
    if (horsLigne) return jsonErreur('Gemini indisponible : pas de connexion Internet.', 503);
    if (await eleveAuMaximum()) return jsonErreur('Gemini indisponible : tu as atteint ta limite du jour sur cet ordinateur. Choisis Auto ou Gemma local pour continuer.', 429);
    const r = await relaisTuteur(relais, DELAI_GEMINI_FORCE_MS);
    return r.ok ? viaGemini(r.reponse) : jsonErreur(`Gemini indisponible : ${r.raison}`, r.status);
  }
  // Auto : élève au maximum -> Gemma, sans erreur.
  if (!horsLigne && relaisIAPossible() && !echecRecent() && !(await eleveAuMaximum())) {
    const r = await relaisTuteur(relais);
    if (r.ok) return viaGemini(r.reponse);
  }
  return gemma();
}


export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new Response(JSON.stringify({ error: 'Non authentifié. Veuillez vous connecter.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    // Corps borné : au-delà de 500 000 octets, refusé (413).
    const lu = await lireJsonBorne(request);
    if (lu === null) return jsonErreur('Demande trop grande.', 413);
    const body: any = lu ?? {};
    const { moduleId, course } = body ?? {};
    const moteur = body?.moteur;
    if (moteur !== undefined && !moteurValide(moteur)) return jsonErreur('Moteur inconnu.', 400);
    // Gemma n'existe que sur l'ordinateur SavoirIA d'une école.
    if (moteur === 'gemma' && !LOCAL()) return jsonErreur("Gemma local n'est disponible que sur l'ordinateur SavoirIA.", 503);
    // Le tuteur d'une formation est réservé aux élèves dont l'inscription à cette formation est validée.
    { const refus = await refusSiPasInscrit((session.user as any).id, course === IA_SLUG || (typeof moduleId === 'number' && moduleId >= 1000 && moduleId < 3000) ? 'ia-essentiels' : 'cs50x'); if (refus) return refus; }
    { const bloque = await quotaIA(session.user as any, 'tutor'); if (bloque) return bloque; }
    // Garde-fou coût : 30 derniers messages, 4 000 caractères chacun au maximum.
    const messagesBruts = (Array.isArray(body?.messages) ? body.messages : []).slice(-30).map((m: any) => ({
      ...m, content: String(m?.content ?? '').slice(0, 4000),
    }));

    const { systeme, messages, modeleTexte } = await preparerTuteur(body, messagesBruts);

    const geminiKey = process.env.GEMINI_API_KEY || process.env.EMINI_API_KEY;
    const abacusKey = process.env.ABACUSAI_API_KEY;

    // Choix du moteur (Auto / Gemini / Gemma) : seulement si le navigateur l'envoie.
    // Sans ce champ (Salle d'étude…), le chemin historique ci-dessous ne change pas.
    if (moteur !== undefined) {
      const r = await repondreAvecMoteur({
        moteur, systeme, messages, modeleTexte, voix: body?.voix === true, horsLigne: body?.horsLigne === true,
        userId: String((session.user as any).id ?? ''), parametres: body, messagesBruts,
      });
      if (r) return r;
    }

    // 1. PRIORITÉ : GOOGLE GEMINI (avec clé API active)
    if (geminiKey) {
      return await fluxGemini({ systeme, messages, modele: modeleTexte, cle: geminiKey });
    }

    // 2. ALTERNATIVE : ABACUS.AI (si configuré)
    if (abacusKey && !abacusKey.startsWith('AQ.')) {
      const apiMessages = [
        { role: 'system', content: systeme },
        ...((messages ?? [])?.map?.((m: any) => ({ role: m?.role ?? 'user', content: m?.content ?? '' })) ?? []),
      ];

      const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${abacusKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-5.4-mini',
          messages: apiMessages,
          stream: true,
          max_tokens: 2000,
          temperature: 0.7,
        }),
      });

      if (!response?.ok) {
        const errText = await response?.text?.();
        console.error('LLM API error:', errText);
        return new Response(JSON.stringify({ error: 'Erreur API LLM' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const stream = new ReadableStream({
        async start(controller) {
          const reader = response?.body?.getReader?.();
          const decoder = new TextDecoder();
          const encoder = new TextEncoder();
          try {
            while (reader) {
              const { done, value } = await reader.read();
              if (done) break;
              const chunk = decoder.decode(value);
              controller.enqueue(encoder.encode(chunk));
            }
          } catch (error: any) {
            console.error('Stream error:', error);
            controller.error(error);
          } finally {
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    return new Response(
      JSON.stringify({ error: 'Aucune clé API IA valide configurée (GEMINI_API_KEY requise).' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Tutor route error:', error);
    return new Response(
      JSON.stringify({ error: 'Erreur interne de connexion au tuteur Socrate.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
