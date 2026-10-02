'use client';

// Outils côté navigateur pour enregistrer une semaine de cours sur l'appareil.
export const PAGES_CACHE = 'savoiria-pages-v1';
export const AUDIO_CACHE = 'savoiria-audio';
const META_CACHE = 'savoiria-meta';
const META_KEY = '/__savoiria/saved-lessons.json';

export interface SavedLesson {
  id: number;
  title: string;
  path: string;
  audio: string[];
  savedAt: string;
}

export const offlineSupported = () =>
  typeof window !== 'undefined' && 'caches' in window && 'serviceWorker' in navigator;

export async function listSavedLessons(): Promise<SavedLesson[]> {
  if (!offlineSupported()) return [];
  const res = await (await caches.open(META_CACHE)).match(META_KEY);
  return res ? ((await res.json()) as SavedLesson[]) : [];
}

async function writeList(list: SavedLesson[]) {
  await (await caches.open(META_CACHE)).put(
    META_KEY,
    new Response(JSON.stringify(list), { headers: { 'Content-Type': 'application/json' } })
  );
}

const absolute = (u: string) => new URL(u, window.location.origin).toString();

export async function saveLesson(lesson: Omit<SavedLesson, 'savedAt'>, onProgress?: (done: number, total: number) => void) {
  // Demande au téléphone de ne pas effacer ces cours quand l'espace manque.
  try { await navigator.storage?.persist?.(); } catch {}
  const pages = await caches.open(PAGES_CACHE);
  const audio = await caches.open(AUDIO_CACHE);
  const total = lesson.audio.length + 1;
  let done = 0;

  const page = await fetch(lesson.path, { credentials: 'include' });
  if (!page.ok || page.redirected) throw new Error('page');
  await pages.put(absolute(lesson.path), page);
  onProgress?.(++done, total);

  const failed: string[] = [];
  for (const src of lesson.audio) {
    try {
      const sameOrigin = new URL(src, window.location.origin).origin === window.location.origin;
      const res = await fetch(src, sameOrigin ? {} : { mode: 'cors' });
      if (!res.ok || res.status === 206) throw new Error(String(res.status));
      await audio.put(absolute(src), res);
    } catch {
      failed.push(src);
    }
    onProgress?.(++done, total);
  }

  const list = (await listSavedLessons()).filter((l) => l.id !== lesson.id);
  list.push({ ...lesson, audio: lesson.audio.filter((a) => !failed.includes(a)), savedAt: new Date().toISOString() });
  await writeList(list.sort((a, b) => a.id - b.id));
  return { failed };
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

/** À appeler à la déconnexion : efface les cours enregistrés sur l'appareil. */
export async function clearOfflineData() {
  if (!offlineSupported()) return;
  await Promise.all([caches.delete(PAGES_CACHE), caches.delete(AUDIO_CACHE), caches.delete(META_CACHE)]);
}
