// SavoirIA LOCAL — toute l'IA du site tourne sur l'ordinateur, sans Internet.
//
// Quand SAVOIRIA_LOCAL=1, les appels du site vers les services Google sont détournés :
//   - Gemini (texte, réponses de Socrate, génération de contenu)  -> Gemma 4 via Ollama
//   - Google Text-to-Speech / Gemini-TTS (voix, podcasts)          -> Piper (voix d'homme / de femme)
//   - Google Speech-to-Text (micro)                                 -> Whisper (whisper.cpp)
// Le reste du code ne change pas : il croit parler à Google.

import { spawn } from 'node:child_process';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const DOSSIER = process.env.SAVOIRIA_DOSSIER || '/opt/savoiria';
const OLLAMA = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
const MODELE = process.env.MODELE || 'gemma4:e2b';
const PIPER = `${DOSSIER}/piper-venv/bin/piper`;
// Voix naturelle (Qwen3-TTS) servie sur cet ordinateur, si elle est installée. Sinon : Piper.
const VOIX_LOCALE = process.env.VOIX_LOCALE_URL?.trim().replace(/\/$/, '') || '';
const VOIX_HOMME = `${DOSSIER}/voix/socrate.onnx`;
const VOIX_FEMME = `${DOSSIER}/voix/etudiante.onnx`;
const WHISPER = `${DOSSIER}/whisper/build/bin/whisper-cli`;
const WHISPER_MODELE = process.env.WHISPER_MODELE || `${DOSSIER}/whisper/models/ggml-base.bin`;

type Part = { text?: string };
type Content = { role?: string; parts?: Part[] };

// Une seule tâche lourde à la fois (Whisper, Piper) : un ordinateur de 8 Go ne doit pas saturer.
let file: Promise<unknown> = Promise.resolve();
function unAUn<T>(tache: () => Promise<T>): Promise<T> {
  const suite = file.then(tache, tache);
  file = suite.catch(() => undefined);
  return suite;
}
const AUDIO_MAX = 10 * 1024 * 1024; // 10 Mo
const DELAI_GEMMA = 120_000;

function executer(cmd: string, args: string[], entree?: string, delaiMs = 180_000): Promise<string> {
  return unAUn(() => new Promise<string>((ok, ko) => {
    // stderr ignoré : s'il se remplissait, le programme resterait bloqué
    const p = spawn(cmd, args, { stdio: ['pipe', 'pipe', 'ignore'] });
    let sortie = '';
    const t = setTimeout(() => { p.kill('SIGKILL'); ko(new Error('délai dépassé')); }, delaiMs);
    p.stdout.on('data', (d) => (sortie += d));
    p.on('error', (e) => { clearTimeout(t); ko(e); });
    p.on('close', (code) => { clearTimeout(t); code === 0 ? ok(sortie) : ko(new Error(`${cmd} : code ${code}`)); });
    p.stdin.end(entree ?? '');
  }));
}

// ---------- Gemini -> Gemma (Ollama) ----------
function versMessagesOllama(corps: any) {
  const messages: { role: string; content: string }[] = [];
  const sys = (corps?.systemInstruction?.parts ?? corps?.system_instruction?.parts ?? [])
    .map((p: Part) => p.text ?? '').join('\n').trim();
  if (sys) messages.push({ role: 'system', content: sys });
  for (const c of (corps?.contents ?? []) as Content[]) {
    const texte = (c.parts ?? []).map((p) => p.text ?? '').join('\n');
    if (texte) messages.push({ role: c.role === 'model' ? 'assistant' : 'user', content: texte });
  }
  return messages;
}

function optionsOllama(corps: any) {
  const g = corps?.generationConfig ?? {};
  return {
    temperature: g.temperature ?? 0.7,
    num_predict: Math.min(g.maxOutputTokens ?? 1024, 2048),
  };
}

