// Conversation à voix haute avec Socrate sur un ordinateur SavoirIA (sans Internet).
// Deux déroulements :
//  - « suivi » (Demande au prof) : comme en ligne sur /agora. Un clic lance la conversation ; Socrate répond
//    quand l'élève se tait, puis écoute à nouveau tout seul ; il se souvient des échanges précédents.
//  - tour par tour (autres pages) : appuyer pour parler, appuyer encore pour envoyer.
// Ce fichier ne s'exécute que dans le navigateur.
import { pcm16VersWav } from '@/lib/socrate-local';

export type EtatConversation = 'idle' | 'listening' | 'thinking' | 'speaking';
export type Tour = { role: 'user' | 'assistant'; content: string };

export interface OptionsConversation {
  suivi: boolean;
  /** Durée maximale d'un enregistrement (la reconnaissance vocale refuse les enregistrements plus longs). */
  dureeMaxMs: number;
  /** Pose la question (audio WAV en base64) ; la réponse arrive phrase par phrase, chacune avec sa voix. */
  demander: (
    audioWav: string,
    historique: Tour[],
    surQuestion: (texte: string) => void,
    surPhrase: (texte: string, audioB64: string) => void,
    signal: AbortSignal,
  ) => Promise<void>;
  surEtat: (etat: EtatConversation) => void;
  surQuestion: (texte: string) => void;
  surReponse: (texte: string) => void;
  /** Appelé chaque fois que l'écoute commence (ex. mettre la vidéo en pause). */
  surEcoute?: () => void;
}

/** Nombre de messages gardés en mémoire (6 échanges) : assez pour suivre le fil, court à relire pour Gemma. */
export const MEMOIRE_MAX = 12;
// Fin de parole : 1,5 s de silence après avoir parlé. Personne ne parle pendant 12 s : la conversation s'arrête.
const SILENCE_FIN_MS = 1500;
const SILENCE_TOTAL_MS = 12000;

/** Ajoute un échange à la mémoire de la conversation, en ne gardant que les plus récents. */
export function memoriser(historique: Tour[], question: string, reponse: string): Tour[] {
  if (!question.trim() || !reponse.trim()) return historique;
  return [...historique, { role: 'user' as const, content: question.trim() }, { role: 'assistant' as const, content: reponse.trim() }].slice(-MEMOIRE_MAX);
}

/**
 * Décide, à partir du volume mesuré toutes les 100 ms, si l'élève a fini de parler.
 * Renvoie 'fin' (il a parlé puis s'est tu), 'personne' (silence complet trop long) ou null (on continue).
 */
export function creerDetecteurDeSilence(maintenant: () => number = Date.now) {
  const debut = maintenant();
  let mesures = 0, bruit = 0, seuil = 0.02, sonsForts = 0, aParle = false, dernierSon = debut;
  return (volume: number): 'fin' | 'personne' | null => {
    const t = maintenant();
    // Les trois premières mesures donnent le bruit de la salle ; la voix doit le dépasser nettement.
    if (mesures < 3) { bruit += volume / 3; mesures++; if (mesures === 3) seuil = Math.min(0.06, Math.max(0.015, bruit * 3)); return null; }
    if (volume > seuil) { sonsForts++; dernierSon = t; if (sonsForts >= 3) aParle = true; }
    if (aParle && t - dernierSon > SILENCE_FIN_MS) return 'fin';
    if (!aParle && t - debut > SILENCE_TOTAL_MS) return 'personne';
    return null;
  };
}

function nouveauContexteAudio(): AudioContext {
  const AC: typeof AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
  return new AC();
}

/** Écoute le micro et prévient quand l'élève a fini de parler. Renvoie la fonction qui arrête la surveillance. */
function surveillerSilence(flux: MediaStream, surFin: () => void, surPersonne: () => void): () => void {
  let ctx: AudioContext;
  try { ctx = nouveauContexteAudio(); } catch { return () => {}; }
  ctx.resume?.().catch(() => {});
  const analyseur = ctx.createAnalyser();
  analyseur.fftSize = 1024;
  ctx.createMediaStreamSource(flux).connect(analyseur);
  const tampon = new Uint8Array(analyseur.fftSize);
  const detecteur = creerDetecteurDeSilence();
  const minuterie = setInterval(() => {
    analyseur.getByteTimeDomainData(tampon);
    let somme = 0;
    for (let i = 0; i < tampon.length; i++) { const v = (tampon[i] - 128) / 128; somme += v * v; }
    const verdict = detecteur(Math.sqrt(somme / tampon.length));
    if (verdict === 'fin') surFin();
    else if (verdict === 'personne') surPersonne();
  }, 100);
  return () => { clearInterval(minuterie); ctx.close?.().catch(() => {}); };
}

/** Convertit un enregistrement du navigateur en PCM 16 bits, 16 kHz (base64). */
async function versPcm16(blob: Blob): Promise<string> {
  const ctx = nouveauContexteAudio();
  try {
    const donnees = await blob.arrayBuffer();
    const decode: AudioBuffer = await new Promise((ok, ko) => ctx.decodeAudioData(donnees, ok, ko));
    const off = new OfflineAudioContext(1, Math.ceil(decode.duration * 16000), 16000);
    const src = off.createBufferSource(); src.buffer = decode; src.connect(off.destination); src.start();
    const out = (await off.startRendering()).getChannelData(0);
    const b = new Uint8Array(out.length * 2); const v = new DataView(b.buffer);
    for (let i = 0; i < out.length; i++) v.setInt16(i * 2, Math.max(-1, Math.min(1, out[i])) * 0x7fff, true);
    let bin = ''; for (let i = 0; i < b.length; i += 0x8000) bin += String.fromCharCode(...b.subarray(i, i + 0x8000));
    return btoa(bin);
  } finally { ctx.close?.(); }
}

