// Ordinateur d'école : il n'a JAMAIS de clé Gemini (elle pourrait y être volée).
// Pour que Socrate réponde avec Gemini, il relaie la question vers le site en ligne, identifié par
// sa clé de poste (en-tête, jamais dans l'adresse). Même principe que lib/approfondir/relais-poste.ts.
import { ENTETE_POSTE } from '@/lib/poste-ecole';
import type { MessageTuteur } from '@/lib/gemini-tuteur';

const SERVEUR = () => (process.env.SAVOIRIA_SERVEUR || 'https://www.savoiria.online').trim().replace(/\/$/, '');
const CLE = () => (process.env.POSTE_CLE || '').trim();

/** La clé du poste ne part jamais en clair : adresse du site en https obligatoire. */
export const relaisIAPossible = () => CLE().startsWith('poste_') && SERVEUR().startsWith('https://');

/** Délai pour le PREMIER morceau de texte du site en ligne ; au-delà, Gemma prend le relais (mode Auto). */
export const DELAI_PREMIER_MOT_MS = 5_000;
/** Mode « Gemini » forcé : pas de repli, on attend un peu plus avant d'abandonner. */
export const DELAI_GEMINI_FORCE_MS = 20_000;

/** Bornes de ce que le poste envoie (le site en ligne les revérifie). */
export const CONSIGNE_MAX = 20_000;
export const MESSAGES_MAX = 30;
// Un message peut contenir le document étudié (Approfondir le sujet) : 4 000 + 6 000 caractères.
export const MESSAGE_MAX = 12_000;

/**
 * Vrai fetch : sur l'ordinateur d'école, lib/local-ai.ts remplace globalThis.fetch (il ne détourne que
 * les adresses Google, mais on passe directement par l'original pour plus de sûreté).
 */
const vraiFetch = (): typeof fetch => (globalThis as any).__savoiriaFetchOriginal ?? fetch;

// Après un échec, le mode Auto ne réessaie pas le site en ligne pendant une minute
// (sinon chaque question attendrait 5 s de plus quand Internet est coupé).
const PAUSE_APRES_ECHEC_MS = 60_000;
let echecLe = 0;
export const echecRecent = () => Date.now() - echecLe < PAUSE_APRES_ECHEC_MS;
/** Pour les tests : oublie le dernier échec. */
export const oublierEchecRelais = () => { echecLe = 0; };

export type ResultatRelais = { ok: true; reponse: Response } | { ok: false; raison: string; status: number };

const echec = (raison: string, status = 503): ResultatRelais => { echecLe = Date.now(); return { ok: false, raison, status }; };

/** Cherche du texte dans des lignes SSE au format OpenAI. */
function contientTexte(lignes: string[]): boolean {
  for (const l of lignes) {
    if (!l.startsWith('data: ')) continue;
    const json = l.slice(6).trim();
    if (!json || json === '[DONE]') continue;
    try { if (JSON.parse(json)?.choices?.[0]?.delta?.content) return true; } catch {}
  }
  return false;
}

/**
 * Relaie la question au site en ligne (/api/poste/tuteur). Réussit seulement si le premier morceau
 * de texte arrive avant `delaiMs` ; la réponse renvoyée contient alors tout le flux (déjà lu + suite).
 */
