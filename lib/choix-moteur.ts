// Choix du « cerveau » de Socrate, côté navigateur : Auto (défaut), Gemini, ou Gemma local.
// Réglé dans l'administration (/admin/moteur-ia) ou dans le profil (Réglages avancés), jamais sur
// l'écran principal de l'élève. Toutes les questions écrites et vocales à Socrate passent par
// envoyerTuteur() : la même conversation est envoyée quel que soit le moteur.

export type ModeMoteur = 'auto' | 'gemini' | 'gemma';

/** Clé du navigateur. Elle ne commence pas par « socrate- » : le réglage survit à l'effacement des données hors ligne (lib/offline.ts). */
export const CLE_MOTEUR = 'savoiria-moteur-ia';
/** Événement émis quand le mode change ou qu'une réponse arrive (pour le badge). */
export const EVENEMENT_MOTEUR = 'savoiria-moteur-ia';

/** Gemma n'existe que sur l'ordinateur SavoirIA (installation de l'école). */
export const GEMMA_POSSIBLE = process.env.NEXT_PUBLIC_SAVOIRIA_LOCAL === '1';

const MODES: readonly ModeMoteur[] = ['auto', 'gemini', 'gemma'];

export function lireMode(): ModeMoteur {
  let m: string | null = null;
  try { m = localStorage.getItem(CLE_MOTEUR); } catch {}
  if (!m || !(MODES as readonly string[]).includes(m)) return 'auto';
  if (m === 'gemma' && !GEMMA_POSSIBLE) return 'auto';
  return m as ModeMoteur;
}

export function ecrireMode(m: ModeMoteur) {
  if (m === 'gemma' && !GEMMA_POSSIBLE) return;
  try { localStorage.setItem(CLE_MOTEUR, m); } catch {}
  signaler();
}

let dernierMoteur: string | null = null;
/** Moteur qui a vraiment répondu au dernier tour ('gemini', 'gemma4:e2b', 'gemini-live'…), ou null. */
export const lireDernierMoteur = () => dernierMoteur;

function signaler() {
  try { window.dispatchEvent(new CustomEvent(EVENEMENT_MOTEUR, { detail: { mode: lireMode(), moteur: dernierMoteur } })); } catch {}
}

/** Note le moteur réellement utilisé (ex. Gemini Live dans le tuteur vocal) et prévient le badge. */
export function noterMoteur(moteur: string | null) {
  dernierMoteur = moteur;
  signaler();
}

/** Abonnement aux changements (pour useSyncExternalStore) : même onglet et autres onglets. */
export function abonnerMoteur(rappel: () => void): () => void {
  window.addEventListener(EVENEMENT_MOTEUR, rappel);
  window.addEventListener('storage', rappel);
  return () => { window.removeEventListener(EVENEMENT_MOTEUR, rappel); window.removeEventListener('storage', rappel); };
}

/** Nom court affiché : 'gemma4:e2b' -> 'Gemma e2b', 'gemini' -> 'Gemini'. */
export function libelleMoteur(moteur: string | null | undefined): string {
  if (!moteur) return '';
  if (moteur === 'gemini') return 'Gemini';
  if (moteur === 'gemini-live') return 'Gemini Live';
  const g = moteur.match(/^gemma\d*:?(.*)$/i);
  if (g) return g[1] ? `Gemma ${g[1]}` : 'Gemma';
  return moteur.slice(0, 30);
}

export const LIBELLES_MODE: Record<ModeMoteur, string> = { auto: 'Auto', gemini: 'Gemini', gemma: 'Gemma local' };

/**
 * Pose la question à Socrate (/api/tutor) avec le moteur choisi. Lit dans la réponse le moteur qui a
 * vraiment répondu (en-tête X-Savoiria-Moteur), le garde en mémoire et prévient le badge.
 */
export async function envoyerTuteur(corps: Record<string, unknown>, signal?: AbortSignal): Promise<Response> {
  const horsLigne = typeof navigator !== 'undefined' && navigator.onLine === false;
  const r = await fetch('/api/tutor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...corps, moteur: lireMode(), horsLigne }),
    signal,
  });
  const moteur = r.headers.get('X-Savoiria-Moteur');
  if (r.ok && moteur) noterMoteur(moteur);
  return r;
}

/** Message d'erreur lisible renvoyé par /api/tutor (ex. « Gemini indisponible : … »), ou null. */
export async function messageErreurTuteur(r: Response): Promise<string | null> {
  const d = await r.clone().json().catch(() => null);
  return typeof d?.error === 'string' ? d.error : null;
}
