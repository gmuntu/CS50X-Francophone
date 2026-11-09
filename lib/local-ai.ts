// SavoirIA LOCAL — toute l'IA du site tourne sur l'ordinateur, sans Internet.
//
// Quand SAVOIRIA_LOCAL=1, les appels du site vers les services Google sont détournés :
//   - Gemini (texte, réponses de Socrate, génération de contenu)  -> Gemma 4 via Ollama
//   - Google Text-to-Speech / Gemini-TTS (voix, podcasts)          -> Pocket TTS (voix naturelle), Piper en secours
//   - Google Speech-to-Text (micro)                                 -> Whisper (whisper.cpp)
// Le reste du code ne change pas : il croit parler à Google.

import { spawn } from 'node:child_process';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { texteVoixLocale } from '@/lib/voix-texte';

const DOSSIER = process.env.SAVOIRIA_DOSSIER || '/opt/savoiria';
const OLLAMA = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
const MODELE = process.env.MODELE || 'gemma4:e2b';
const PIPER = `${DOSSIER}/piper-venv/bin/piper`;
// Voix naturelle (Pocket TTS sur les postes Ubuntu, Qwen3-TTS sur Mac) servie sur cet ordinateur, si elle est installée. Sinon : Piper.
const VOIX_LOCALE = process.env.VOIX_LOCALE_URL?.trim().replace(/\/$/, '') || '';
const VOIX_HOMME = `${DOSSIER}/voix/socrate.onnx`;
const VOIX_FEMME = `${DOSSIER}/voix/etudiante.onnx`;
const WHISPER = `${DOSSIER}/whisper/build/bin/whisper-cli`;
const WHISPER_MODELE = process.env.WHISPER_MODELE || `${DOSSIER}/whisper/models/ggml-base.bin`;
const VOCABULAIRE_COURS = 'Socrate, cours CS50 en français : boucle while, boucle for, printf, variable, fonction, tableau, pointeur, langage C, Python, SQL.';

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
// Gemma reste en mémoire en permanence : sinon la première question après 30 min d'attente
// coûte 1 à 2 minutes de chargement. Sur un ordinateur d'école, il ne sert qu'à SavoirIA.
const GARDER = -1;

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

// Gemma au travail : la préparation des podcasts se met en pause, le processeur est pour l'élève.
// Compteur gardé sur globalThis : le même pour toutes les pages du site (/api/tutor/prechauffer le lit).
const G = globalThis as any;
G.__savoiriaGemmaActives ??= 0;
function signalerVoix(occupe: boolean) {
  if (!VOIX_LOCALE) return;
  fetch(`${VOIX_LOCALE}/gemma`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ occupe }), signal: AbortSignal.timeout(2000),
  }).catch(() => {});
}
function debutGemma(corps: any): () => void {
  // Une autre demande que la lecture à l'avance remplace le contexte que Gemma garde en mémoire.
  if (!corps?.prechauffage) G.__savoiriaDernierPrechauffage = undefined;
  if (G.__savoiriaGemmaActives++ === 0) signalerVoix(true);
  let fini = false;
  return () => {
    if (fini) return;
    fini = true;
    if (--G.__savoiriaGemmaActives === 0) signalerVoix(false);
  };
}

async function gemmaComplet(corps: any): Promise<Response> {
  const fin = debutGemma(corps);
  try { return await gemmaCompletTache(corps); } finally { fin(); }
}

