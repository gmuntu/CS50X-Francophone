// Socrate hors ligne : dialogue avec le petit serveur installé sur les ordinateurs SavoirIA
// (savoiria-voix.sh). Whisper (oreilles) -> Gemma (cerveau) -> Piper (voix), sans Internet.

export const SOCRATE_LOCAL = 'http://127.0.0.1:8765';

export type ModeSocrate = 'en-ligne' | 'local' | 'pause';

/** Vrai quand SavoirIA tourne sur l'ordinateur lui-même (installation hors ligne avec Gemma). */
export const ORDINATEUR_LOCAL = process.env.NEXT_PUBLIC_SAVOIRIA_LOCAL === '1';

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
  // Sur l'ordinateur SavoirIA, le serveur du site parle déjà à Gemma : le chemin normal fonctionne.
  if (ORDINATEUR_LOCAL) return 'en-ligne';
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
 * Sur l'ordinateur SavoirIA, le site a déjà Whisper, Gemma et la voix de Socrate :
 * on passe par ses routes (micro -> /api/stt, réponse -> /api/tutor, voix -> /api/speech).
 * Marche aussi depuis un autre appareil relié au poste par le Wi-Fi.
 */
export async function demanderSocrateSite(
  corps: { audio: string; contexte?: string; moduleId?: number },
  surQuestion: (texte: string) => void,
  surPhrase: (texte: string, audioB64: string) => void,
): Promise<void> {
  const stt = await fetch('/api/stt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ audio: corps.audio, format: 'pcm16' }),
  });
  const question = String((await stt.json().catch(() => ({})))?.transcript ?? '').trim();
  if (!stt.ok) throw new Error('Reconnaissance vocale indisponible');
  surQuestion(question);
  if (!question) { surPhrase("Je n'ai pas bien entendu. Réessaie en parlant un peu plus près du micro.", ''); return; }

  const contexte = (corps.contexte ?? '').slice(0, 2500);
  const r = await fetch('/api/tutor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      moduleId: corps.moduleId,
      messages: [{ role: 'user', content: contexte
        ? `(Question posée à voix haute : réponds en 2 à 4 phrases courtes, sans code ni liste.)\nContexte : ${contexte}\n\nQuestion : ${question}`
        : `(Question posée à voix haute : réponds en 2 à 4 phrases courtes, sans code ni liste.)\n${question}` }],
    }),
  });
  if (!r.ok || !r.body) throw new Error('Socrate indisponible');

  // Chaque phrase complète est lue dès qu'elle arrive, dans l'ordre.
  const dire = async (phrase: string) => {
    const texte = phrase.replace(/[*_#`>]/g, '').trim();
    if (!texte) return;
    let audio = '';
    try {
      const s = await fetch('/api/speech', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: texte }) });
      audio = String((await s.json().catch(() => ({})))?.audioContent ?? '');
    } catch {}
    surPhrase(texte, audio);
  };
  const lecteur = r.body.getReader();
  const dec = new TextDecoder();
  let reste = '';
  let texte = '';
  for (;;) {
    const { value, done } = await lecteur.read();
    if (done) break;
    reste += dec.decode(value, { stream: true });
    const lignes = reste.split('\n');
    reste = lignes.pop() ?? '';
    for (const l of lignes) {
      if (!l.startsWith('data: ') || l.includes('[DONE]')) continue;
      try { texte += JSON.parse(l.slice(6))?.choices?.[0]?.delta?.content ?? ''; } catch {}
    }
    const fin = texte.search(/[.!?…](\s|$)(?![\s\S]*[.!?…](\s|$))/);
    if (fin >= 0) { const phrases = texte.slice(0, fin + 1); texte = texte.slice(fin + 1); await dire(phrases); }
  }
  await dire(texte);
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