/** Réponse claire quand Gemma ne répond pas (Ollama arrêté, ordinateur surchargé). */
const indisponible = () => new Response(
  JSON.stringify({ error: { code: 503, message: "L'IA locale (Gemma) ne répond pas. Redémarre l'ordinateur ou réessaie dans une minute." } }),
  { status: 503, headers: { 'Content-Type': 'application/json' } },
);

const enGemini = (texte: string) => ({
  candidates: [{ content: { role: 'model', parts: [{ text: texte }] }, finishReason: 'STOP' }],
});

async function gemmaComplet(corps: any): Promise<Response> {
  const json = corps?.generationConfig?.responseMimeType === 'application/json';
  const r = await fetch(`${OLLAMA}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODELE, messages: versMessagesOllama(corps), stream: false, think: false,
      keep_alive: '30m', options: optionsOllama(corps), ...(json ? { format: 'json' } : {}),
    }),
    signal: AbortSignal.timeout(DELAI_GEMMA),
  }).catch(() => null);
  const d = r ? await r.json().catch(() => ({})) : {};
  const texte = d?.message?.content ?? '';
  if (!r?.ok || !texte) return indisponible();
  return new Response(JSON.stringify(enGemini(texte)), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

async function gemmaFlux(corps: any): Promise<Response> {
  const r = await fetch(`${OLLAMA}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODELE, messages: versMessagesOllama(corps), stream: true, think: false,
      keep_alive: '30m', options: optionsOllama(corps),
    }),
    signal: AbortSignal.timeout(DELAI_GEMMA),
  }).catch(() => null);
  if (!r?.ok || !r.body) return indisponible();
  const lecteur = r.body.getReader();
  const dec = new TextDecoder();
  const enc = new TextEncoder();
  let reste = '';
  // Ollama envoie une ligne JSON par morceau ; on la ré-émet au format SSE de Gemini.
  // On lit jusqu'à avoir du texte à transmettre ou la fin : un pull qui ne transmet rien n'est
  // jamais rappelé, et la réponse resterait ouverte (dernier morceau d'Ollama : contenu vide).
  const flux = new ReadableStream({
    async pull(ctrl) {
      for (;;) {
        let morceau;
        try { morceau = await lecteur.read(); } catch { ctrl.close(); return; } // délai dépassé en cours de route
        const { value, done } = morceau;
        if (done) { ctrl.close(); return; }
        reste += dec.decode(value, { stream: true });
        const lignes = reste.split('\n');
        reste = lignes.pop() ?? '';
        let transmis = false;
        for (const l of lignes) {
          if (!l.trim()) continue;
          try {
            const m = JSON.parse(l);
            const t = m?.message?.content ?? '';
            if (t) { ctrl.enqueue(enc.encode(`data: ${JSON.stringify(enGemini(t))}\n\n`)); transmis = true; }
          } catch {}
        }
        if (transmis) return;
      }
    },
  });
  return new Response(flux, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
}

// ---------- Google TTS -> Piper ----------
async function piper(texte: string, femme: boolean): Promise<string> {
  const dossier = await mkdtemp(path.join(tmpdir(), 'savoiria-tts-'));
  try {
    const sortie = path.join(dossier, 'voix.wav');
    await executer(PIPER, ['--model', femme ? VOIX_FEMME : VOIX_HOMME, '--output_file', sortie], texte, 120_000);
    return (await readFile(sortie)).toString('base64');
  } finally {
    await rm(dossier, { recursive: true, force: true });
  }
}