async function gemmaCompletTache(corps: any): Promise<Response> {
  const json = corps?.generationConfig?.responseMimeType === 'application/json';
  const r = await fetch(`${OLLAMA}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODELE, messages: versMessagesOllama(corps), stream: false, think: false,
      keep_alive: GARDER, options: optionsOllama(corps), ...(json ? { format: 'json' } : {}),
    }),
    signal: AbortSignal.timeout(DELAI_GEMMA),
  }).catch(() => null);
  const d = r ? await r.json().catch(() => ({})) : {};
  const texte = d?.message?.content ?? '';
  if (!r?.ok || !texte) return indisponible();
  return new Response(JSON.stringify(enGemini(texte)), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

// En flux, on ne coupe pas une réponse longue : seulement si Gemma se tait trop longtemps
// (un petit ordinateur d'école met plus de 2 minutes à écrire une explication complète).
const SILENCE_GEMMA = 90_000;

async function gemmaFlux(corps: any): Promise<Response> {
  const fin = debutGemma(corps);
  const arret = new AbortController();
  let minuteur = setTimeout(() => arret.abort(), DELAI_GEMMA); // premier mot (modèle à charger)
  const relancer = () => { clearTimeout(minuteur); minuteur = setTimeout(() => arret.abort(), SILENCE_GEMMA); };
  const r = await fetch(`${OLLAMA}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODELE, messages: versMessagesOllama(corps), stream: true, think: false,
      keep_alive: GARDER, options: optionsOllama(corps),
    }),
    signal: arret.signal,
  }).catch(() => null);
  if (!r?.ok || !r.body) { clearTimeout(minuteur); fin(); return indisponible(); }
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
        try { morceau = await lecteur.read(); } catch { clearTimeout(minuteur); fin(); ctrl.close(); return; } // Gemma s'est tue trop longtemps
        const { value, done } = morceau;
        if (done) { clearTimeout(minuteur); fin(); ctrl.close(); return; }
        relancer();
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
    cancel() { clearTimeout(minuteur); fin(); arret.abort(); }, // l'élève a quitté la page : Gemma s'arrête
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

const VOIX_AUDIO_MAX = 20 * 1024 * 1024; // 20 Mo : bien plus que 2 minutes de voix

/**
 * Voix naturelle (serveur de voix de cet ordinateur) -> WAV en base64, ou null si indisponible.
 * `garder` : réplique de podcast, gardée sur le disque du poste (préparée à l'avance, rejouée aussitôt).
 */
async function voixNaturelle(texte: string, femme: boolean, garder: boolean): Promise<string | null> {
  try {
    const r = await fetch(`${VOIX_LOCALE}/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texte: texteVoixLocale(texte), voix: femme ? 'femme' : 'homme', garder }),
      // 60 s d'attente au plus dans la file du serveur, puis le calcul (environ le temps de la phrase).
      signal: AbortSignal.timeout(120_000),
    });
    if (!r.ok || Number(r.headers.get('content-length') ?? 0) > VOIX_AUDIO_MAX) return null;
    const audio = Buffer.from(await r.arrayBuffer());
    return audio.length > 44 && audio.length <= VOIX_AUDIO_MAX ? audio.toString('base64') : null;
  } catch {
    return null;
  }
}

async function synthese(corps: any): Promise<Response> {
  const texte = String(corps?.input?.text ?? corps?.input?.ssml ?? '').replace(/<[^>]+>/g, ' ').slice(0, 4000);
  const nomVoix = String(corps?.voice?.name ?? '');
  // Les voix féminines du site (l'étudiante des podcasts) -> voix de femme ; tout le reste -> Socrate.
  const femme = /Aoede|Kore|Leda|Zephyr|Callirrhoe|Autonoe|Despina|Erinome|Laomedeia|Pulcherrima|Vindemiatrix|Achernar|Gacrux|Sulafat/i.test(nomVoix);
  // D'abord la voix naturelle (Socrate / l'étudiante) ; si elle ne répond pas, Piper prend le relais.
  if (VOIX_LOCALE && texte.trim()) {
    // Une consigne de style n'accompagne que les répliques de podcast (Gemini-TTS) : celles-là sont gardées.
    const audio = await voixNaturelle(texte, femme, Boolean(corps?.input?.prompt));
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
    // -ng : processeur seul (sur Mac, préparer la puce graphique prenait ~20 s à chaque question) ;
    // --prompt : vocabulaire du cours, pour que « while », « printf »… soient bien reconnus.
    const texte = (await executer(WHISPER, ['-m', WHISPER_MODELE, '-l', 'fr', '-nt', '-np', '-ng', '--prompt', VOCABULAIRE_COURS, '-f', fichier]))
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
  console.log(`[SavoirIA local] IA sur cet ordinateur : ${MODELE} + Whisper + ${VOIX_LOCALE ? "voix naturelle" : "Piper"}`);
  // Charge Gemma dès le démarrage, pour que la première question d'un élève ne l'attende pas.
  original(`${OLLAMA}/api/generate`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODELE, keep_alive: GARDER }),
  }).catch(() => {});
}
