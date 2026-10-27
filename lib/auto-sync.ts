'use client';

// SavoirIA hors ligne — synchronisation automatique.
// Dès qu'il y a Internet (Wi-Fi de préférence) : on envoie ce qui attend (quiz faits hors ligne),
// puis on enregistre sur l'appareil toutes les semaines ouvertes des formations, podcasts compris.
// Le travail reprend là où il s'était arrêté si la connexion se coupe.

import { saveLesson, savePage, listSavedLessons, offlineSupported, type SavedLesson } from '@/lib/offline';
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
const INTERVALLE_MS = 12 * 60 * 60 * 1000; // au plus toutes les 12 h

let etat: EtatSync = { enCours: false, enPause: false, etape: '', fait: 0, total: 0 };

function lireMemoire(): { derniere?: string; enPause?: boolean } {
  try { return JSON.parse(localStorage.getItem(CLE) || '{}'); } catch { return {}; }
}
function ecrireMemoire(m: { derniere?: string; enPause?: boolean }) {
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
  if (auto) {
    if (m.enPause || connexionMobile()) return;
    // Automatique seulement pour ceux qui utilisent SavoirIA hors ligne : application installée,
    // ordinateur SavoirIA (Socrate local) ou au moins une semaine déjà enregistrée.
    const installee = window.matchMedia?.('(display-mode: standalone)').matches;
    const dejaHorsLigne = (await listSavedLessons().catch(() => [])).length > 0;
    const posteSavoirIA = installee || dejaHorsLigne || (await import('@/lib/socrate-local').then((x) => x.socrateLocalDisponible()).catch(() => false));
    if (!posteSavoirIA) return;
    if (m.derniere && Date.now() - new Date(m.derniere).getTime() < INTERVALLE_MS) {
      await flushQueue().catch(() => 0); // l'envoi des quiz, lui, est toujours immédiat
      return;
    }
  }
  ecrireMemoire({ enPause: false });
  publier({ enCours: true, enPause: false, etape: 'Envoi de ta progression…', fait: 0, total: 0, erreur: undefined });

  try {
    await flushQueue().catch(() => 0);

    // Ce qu'il faut avoir sur l'appareil
    const aFaire: { formation: string; lecon: { id: number; title: string; path: string; audio: string[] } }[] = [];
    for (const f of FORMATIONS) {
      const r = await fetch(`/api/offline/manifest?course=${f.slug}`, { cache: 'no-store' }).catch(() => null);
      if (!r || r.status === 401) { publier({ enCours: false, etape: '', erreur: 'Connecte-toi une fois avec Internet pour activer la synchronisation.' }); return; }
      if (!r.ok) continue;
      const { lessons } = await r.json();
      for (const l of lessons ?? []) aFaire.push({ formation: f.titre, lecon: l });
    }

    // Les pages « outils » de l'application, pour qu'elles s'ouvrent aussi sans Internet
    publier({ etape: "Enregistrement de l'application…" });
    for (const p of PAGES_OUTILS) await savePage(p).catch(() => false);

    publier({ total: aFaire.length });
    for (let i = 0; i < aFaire.length; i++) {
      if (lireMemoire().enPause) { publier({ enCours: false, enPause: true, etape: 'En pause' }); return; }
      if (!navigator.onLine) { publier({ enCours: false, etape: 'Connexion perdue : reprise au prochain Wi-Fi' }); return; }
      const { formation, lecon } = aFaire[i];
      publier({ etape: `${formation} · ${lecon.title}`, fait: i });
      await saveLesson(lecon).catch(() => null);
    }
    const derniere = new Date().toISOString();
    ecrireMemoire({ derniere });
    publier({ enCours: false, etape: 'À jour', fait: aFaire.length, derniere });
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
