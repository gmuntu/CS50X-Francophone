// Socrate hors ligne : dialogue avec le petit serveur installé sur les ordinateurs SavoirIA
// (savoiria-voix.sh). Whisper (oreilles) -> Gemma (cerveau) -> Piper (voix), sans Internet.

export const SOCRATE_LOCAL = 'http://127.0.0.1:8765';

export type ModeSocrate = 'en-ligne' | 'local' | 'pause';

/** Vrai si l'ordinateur a un Socrate local qui répond. */
export async function socrateLocalDisponible(delaiMs = 1500): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), delaiMs);
  try {
    const r = await fetch(`${SOCRATE_LOCAL}/sante`, { signal: ctrl.signal, cache: 'no-store' });
    return r.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

/** Choisit le bon « cerveau » : Internet -> Gemini ; sinon Socrate local s'il existe ; sinon pause. */
export async function detecterMode(): Promise<ModeSocrate> {
  if (typeof navigator !== 'undefined' && navigator.onLine) return 'en-ligne';
  return (await socrateLocalDisponible()) ? 'local' : 'pause';
}

/** Ajoute un en-tête WAV à du PCM 16 bits mono (base64) -> WAV base64 pour Whisper. */
export function pcm16VersWav(pcmB64: string, taux = 16000): string {
  const pcm = Uint8Array.from(atob(pcmB64), (c) => c.charCodeAt(0));
  const buf = new ArrayBuffer(44 + pcm.length);
  const v = new DataView(buf);
  const ecrire = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  ecrire(0, 'RIFF'); v.setUint32(4, 36 + pcm.length, true); ecrire(8, 'WAVE'); ecrire(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, taux, true); v.setUint32(28, taux * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  ecrire(36, 'data'); v.setUint32(40, pcm.length, true);
  new Uint8Array(buf, 44).set(pcm);
  let bin = '';
  const o = new Uint8Array(buf);
  for (let i = 0; i < o.length; i += 0x8000) bin += String.fromCharCode(...o.subarray(i, i + 0x8000));
  return btoa(bin);
}

/**
 * Pose une question au Socrate local. La réponse arrive phrase par phrase,
 * chacune avec son audio (voix de Socrate) prêt à jouer.
 */
export async function demanderSocrateLocal(
  corps: { texte?: string; audio?: string; contexte?: string },
  surQuestion: (texte: string) => void,
  surPhrase: (texte: string, audioB64: string) => void,
): Promise<void> {
  const r = await fetch(`${SOCRATE_LOCAL}/demander-flux`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corps),
  });
  if (!r.ok || !r.body) throw new Error('Socrate local indisponible');
  const lecteur = r.body.getReader();
  const dec = new TextDecoder();
  let reste = '';
  while (true) {
    const { value, done } = await lecteur.read();
    if (done) break;
    reste += dec.decode(value, { stream: true });
    const lignes = reste.split('\n');
    reste = lignes.pop() ?? '';
    for (const l of lignes) {
      if (!l.trim()) continue;
      const e = JSON.parse(l);
      if (e.type === 'question') surQuestion(e.texte ?? '');
      if (e.type === 'phrase') surPhrase(e.texte ?? '', e.audio ?? '');
    }
  }
}

// Questions notées sans Internet ni Socrate local : on les garde pour plus tard.
const CLE = 'socrate-questions-en-attente';
export function noterQuestion(question: string, module: string) {
  try {
    const liste = JSON.parse(localStorage.getItem(CLE) || '[]');
    liste.push({ question, module, date: new Date().toISOString() });
    localStorage.setItem(CLE, JSON.stringify(liste));
  } catch {}
}
export function questionsEnAttente(): { question: string; module: string }[] {
  try { return JSON.parse(localStorage.getItem(CLE) || '[]'); } catch { return []; }
}
export function viderQuestionsEnAttente() {
  try { localStorage.removeItem(CLE); } catch {}
}
