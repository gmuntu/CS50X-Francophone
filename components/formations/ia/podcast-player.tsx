'use client';

import { useRef, useState } from 'react';
import { Headphones, Square, Loader2 } from 'lucide-react';
import type { IaLine } from '@/lib/courses/ia-essentiels';
import { generatedAudioKey, readGeneratedAudio } from '@/lib/offline';

// Podcast à deux voix (Socrate et l'étudiante), synthétisé réplique par réplique.
// La lecture passe par Web Audio, « débloqué » au clic : fonctionne aussi sur iPhone.
export default function PodcastPlayer({ lines, course, week }: { lines: IaLine[]; course?: string; week?: number }) {
  const [state, setState] = useState<'idle' | 'loading' | 'playing'>('idle');
  const [current, setCurrent] = useState(-1);
  const ctxRef = useRef<AudioContext | null>(null);
  const srcRef = useRef<AudioBufferSourceNode | null>(null);
  const genRef = useRef(0);

  const synth = async (line: IaLine, idx: number): Promise<ArrayBuffer | null> => {
    // Enregistré sur l'appareil (formation hors ligne) : lecture sans Internet.
    if (course && week) {
      const cached = await readGeneratedAudio(generatedAudioKey(course, week, idx));
      if (cached) return cached;
    }
    try {
      const res = await fetch('/api/speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: line.text, speaker: line.speaker }),
      });
      const data = await res.json();
      if (!data?.audioContent) return null;
      const bin = atob(data.audioContent);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return bytes.buffer;
    } catch {
      return null;
    }
  };

  const stop = () => {
    genRef.current++;
    try { srcRef.current?.stop(); } catch {}
    srcRef.current = null;
    setState('idle');
    setCurrent(-1);
  };

  const play = async () => {
    const AC: any = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!ctxRef.current) ctxRef.current = new AC();
    const ctx = ctxRef.current!;
    ctx.resume?.().catch(() => {});
    const gen = ++genRef.current;
    setState('loading');
    let next = synth(lines[0], 0);
    for (let i = 0; i < lines.length; i++) {
      const buf = await next;
      if (gen !== genRef.current) return;
      next = i + 1 < lines.length ? synth(lines[i + 1], i + 1) : Promise.resolve(null);
      if (!buf) continue;
      const audio: AudioBuffer = await new Promise((res, rej) => ctx.decodeAudioData(buf, res, rej)).catch(() => null as any);
      if (!audio || gen !== genRef.current) continue;
      setState('playing');
      setCurrent(i);
      await new Promise<void>((resolve) => {
        const src = ctx.createBufferSource();
        src.buffer = audio;
        src.connect(ctx.destination);
        src.onended = () => resolve();
        srcRef.current = src;
        src.start(0);
      });
    }
    if (gen === genRef.current) stop();
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-bold text-foreground flex items-center gap-2"><Headphones className="w-4 h-4 text-blue-600" /> Podcast : Socrate et l'étudiante</p>
          <p className="text-xs text-muted-foreground">Environ {Math.max(2, Math.round(lines.reduce((a, l) => a + l.text.length, 0) / 900))} minutes</p>
        </div>
        {state === 'idle' ? (
          <button onClick={play} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">▶ Écouter</button>
        ) : (
          <button onClick={stop} className="rounded-lg border border-border px-4 py-2 text-sm font-bold flex items-center gap-2">
            {state === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4" />} Arrêter
          </button>
        )}
      </div>
      <details className="mt-3">
        <summary className="cursor-pointer text-sm font-semibold text-blue-700 dark:text-blue-300">Lire le dialogue</summary>
        <div className="mt-2 space-y-2 text-sm">
          {lines.map((l, i) => (
            <p key={i} className={`rounded-lg px-3 py-2 ${i === current ? 'bg-blue-50 dark:bg-blue-950/40' : ''}`}>
              <b className={l.speaker === 'Socrate' ? 'text-blue-700 dark:text-blue-300' : 'text-violet-700 dark:text-violet-300'}>
                {l.speaker === 'Socrate' ? 'Socrate' : 'Étudiante'} :
              </b>{' '}{l.text}
            </p>
          ))}
        </div>
      </details>
    </div>
  );
}