/** Voix naturelle (serveur Qwen3-TTS de cet ordinateur) -> WAV en base64, ou null si indisponible. */
async function voixNaturelle(texte: string): Promise<string | null> {
  try {
    const r = await fetch(`${VOIX_LOCALE}/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texte: texte.slice(0, 2000) }),
      signal: AbortSignal.timeout(90_000),
    });
    if (!r.ok) return null;
    const audio = Buffer.from(await r.arrayBuffer());
    return audio.length > 44 ? audio.toString('base64') : null;
  } catch {
    return null;
  }
}

async function synthese(corps: any): Promise<Response> {
  const texte = String(corps?.input?.text ?? corps?.input?.ssml ?? '').replace(/<[^>]+>/g, ' ').slice(0, 4000);
  const nomVoix = String(corps?.voice?.name ?? '');
  // Les voix féminines du site (l'étudiante des podcasts) -> voix de femme ; tout le reste -> Socrate.
  const femme = /Aoede|Kore|Leda|Zephyr|Callirrhoe|Autonoe|Despina|Erinome|Laomedeia|Pulcherrima|Vindemiatrix|Achernar|Gacrux|Sulafat/i.test(nomVoix);
  // Socrate : d'abord la voix naturelle (Qwen3-TTS) ; si elle ne répond pas, Piper prend le relais.
  if (VOIX_LOCALE && !femme && texte.trim()) {
    const audio = await voixNaturelle(texte);
    if (audio) return new Response(JSON.stringify({ audioContent: audio }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  try {
    const audio = await piper(texte, femme);
    return new Response(JSON.stringify({ audioContent: audio }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: { message: `Piper : ${e?.message}` } }), { status: 502 });
  }
}

// ---------- Google STT -> Whisper ----------
function pcmVersWav(pcm: Buffer, taux: number): Buffer {
  const t = Buffer.alloc(44);
  t.write('RIFF', 0); t.writeUInt32LE(36 + pcm.length, 4); t.write('WAVE', 8); t.write('fmt ', 12);
  t.writeUInt32LE(16, 16); t.writeUInt16LE(1, 20); t.writeUInt16LE(1, 22); t.writeUInt32LE(taux, 24);
  t.writeUInt32LE(taux * 2, 28); t.writeUInt16LE(2, 32); t.writeUInt16LE(16, 34); t.write('data', 36); t.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([t, pcm]);
}

async function reconnaissance(corps: any): Promise<Response> {
  const dossier = await mkdtemp(path.join(tmpdir(), 'savoiria-stt-'));
  try {
    const contenu = String(corps?.audio?.content ?? '');
    if (contenu.length > AUDIO_MAX * 1.4) throw new Error('enregistrement trop long');
    const brut = Buffer.from(contenu, 'base64');
    const wav = brut.subarray(0, 4).toString() === 'RIFF' ? brut : pcmVersWav(brut, corps?.config?.sampleRateHertz || 16000);
    const fichier = path.join(dossier, 'q.wav');
    await writeFile(fichier, wav);
    const texte = (await executer(WHISPER, ['-m', WHISPER_MODELE, '-l', 'fr', '-nt', '-np', '-f', fichier]))
      .split(/\s+/).join(' ').trim();
    return new Response(JSON.stringify({ results: texte ? [{ alternatives: [{ transcript: texte }] }] : [] }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: { message: `Whisper : ${e?.message}` } }), { status: 502 });
  } finally {
    await rm(dossier, { recursive: true, force: true });
  }
}

/** Remplace fetch côté serveur pour envoyer les appels Google vers l'IA locale. */
export function activerIALocale() {
  const g = globalThis as any;
  if (g.__savoiriaLocal) return;
  g.__savoiriaLocal = true;
  const original: typeof fetch = g.fetch.bind(g);
  g.fetch = async (entree: any, init?: RequestInit) => {
    const url = typeof entree === 'string' ? entree : entree instanceof URL ? entree.href : entree?.url ?? '';
    const corpsTexte = typeof init?.body === 'string' ? init.body : '';
    const corps = () => { try { return JSON.parse(corpsTexte || '{}'); } catch { return {}; } };
    if (url.includes('generativelanguage.googleapis.com')) {
      if (url.includes(':streamGenerateContent')) return gemmaFlux(corps());
      if (url.includes(':generateContent')) return gemmaComplet(corps());
      return new Response(JSON.stringify({ models: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (url.includes('texttospeech.googleapis.com')) return synthese(corps());
    if (url.includes('speech.googleapis.com')) return reconnaissance(corps());
    return original(entree, init);
  };
  console.log(`[SavoirIA local] IA sur cet ordinateur : ${MODELE} + Whisper + Piper`);
}
