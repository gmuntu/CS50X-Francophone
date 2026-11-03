'use client';

// SavoirIA hors ligne — synchronisation automatique.
// Dès qu'il y a Internet : on envoie ce qui attend (quiz faits hors ligne), puis on enregistre
// sur l'appareil toutes les semaines ouvertes des formations.
// - Les pages (résumés, quiz, pages de l'application) : pour tout élève connecté, dès la première
//   connexion, même sur données mobiles (c'est léger).
// - Les podcasts (lourds) : seulement hors données mobiles, et pour ceux qui ont choisi le hors ligne
//   (application installée, ordinateur SavoirIA ou podcasts déjà enregistrés).
// Le travail reprend là où il s'était arrêté si la connexion se coupe.

import { saveLesson, savePage, listSavedLessons, offlineSupported, effacementsFaits, type SavedLesson } from '@/lib/offline';
import { flushQueue } from '@/lib/sync-queue';

export const FORMATIONS = [
  { slug: 'cs50x', titre: 'CS50x' },
  { slug: 'ia-essentiels', titre: "L'essentiel de l'IA" },
] as const;

export interface EtatSync {
  enCours: boolean;
  enPause: boolean;
  etape: string;          // texte affiché à l'étudiant
  fait: number;           // éléments terminés
  total: number;          // éléments à traiter
  derniere?: string;      // date ISO de la dernière synchronisation complète
  erreur?: string;
}

const CLE = 'savoiria-auto-sync';
export const EVT_SYNC = 'savoiria-auto-sync-change';
export const PAGES_OUTILS = ['/hors-ligne', '/tuteur', '/agora', '/cs50x', '/dashboard', '/formations'];
// Enregistrement léger automatique (élève qui n'a pas choisi le hors ligne, ordinateur public possible) :
// pas de pages personnelles (tableau de bord, Agora) ni de Socrate.
const PAGES_OUTILS_LEGER = ['/hors-ligne', '/cs50x', '/formations'];
const INTERVALLE_MS = 12 * 60 * 60 * 1000; // au plus toutes les 12 h
const INTERVALLE_MOBILE_MS = 24 * 60 * 60 * 1000; // pages sur données mobiles : au plus une fois par jour
const PAGE_A_JOUR_MS = 7 * 24 * 60 * 60 * 1000; // semaine aux quiz inchangés : rafraîchie au plus chaque semaine

let etat: EtatSync = { enCours: false, enPause: false, etape: '', fait: 0, total: 0 };

interface Memoire { derniere?: string; dernierePages?: string; enPause?: boolean }
function lireMemoire(): Memoire {
  try { return JSON.parse(localStorage.getItem(CLE) || '{}'); } catch { return {}; }
}
function ecrireMemoire(m: Memoire) {
  try { localStorage.setItem(CLE, JSON.stringify({ ...lireMemoire(), ...m })); } catch {}
}
function publier(p: Partial<EtatSync>) {
  etat = { ...etat, ...p };
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(EVT_SYNC, { detail: etat }));
}

export function etatSync(): EtatSync {
  const m = typeof window === 'undefined' ? {} : lireMemoire();
  return { ...etat, derniere: m.derniere, enPause: !!m.enPause };
}

/** Connexion mobile (données payantes) : on évite les gros téléchargements automatiques. */
export function connexionMobile(): boolean {
  const c: any = typeof navigator !== 'undefined' ? (navigator as any).connection : null;
  return !!c && (c.type === 'cellular' || c.saveData === true);
}

/** « Économiseur de données » activé sur le téléphone : aucun téléchargement automatique. */
function economiseurDonnees(): boolean {
  const c: any = typeof navigator !== 'undefined' ? (navigator as any).connection : null;
  return !!c && c.saveData === true;
}

/** Wi-Fi ou câble certains. iPhone, Firefox… ne le disent pas : on suppose alors des données mobiles. */
function connexionIllimiteeSure(): boolean {
  const c: any = typeof navigator !== 'undefined' ? (navigator as any).connection : null;
  if (!c || c.saveData === true) return false;
  return c.type === 'wifi' || c.type === 'ethernet';
}

export function mettreEnPause(pause: boolean) {
  ecrireMemoire({ enPause: pause });
  publier({ enPause: pause, etape: pause ? 'En pause' : etat.etape });
}

/**
 * Lance la synchronisation.
 * auto = true : seulement si en ligne, pas en pause, pas sur données mobiles et pas faite récemment.
 */