export function creerConversation(o: OptionsConversation) {
  let etat: EtatConversation = 'idle';
  let active = false;                 // une conversation est en cours
  let enregistreur: MediaRecorder | null = null;
  let jeter = false;                  // l'enregistrement en cours ne doit pas être envoyé
  let arreterSurveillance: (() => void) | null = null;
  let lecteur: AudioContext | null = null;
  let source: AudioBufferSourceNode | null = null;
  let envoi: AbortController | null = null;
  let tour = 0;                       // change à chaque nouvelle question ou interruption : une réponse coupée est ignorée
  let historique: Tour[] = [];
  let nonEntendus = 0;

  const passer = (e: EtatConversation) => { etat = e; o.surEtat(e); };
  const finir = () => { active = false; passer('idle'); };

  const jouer = async (b64: string, monTour: number) => {
    if (monTour !== tour) return;
    lecteur = lecteur ?? nouveauContexteAudio();
    const ctx = lecteur;
    if (ctx.state !== 'running') await ctx.resume().catch(() => {});
    const octets = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const tampon: AudioBuffer = await new Promise((ok, ko) => ctx.decodeAudioData(octets.buffer, ok, ko));
    if (monTour !== tour) return;
    await new Promise<void>((fin) => {
      const src = ctx.createBufferSource(); src.buffer = tampon; src.connect(ctx.destination);
      src.onended = () => { if (source === src) source = null; fin(); };
      source = src; src.start(0);
    });
  };

  /** Fait taire Socrate et abandonne la réponse en cours. */
  const couper = () => {
    tour++;
    try { envoi?.abort(); } catch {}
    envoi = null;
    try { source?.stop(); } catch {}
    source = null;
  };

  const envoyer = async (audioWav: string) => {
    const monTour = ++tour;
    const signal = (envoi = new AbortController()).signal;
    passer('thinking'); o.surQuestion(''); o.surReponse('');
    let question = '', reponse = '';
    let file: Promise<void> = Promise.resolve();
    try {
      await o.demander(audioWav, historique,
        (q) => { question = q; if (monTour === tour) o.surQuestion(q); },
        (phrase, audio) => {
          if (monTour !== tour) return;
          reponse = reponse ? `${reponse} ${phrase}` : phrase;
          o.surReponse(reponse);
          if (audio) file = file.then(() => { if (monTour !== tour) return; passer('speaking'); return jouer(audio, monTour).catch(() => {}); });
        }, signal);
      await file;
    } catch {
      if (monTour === tour) o.surReponse('Socrate ne répond pas sur cet ordinateur. Ferme puis rouvre SavoirIA.');
      reponse = '';
    }
    if (o.suivi) historique = memoriser(historique, question, reponse);
    if (monTour !== tour) return;     // interrompu : l'écoute a déjà repris, ou la conversation est terminée
    nonEntendus = question ? 0 : nonEntendus + 1;
    // Conversation suivie : Socrate écoute à nouveau. Deux fois de suite sans rien comprendre : on s'arrête.
    if (o.suivi && active && reponse && nonEntendus < 2) void ecouter(); else finir();
  };

  const ecouter = async () => {
    let flux: MediaStream;
    try {
      flux = await navigator.mediaDevices.getUserMedia({ audio: o.suivi ? { echoCancellation: true, noiseSuppression: true, channelCount: 1 } : true });
    } catch {
      finir();
      o.surReponse("Impossible d'accéder au micro de cet ordinateur.");
      return;
    }
    if (!active) { flux.getTracks().forEach((t) => t.stop()); return; }   // terminé pendant l'ouverture du micro
    const r = new MediaRecorder(flux);
    const morceaux: Blob[] = [];
    jeter = false;
    r.ondataavailable = (e) => { if (e.data.size) morceaux.push(e.data); };
    r.onstop = async () => {
      arreterSurveillance?.(); arreterSurveillance = null;
      flux.getTracks().forEach((t) => t.stop());
      if (enregistreur === r) enregistreur = null;
      if (jeter) return;
      try { await envoyer(pcm16VersWav(await versPcm16(new Blob(morceaux, { type: r.mimeType })))); }
      catch { o.surReponse("Je n'ai pas bien entendu. Réessaie."); finir(); }
    };
    enregistreur = r; r.start(); passer('listening'); o.surEcoute?.();
    const arreter = () => { if (enregistreur === r && r.state !== 'inactive') r.stop(); };
    const limite = setTimeout(arreter, o.dureeMaxMs);
    const finSurveillance = o.suivi ? surveillerSilence(flux, arreter, () => { if (enregistreur === r) terminer(); }) : () => {};
    arreterSurveillance = () => { clearTimeout(limite); finSurveillance(); };
  };

  /** Met fin à la conversation : micro fermé, Socrate se tait. */
  const terminer = () => {
    active = false;
    jeter = true;
    couper();
    if (enregistreur && enregistreur.state !== 'inactive') enregistreur.stop();
    else { arreterSurveillance?.(); arreterSurveillance = null; }
    passer('idle');
  };

  /** Le bouton principal : commencer, envoyer ce qu'on vient de dire, ou (conversation suivie) interrompre Socrate. */
  const basculer = () => {
    if (etat === 'thinking') return;
    if (etat === 'speaking') { if (o.suivi) { couper(); void ecouter(); } return; }
    if (etat === 'listening') { if (enregistreur && enregistreur.state !== 'inactive') enregistreur.stop(); return; }
    active = true; nonEntendus = 0;
    if (o.suivi) historique = [];     // chaque conversation repart de zéro, comme en ligne
    void ecouter();
  };

  return { basculer, terminer };
}

export type Conversation = ReturnType<typeof creerConversation>;