export async function relaisTuteur(
  corps: { systeme: string; messages: MessageTuteur[]; approfondir?: boolean },
  delaiMs = DELAI_PREMIER_MOT_MS,
): Promise<ResultatRelais> {
  if (!relaisIAPossible()) return echec('cet ordinateur n’a pas de clé de poste.');
  const arret = new AbortController();
  const minuteur = setTimeout(() => arret.abort(), delaiMs);
  try {
    const r = await vraiFetch()(`${SERVEUR()}/api/poste/tuteur`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', [ENTETE_POSTE]: CLE() },
      body: JSON.stringify({
        systeme: String(corps.systeme ?? '').slice(0, CONSIGNE_MAX),
        messages: (Array.isArray(corps.messages) ? corps.messages : []).slice(-MESSAGES_MAX).map((m) => ({
          role: m?.role === 'assistant' || m?.role === 'model' ? 'assistant' : 'user',
          content: String(m?.content ?? '').slice(0, MESSAGE_MAX),
        })),
        approfondir: corps.approfondir === true,
      }),
      cache: 'no-store',
      signal: arret.signal,
    });
    if (!r.ok || !r.body) {
      const d = await r.json().catch(() => null);
      const msg = typeof d?.error === 'string' ? d.error.slice(0, 200) : `le site en ligne a répondu ${r.status}.`;
      clearTimeout(minuteur);
      return echec(msg, r.status === 429 ? 429 : 503);
    }
    const lecteur = r.body.getReader();
    const dec = new TextDecoder();
    const dejaLus: Uint8Array[] = [];
    let tampon = '';
    for (;;) {
      const { value, done } = await lecteur.read();
      if (done) { clearTimeout(minuteur); return echec('réponse vide du site en ligne.'); }
      dejaLus.push(value);
      tampon += dec.decode(value, { stream: true });
      const lignes = tampon.split('\n');
      tampon = lignes.pop() ?? '';
      if (contientTexte(lignes)) break;
    }
    clearTimeout(minuteur);
    // Premier mot reçu : on transmet tel quel ce qui a été lu, puis la suite du flux.
    const flux = new ReadableStream<Uint8Array>({
      start(ctrl) { for (const m of dejaLus) ctrl.enqueue(m); },
      async pull(ctrl) {
        try {
          const { value, done } = await lecteur.read();
          if (done) ctrl.close(); else ctrl.enqueue(value);
        } catch { ctrl.close(); }
      },
      cancel() { lecteur.cancel().catch(() => {}); arret.abort(); }, // l'élève a quitté la page
    });
    return { ok: true, reponse: new Response(flux) };
  } catch {
    clearTimeout(minuteur);
    return echec(arret.signal.aborted ? 'pas de réponse du site en ligne à temps.' : 'site en ligne injoignable (Internet coupé ?).');
  }
}

/** Jeton Gemini Live demandé au site en ligne pour ce poste (usage unique, quelques minutes). */
export async function relaisJetonLive(): Promise<{ ok: true; token: string; model: string } | { ok: false; raison: string; status: number }> {
  if (!relaisIAPossible()) return { ok: false, raison: 'Cet ordinateur n’a pas de clé de poste.', status: 503 };
  try {
    const r = await vraiFetch()(`${SERVEUR()}/api/poste/live-token`, {
      method: 'POST', headers: { [ENTETE_POSTE]: CLE() }, cache: 'no-store', signal: AbortSignal.timeout(DELAI_PREMIER_MOT_MS),
    });
    const d = await r.json().catch(() => null);
    if (!r.ok || typeof d?.token !== 'string' || typeof d?.model !== 'string') {
      return { ok: false, raison: typeof d?.error === 'string' ? d.error.slice(0, 200) : 'Jeton Live indisponible', status: r.status === 429 ? 429 : 502 };
    }
    return { ok: true, token: d.token, model: d.model };
  } catch {
    return { ok: false, raison: 'Site en ligne injoignable', status: 503 };
  }
}

let memoLive: { ok: boolean; at: number } | null = null;

/** Le site en ligne peut-il donner des jetons Live à ce poste ? (vérifié au plus toutes les 30 s, sans consommer de jeton) */
export async function liveDisponible(): Promise<boolean> {
  if (!relaisIAPossible()) return false;
  if (memoLive && Date.now() - memoLive.at < 30_000) return memoLive.ok;
  let ok = false;
  try {
    const r = await vraiFetch()(`${SERVEUR()}/api/poste/live-token`, {
      headers: { [ENTETE_POSTE]: CLE() }, cache: 'no-store', signal: AbortSignal.timeout(DELAI_PREMIER_MOT_MS),
    });
    ok = r.ok;
  } catch {}
  memoLive = { ok, at: Date.now() };
  return ok;
}
