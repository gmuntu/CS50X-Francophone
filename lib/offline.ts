'use client';

// Outils côté navigateur pour enregistrer une semaine de cours sur l'appareil.
export const PAGES_CACHE = 'savoiria-pages-v1';
export const AUDIO_CACHE = 'savoiria-audio';
export const STATIC_CACHE = 'savoiria-static-v4-logo-s'; // doit rester identique à public/sw.js
const META_CACHE = 'savoiria-meta';
const META_KEY = '/__savoiria/saved-lessons.json';

export interface SavedLesson {
  id: number;
  title: string;
  path: string;
  audio: string[];
  savedAt: string;
  /** Empreinte des quiz au moment de l'enregistrement (CS50x) : sert à repérer un paquet périmé. */
  version?: string;
}

export const offlineSupported = () =>
  typeof window !== 'undefined' && 'caches' in window && 'serviceWorker' in navigator;

export async function listSavedLessons(): Promise<SavedLesson[]> {
  if (!offlineSupported()) return [];
  const res = await (await caches.open(META_CACHE)).match(META_KEY);
  return res ? ((await res.json()) as SavedLesson[]) : [];
}

async function writeList(list: SavedLesson[], depart?: number) {
  const meta = await caches.open(META_CACHE);
  // Vérifié juste avant l'écriture : un effacement survenu entre-temps l'annule.
  if (depart !== undefined) pasEfface(depart);
  await meta.put(
    META_KEY,
    new Response(JSON.stringify(list), { headers: { 'Content-Type': 'application/json' } })
  );
}

const absolute = (u: string) => new URL(u, window.location.origin).toString();

// Compteur d'effacements (déconnexion, changement d'élève). Un enregistrement commencé avant
// un effacement s'arrête au lieu de remettre sur l'appareil les pages de l'élève parti.
let effacements = 0;
export const effacementsFaits = () => effacements;
function pasEfface(depart: number) {
  if (depart !== effacements) throw new Error('efface');
}
const SIGNAL_EFFACEMENT = 'savoiria-effacement';
// Déconnexion ou changement d'élève dans un AUTRE onglet : celui-ci arrête aussi ses enregistrements.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === SIGNAL_EFFACEMENT || e.key === 'savoiria-eleve') effacements++;
  });
}

