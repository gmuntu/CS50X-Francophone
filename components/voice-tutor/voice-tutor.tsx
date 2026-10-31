'use client';

import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Loader2, Volume2, AlertTriangle } from 'lucide-react';
import { useGeminiLive } from '@/hooks/useGeminiLive';
import { detecterMode, demanderSocrateLocal, demanderSocrateSite, pcm16VersWav, ORDINATEUR_LOCAL, type ModeSocrate } from '@/lib/socrate-local';

interface Props {
  moduleId: number;
  /** Contexte fourni directement (formations SavoirIA) : pas de chargement CS50. */
  context?: string;
  systemPrompt?: string;
  idleLabel?: string;
  hint?: string;
  /** Appelé quand la conversation démarre (ex. mettre la vidéo en pause). */
  onActive?: () => void;
}

const LABELS = {
  idle: 'Parler avec Socrate',
  connecting: 'Connexion…',
  listening: 'Je vous écoute…',
  speaking: 'Socrate parle…',
  error: 'Réessayer',
} as const;

export default function VoiceTutor({ moduleId, onActive, context: given, systemPrompt, idleLabel, hint }: Props) {
  const [context, setContext] = useState(given ?? '');

  useEffect(() => {
    if (given !== undefined) { setContext(given); return; }
    let alive = true;
    fetch(`/api/transcript-beta?module=${moduleId}`)
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        setContext(j?.context ?? '');
        try { localStorage.setItem(`socrate-contexte-${moduleId}`, String(j?.context ?? '').slice(0, 4000)); } catch {}
      })
      .catch(() => {
        // Sans Internet : on reprend le contexte gardé lors de la dernière visite.
        let garde = '';
        try { garde = localStorage.getItem(`socrate-contexte-${moduleId}`) ?? ''; } catch {}
        if (alive) setContext(garde);
      });
    return () => { alive = false; };
  }, [moduleId, given]);

  const { status, error, start, stop } = useGeminiLive(context, systemPrompt);

  // Socrate hors ligne : 'en-ligne' (Gemini Live), 'local' (ordinateur SavoirIA), 'pause'
  const [mode, setMode] = useState<ModeSocrate>('en-ligne');
  useEffect(() => {
    let actif = true;
    // Sur l'ordinateur SavoirIA, la conversation vocale passe toujours par Gemma + Whisper + Piper.
    const verifier = async () => { const m = ORDINATEUR_LOCAL ? 'local' : await detecterMode(); if (actif) setMode(m); };
    verifier();
    window.addEventListener('online', verifier);
    window.addEventListener('offline', verifier);
    return () => { actif = false; window.removeEventListener('online', verifier); window.removeEventListener('offline', verifier); };
  }, []);
  const active = status === 'connecting' || status === 'listening' || status === 'speaking';

  useEffect(() => { if (active) onActive?.(); }, [active, onActive]);
  // Changer de semaine coupe la conversation en cours.
  useEffect(() => () => stop(), [moduleId, stop]);

  const Icon = status === 'connecting' ? Loader2
    : status === 'speaking' ? Volume2
    : status === 'error' ? AlertTriangle
    : active ? MicOff : Mic;

  const color = status === 'listening' ? 'bg-emerald-600 hover:bg-emerald-700 animate-pulse'
    : status === 'speaking' ? 'bg-[#7c3aed] hover:bg-[#6d28d9]'
    : status === 'error' ? 'bg-amber-600 hover:bg-amber-700'
    : 'bg-primary hover:bg-primary/90';

  if (mode !== 'en-ligne') return <SocrateLocal mode={mode} context={context} moduleId={moduleId} onActive={onActive} />;

  return (
    <div className="flex flex-col gap-2 p-4 rounded-2xl border border-border/80 bg-card">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => (active ? stop() : start())}
          className={`px-5 py-3 rounded-xl text-sm font-bold text-white flex items-center gap-2 transition-all ${color}`}
          aria-pressed={active}
        >
          <Icon className={`w-4 h-4 ${status === 'connecting' ? 'animate-spin' : ''}`} />
          {status === 'idle' && idleLabel ? idleLabel : LABELS[status]}
        </button>
        {active && (
          <button type="button" onClick={stop} className="text-xs underline text-muted-foreground">
            Terminer
          </button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {error ?? hint ?? 'Conversation vocale en direct. Parlez naturellement, vous pouvez interrompre Socrate.'}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Socrate vocal sur l'ordinateur SavoirIA (sans Internet) : appuyer pour parler,
// appuyer encore pour envoyer ; Socrate répond phrase par phrase, à voix haute.
function SocrateLocal({ mode, context, moduleId, onActive }: { mode: ModeSocrate; context: string; moduleId: number; onActive?: () => void }) {
  const [etat, setEtat] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const [question, setQuestion] = useState('');
  const [reponse, setReponse] = useState('');
  const rec = useRef<MediaRecorder | null>(null);
  const ctxAudio = useRef<AudioContext | null>(null);

  const jouer = async (b64: string) => {
    const AC: any = (window as any).AudioContext || (window as any).webkitAudioContext;
    ctxAudio.current = ctxAudio.current ?? new AC();
    const ctx = ctxAudio.current!;
    if (ctx.state !== 'running') await ctx.resume().catch(() => {});
    const octets = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const buf: AudioBuffer = await new Promise((ok, ko) => ctx.decodeAudioData(octets.buffer, ok, ko));
    await new Promise<void>((fin) => { const src = ctx.createBufferSource(); src.buffer = buf; src.connect(ctx.destination); src.onended = () => fin(); src.start(0); });
  };

  const versPcm16 = async (blob: Blob): Promise<string> => {
    const AC: any = (window as any).AudioContext || (window as any).webkitAudioContext;
    const ctx = new AC();
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
  };

  const envoyer = async (audioWav: string) => {
    setEtat('thinking'); setQuestion(''); setReponse('');
    let file = Promise.resolve();
    try {
      // Sur l'ordinateur SavoirIA : le site lui-même (Whisper + Gemma + voix) ; sinon le petit serveur vocal local.
      await (ORDINATEUR_LOCAL ? demanderSocrateSite : demanderSocrateLocal)(
        { audio: audioWav, contexte: context, moduleId },
        (q) => setQuestion(q),
        (phrase, audio) => {
          setReponse((r) => (r ? `${r} ${phrase}` : phrase));
          if (audio) file = file.then(() => { setEtat('speaking'); return jouer(audio).catch(() => {}); });
        },
      );
      await file;
    } catch {
      setReponse("Socrate ne répond pas sur cet ordinateur. Ferme puis rouvre SavoirIA.");
    }
    setEtat('idle');
  };

  const basculer = async () => {
    if (mode !== 'local' || etat === 'thinking' || etat === 'speaking') return;
    if (rec.current) { rec.current.stop(); return; }
    try {
      const flux = await navigator.mediaDevices.getUserMedia({ audio: true });
      const r = new MediaRecorder(flux);
      const morceaux: Blob[] = [];
      r.ondataavailable = (e) => e.data.size && morceaux.push(e.data);
      r.onstop = async () => {
        flux.getTracks().forEach((t) => t.stop()); rec.current = null;
        try { await envoyer(pcm16VersWav(await versPcm16(new Blob(morceaux, { type: r.mimeType })))); }
        catch { setReponse("Je n'ai pas bien entendu. Réessaie."); setEtat('idle'); }
      };
      rec.current = r; r.start(); setEtat('listening'); onActive?.();
      // 20 s au plus sur le poste : la route /api/stt refuse les enregistrements plus longs.
      setTimeout(() => rec.current === r && r.stop(), ORDINATEUR_LOCAL ? 20000 : 30000);
    } catch {
      setReponse("Impossible d'accéder au micro de cet ordinateur.");
    }
  };

  if (mode === 'pause') {
    return (
      <div className="flex flex-col gap-2 p-4 rounded-2xl border border-rose-200 bg-rose-50">
        <p className="text-sm font-bold text-rose-800">✈ Pas d&apos;Internet : Socrate est en pause sur cet appareil.</p>
        <p className="text-xs text-rose-700">Tu peux revoir la vidéo enregistrée. Socrate reviendra dès que tu seras connecté.</p>
      </div>
    );
  }

  const libelle = { idle: 'Parler avec Socrate', listening: 'Je t\'écoute… (appuie pour envoyer)', thinking: 'Socrate réfléchit…', speaking: 'Socrate parle…' }[etat];
  const couleur = etat === 'listening' ? 'bg-rose-600 animate-pulse' : etat === 'speaking' ? 'bg-[#7c3aed]' : etat === 'thinking' ? 'bg-slate-400' : 'bg-primary hover:bg-primary/90';
  return (
    <div className="flex flex-col gap-2 p-4 rounded-2xl border border-amber-200 bg-card">
      <span className="self-start text-[10px] font-bold text-amber-700 bg-amber-500/15 px-2 py-0.5 rounded-full">✈ Socrate local · sans Internet</span>
      <button type="button" onClick={basculer} className={`self-start px-5 py-3 rounded-xl text-sm font-bold text-white flex items-center gap-2 transition-all ${couleur}`}>
        {etat === 'thinking' ? <Loader2 className="w-4 h-4 animate-spin" /> : etat === 'speaking' ? <Volume2 className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        {libelle}
      </button>
      {question && <p className="text-xs"><span className="font-bold">Toi :</span> {question}</p>}
      {reponse && <p className="text-sm bg-muted/40 rounded-xl p-3"><span className="font-bold">Socrate :</span> {reponse}</p>}
      <p className="text-xs text-muted-foreground">Pas d&apos;Internet : Socrate t&apos;aide grâce à cet ordinateur. Appuie pour parler, appuie encore quand tu as fini.</p>
    </div>
  );
}