export async function synchroniser(auto = false): Promise<void> {
  if (etat.enCours || typeof window === 'undefined' || !navigator.onLine || !offlineSupported()) return;
  const m = lireMemoire();
  const recent = (iso: string | undefined, ms: number) => !!iso && Date.now() - new Date(iso).getTime() < ms;
  let sansAudio = false;
  if (auto) {
    if (m.enPause || economiseurDonnees()) return;
    // Podcasts automatiques seulement pour ceux qui utilisent SavoirIA hors ligne, et seulement en Wi-Fi :
    // ordinateur SavoirIA (Socrate local), ou application installée / podcasts déjà enregistrés
    // sur une connexion dont on est sûr qu'elle n'est pas mobile.
    const installee = window.matchMedia?.('(display-mode: standalone)').matches;
    const podcastsDeja = (await listSavedLessons().catch(() => [])).some((l) => l.audio.length > 0);
    const posteLocal = await import('@/lib/socrate-local').then((x) => x.socrateLocalDisponible()).catch(() => false);
    const complete = (posteLocal && !connexionMobile()) || ((installee || podcastsDeja) && connexionIllimiteeSure());
    const intervallePages = connexionIllimiteeSure() ? INTERVALLE_MS : INTERVALLE_MOBILE_MS;
    if (complete ? recent(m.derniere, INTERVALLE_MS) : recent(m.dernierePages ?? m.derniere, intervallePages)) {
      await flushQueue().catch(() => 0); // l'envoi des quiz, lui, est toujours immédiat
      return;
    }
    sansAudio = !complete;
  }
  ecrireMemoire({ enPause: false });
  const depart = effacementsFaits();
  publier({ enCours: true, enPause: false, etape: 'Envoi de ta progression…', fait: 0, total: 0, erreur: undefined });

  try {
    await flushQueue().catch(() => 0);

    // Ce qu'il faut avoir sur l'appareil
    const aFaire: { formation: string; lecon: { id: number; title: string; path: string; audio: string[]; version?: string } }[] = [];
    for (const f of FORMATIONS) {
      const r = await fetch(`/api/offline/manifest?course=${f.slug}`, { cache: 'no-store' }).catch(() => null);
      if (!r || r.status === 401) {
        publier({ enCours: false, etape: '', erreur: auto ? undefined : 'Connecte-toi une fois avec Internet pour activer la synchronisation.' });
        return;
      }
      if (!r.ok) continue;
      const { lessons } = await r.json();
      for (const l of lessons ?? []) aFaire.push({ formation: f.titre, lecon: l });
    }

    // Les pages « outils » de l'application, pour qu'elles s'ouvrent aussi sans Internet
    publier({ etape: "Enregistrement de l'application…" });
    for (const p of sansAudio ? PAGES_OUTILS_LEGER : PAGES_OUTILS) await savePage(p).catch(() => false);

    publier({ total: aFaire.length });
    const dejaLa = new Map((await listSavedLessons().catch(() => [] as SavedLesson[])).map((l) => [l.id, l]));
    for (let i = 0; i < aFaire.length; i++) {
      // Déconnexion ou changement d'élève pendant la synchro : on arrête tout, sans rien réenregistrer.
      if (effacementsFaits() !== depart) { publier({ enCours: false, etape: '' }); return; }
      if (lireMemoire().enPause) { publier({ enCours: false, enPause: true, etape: 'En pause' }); return; }
      if (!navigator.onLine) { publier({ enCours: false, etape: 'Connexion perdue : reprise au prochain Wi-Fi' }); return; }
      const { formation, lecon } = aFaire[i];
      publier({ etape: `${formation} · ${lecon.title}`, fait: i });
      // Pages seules : une semaine déjà enregistrée dont les quiz n'ont pas changé n'est pas
      // retéléchargée (au plus une fois par semaine), pour économiser les données.
      const avant = dejaLa.get(lecon.id);
      // Formations sans empreinte de quiz (L'essentiel de l'IA) : la date d'enregistrement suffit.
      if (sansAudio && avant && (lecon.version ? avant.version === lecon.version : true) && recent(avant.savedAt, PAGE_A_JOUR_MS)) continue;
      await saveLesson(lecon, undefined, { sansAudio }).catch(() => null);
    }
    if (effacementsFaits() !== depart) { publier({ enCours: false, etape: '' }); return; }
    const maintenant = new Date().toISOString();
    if (sansAudio) {
      ecrireMemoire({ dernierePages: maintenant });
      publier({ enCours: false, etape: 'Pages à jour (podcasts au prochain Wi-Fi ou sur demande)', fait: aFaire.length });
    } else {
      ecrireMemoire({ derniere: maintenant, dernierePages: maintenant });
      publier({ enCours: false, etape: 'À jour', fait: aFaire.length, derniere: maintenant });
    }
  } catch {
    publier({ enCours: false, etape: '', erreur: 'La synchronisation a échoué. Elle reprendra au prochain Wi-Fi.' });
  }
}

/** Contenus enregistrés, regroupés par formation. */
export async function contenusEnregistres(): Promise<Record<string, SavedLesson[]>> {
  const liste = await listSavedLessons().catch(() => [] as SavedLesson[]);
  return {
    cs50x: liste.filter((l) => l.path.startsWith('/courses/cs50x')),
    'ia-essentiels': liste.filter((l) => l.path.startsWith('/formations/ia-essentiels')),
  };
}

/** Espace utilisé / disponible sur l'appareil (en octets), si le navigateur le donne. */
export async function espaceStockage(): Promise<{ utilise: number; total: number } | null> {
  try {
    const e = await navigator.storage?.estimate?.();
    return e && e.quota ? { utilise: e.usage ?? 0, total: e.quota } : null;
  } catch {
    return null;
  }
}