export async function saveLesson(
  lesson: Omit<SavedLesson, 'savedAt'>,
  onProgress?: (done: number, total: number) => void,
  options: { sansAudio?: boolean } = {}
) {
  const depart = effacements;
  // Demande au téléphone de ne pas effacer ces cours quand l'espace manque
  // (seulement quand l'élève a choisi le hors ligne complet, pas pour l'enregistrement léger automatique).
  if (!options.sansAudio) { try { await navigator.storage?.persist?.(); } catch {} }
  const pages = await caches.open(PAGES_CACHE);
  const audio = await caches.open(AUDIO_CACHE);
  const aTelecharger = options.sansAudio ? [] : lesson.audio;
  const total = aTelecharger.length + 1;
  let done = 0;
  // Empreinte demandée AVANT la page : si un quiz change pendant le téléchargement,
  // la semaine sera vue comme périmée (et non l'inverse).
  const version = lesson.version ?? (await versionDe(lesson));

  const page = await fetch(lesson.path, { credentials: 'include' });
  if (!page.ok || page.redirected) throw new Error('page');
  const html = await page.clone().text();
  pasEfface(depart);
  await pages.put(absolute(lesson.path), page);
  // Fichiers techniques de la page (scripts, styles) : sans eux, la page s'affiche mais
  // les boutons (podcast, quiz) ne marchent pas hors ligne. Nom aligné sur public/sw.js.
  try {
    const assets = Array.from(new Set(html.match(/\/_next\/static\/[^"'\s)]+/g) ?? []));
    const stat = await caches.open(STATIC_CACHE);
    await Promise.all(assets.map(async (a) => {
      if (await stat.match(absolute(a))) return;
      const r = await fetch(a).catch(() => null);
      if (r?.ok && depart === effacements) await stat.put(absolute(a), r);
    }));
  } catch {}
  onProgress?.(++done, total);

  const failed: string[] = [];
  for (const src of aTelecharger) {
    try {
      // Déjà sur l'appareil : on ne le retélécharge pas (économie de données).
      if (await audio.match(absolute(src))) { onProgress?.(++done, total); continue; }
      const sameOrigin = new URL(src, window.location.origin).origin === window.location.origin;
      const res = await fetch(src, sameOrigin ? {} : { mode: 'cors' });
      if (!res.ok || res.status === 206) throw new Error(String(res.status));
      pasEfface(depart);
      await audio.put(absolute(src), res);
    } catch {
      if (depart !== effacements) break; // appareil effacé entre-temps : on s'arrête
      failed.push(src);
    }
    onProgress?.(++done, total);
  }

  pasEfface(depart);
  const avant = await listSavedLessons();
  pasEfface(depart);
  const precedent = avant.find((l) => l.id === lesson.id);
  // Pages seules : on garde les podcasts déjà enregistrés, sans en ajouter.
  const audioGarde = options.sansAudio
    ? (precedent?.audio ?? [])
    : [...lesson.audio.filter((a) => !failed.includes(a)), ...(precedent?.audio ?? []).filter((a) => !lesson.audio.includes(a))];
  const list = avant.filter((l) => l.id !== lesson.id);
  list.push({ ...lesson, version, audio: audioGarde, savedAt: new Date().toISOString() });
  await writeList(list.sort((a, b) => a.id - b.id), depart);
  return { failed };
}

/** Enregistre une page « outil » (salle de cours, Agora, accueil hors ligne…) avec ses fichiers techniques. */
export async function savePage(path: string) {
  const depart = effacements;
  const page = await fetch(path, { credentials: 'include' });
  if (!page.ok || page.redirected) return false;
  const html = await page.clone().text();
  const pages = await caches.open(PAGES_CACHE);
  if (depart !== effacements) return false; // vérifié au plus près de l'écriture
  await pages.put(absolute(path), page);
  try {
    const assets = Array.from(new Set(html.match(/\/_next\/static\/[^"'\s)]+/g) ?? []));
    const stat = await caches.open(STATIC_CACHE);
    await Promise.all(assets.map(async (a) => {
      if (await stat.match(absolute(a))) return;
      const r = await fetch(a).catch(() => null);
      if (r?.ok && depart === effacements) await stat.put(absolute(a), r);
    }));
  } catch {}
  return true;
}

const estCs50x = (l: { path: string }) => l.path.startsWith('/courses/cs50x/');

/** Empreintes actuelles des quiz CS50x, données par le serveur (null sans réseau ou sans connexion). */
async function versionsActuelles(): Promise<Record<string, string> | null> {
  try {
    const r = await fetch('/api/offline/manifest?course=cs50x&versions=1', { cache: 'no-store', credentials: 'include' });
    if (!r.ok) return null;
    return ((await r.json()) as { versions?: Record<string, string> }).versions ?? null;
  } catch {
    return null;
  }
}

async function versionDe(lesson: { id: number; path: string }): Promise<string | undefined> {
  if (!estCs50x(lesson)) return undefined;
  return (await versionsActuelles())?.[lesson.id];
}

/**
 * Semaines enregistrées dont les quiz ont changé depuis (corrigés, remplacés…).
 * Une semaine enregistrée avant l'arrivée des empreintes compte comme périmée.
 * Sans réseau, renvoie une liste vide : on ne peut pas savoir.
 */
export async function paquetsPerimes(): Promise<SavedLesson[]> {
  if (!offlineSupported() || !navigator.onLine) return [];
  const cs50 = (await listSavedLessons().catch(() => [] as SavedLesson[])).filter(estCs50x);
  if (!cs50.length) return [];
  const versions = await versionsActuelles();
  if (!versions) return [];
  return cs50.filter((l) => versions[l.id] && l.version !== versions[l.id]);
}

/**
 * Met à jour les semaines périmées : seulement les pages (où se trouvent les quiz),
 * les podcasts déjà enregistrés sont gardés. Renvoie le nombre de semaines mises à jour.
 */
export async function mettreAJourPaquets(perimes: SavedLesson[]): Promise<number> {
  const depart = effacements;
  const versions = await versionsActuelles();
  if (!versions) return 0;
  let faits = 0;
  for (const l of perimes) {
    if (!(await savePage(l.path).catch(() => false))) continue;
    const list = await listSavedLessons();
    const cible = list.find((x) => x.id === l.id);
    if (depart !== effacements) return faits;
    if (!cible) continue;
    cible.version = versions[l.id];
    cible.savedAt = new Date().toISOString();
    try { await writeList(list, depart); } catch { return faits; }
    faits++;
  }
  return faits;
}

export async function removeLesson(id: number) {
  const list = await listSavedLessons();
  const target = list.find((l) => l.id === id);
  if (!target) return;
  const audio = await caches.open(AUDIO_CACHE);
  await Promise.all(target.audio.map((a) => audio.delete(absolute(a))));
  await (await caches.open(PAGES_CACHE)).delete(absolute(target.path));
  await writeList(list.filter((l) => l.id !== id));
}

/**
 * À appeler à la déconnexion : efface les cours enregistrés sur l'appareil.
 * envoyerQuiz = false quand un AUTRE élève est déjà connecté : ses résultats en attente
 * ne doivent pas être envoyés sur le compte du nouvel élève.
 */
export async function clearOfflineData(options: { envoyerQuiz?: boolean } = {}) {
  effacements++; // arrête tout enregistrement en cours (synchro automatique comprise)
  try { localStorage.setItem(SIGNAL_EFFACEMENT, String(Date.now())); } catch {} // … et dans les autres onglets
  // Résultats de quiz en attente : envoyés avec la session de leur élève, puis la file est vidée
  // pour qu'ils ne soient jamais attribués à un autre élève sur le même appareil.
  try {
    const { flushQueue, clearQueue } = await import('@/lib/sync-queue');
    if (options.envoyerQuiz !== false) await flushQueue();
    clearQueue();
  } catch {}
  // Données personnelles gardées dans le navigateur (contexte de Socrate, questions notées, synchro)
  try {
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith('socrate-') || k.startsWith('savoiria-auto-sync')) localStorage.removeItem(k);
    }
  } catch {}
  if (!offlineSupported()) return;
  await Promise.all([caches.delete(PAGES_CACHE), caches.delete(AUDIO_CACHE), caches.delete(META_CACHE)]);
}

/**
 * Appareil partagé : si un autre élève se connecte, on efface d'abord ce que le précédent
 * avait enregistré (pages, podcasts, questions), même s'il n'a pas cliqué sur « Déconnexion ».
 */
let verification: { id: string; p: Promise<void> } | null = null;
export function verifierChangementEleve(userId: string | undefined): Promise<void> {
  if (!userId) return Promise.resolve();
  // Une seule vérification à la fois (l'en-tête et la synchro l'appellent tous les deux).
  if (verification?.id === userId) return verification.p;
  const p = (async () => {
    try {
      const avant = localStorage.getItem('savoiria-eleve');
      // La session est déjà celle du nouvel élève : on n'envoie pas les quiz du précédent.
      if (avant && avant !== userId) await clearOfflineData({ envoyerQuiz: false });
      localStorage.setItem('savoiria-eleve', userId);
    } catch {}
  })();
  verification = { id: userId, p };
  return p;
}

/** Clé de cache d'une réplique de podcast générée (formations SavoirIA sans fichier MP3). */
export const generatedAudioKey = (course: string, week: number, line: number) =>
  `/__savoiria/podcast/${course}/s${week}-${line}.mp3`;

/** Lit une réplique déjà enregistrée sur l'appareil (null si absente). */
export async function readGeneratedAudio(key: string): Promise<ArrayBuffer | null> {
  if (!offlineSupported()) return null;
  try {
    const hit = await (await caches.open(AUDIO_CACHE)).match(absolute(key));
    return hit ? await hit.arrayBuffer() : null;
  } catch {
    return null;
  }
}

/** Enregistre une réplique générée (MP3 en base64) et la rattache à la semaine pour pouvoir la retirer. */
export async function storeGeneratedAudio(lessonId: number, key: string, b64: string) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  await (await caches.open(AUDIO_CACHE)).put(absolute(key), new Response(bytes, { headers: { 'Content-Type': 'audio/mpeg' } }));
  const list = await listSavedLessons();
  const l = list.find((x) => x.id === lessonId);
  if (l && !l.audio.includes(key)) { l.audio.push(key); await writeList(list); }
}
