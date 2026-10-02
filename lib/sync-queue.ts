'use client';

// File d'attente des résultats de quiz faits sans connexion.
// Les résultats sont gardés sur l'appareil puis envoyés automatiquement au retour du réseau.

const KEY = 'savoiria-quiz-queue';
export const SYNC_EVENT = 'savoiria-sync-change';

export interface QueuedAttempt {
  clientId: string;
  quizId: string;
  answers: Record<string, string>;
  takenAt: string;
}

function read(): QueuedAttempt[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}
function write(list: QueuedAttempt[]) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch {}
  window.dispatchEvent(new Event(SYNC_EVENT));
}

export const pendingCount = () => (typeof window === 'undefined' ? 0 : read().length);

async function send(a: QueuedAttempt): Promise<'ok' | 'retry' | 'drop'> {
  try {
    const res = await fetch('/api/quiz/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quizId: a.quizId, answers: a.answers, takenAt: a.takenAt, queued: true }),
    });
    if (res.ok) return 'ok';
    if (res.status === 400 || res.status === 404) return 'drop'; // quiz supprimé : inutile de réessayer
    return 'retry'; // 401 (session expirée), 500, etc.
  } catch {
    return 'retry';
  }
}

/** Envoie un résultat ; s'il n'y a pas de réseau, il est mis de côté. Renvoie true si envoyé tout de suite. */
export async function submitQuizAttempt(quizId: string, answers: Record<string, string>): Promise<boolean> {
  const a: QueuedAttempt = {
    clientId: (crypto as any).randomUUID?.() ?? String(Date.now() + Math.random()),
    quizId,
    answers,
    takenAt: new Date().toISOString(),
  };
  if (navigator.onLine && (await send(a)) === 'ok') return true;
  write([...read(), a]);
  return false;
}

let flushing = false;
/** Envoie tout ce qui attend. Renvoie le nombre de résultats synchronisés. */
export async function flushQueue(): Promise<number> {
  if (flushing || !navigator.onLine) return 0;
  flushing = true;
  let sent = 0;
  try {
    for (const a of read()) {
      const r = await send(a);
      if (r === 'retry') break; // réseau ou session : on réessaiera plus tard
      write(read().filter((x) => x.clientId !== a.clientId));
      if (r === 'ok') sent++;
    }
  } finally {
    flushing = false;
  }
  return sent;
}

/** Vide la file (à la déconnexion). */
export function clearQueue() {
  write([]);
}
