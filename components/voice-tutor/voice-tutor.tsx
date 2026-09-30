'use client';

import { useEffect, useState } from 'react';
import { Mic, MicOff, Loader2, Volume2, AlertTriangle } from 'lucide-react';
import { useGeminiLive } from '@/hooks/useGeminiLive';

interface Props {
  moduleId: number;
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

export default function VoiceTutor({ moduleId, onActive }: Props) {
  const [context, setContext] = useState('');

  useEffect(() => {
    let alive = true;
    fetch(`/api/transcript-beta?module=${moduleId}`)
      .then((r) => r.json())
      .then((j) => { if (alive) setContext(j?.context ?? ''); })
      .catch(() => { if (alive) setContext(''); });
    return () => { alive = false; };
  }, [moduleId]);

  const { status, error, start, stop } = useGeminiLive(context);
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
          {LABELS[status]}
        </button>
        {active && (
          <button type="button" onClick={stop} className="text-xs underline text-muted-foreground">
            Terminer
          </button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {error ?? 'Conversation vocale en direct. Parlez naturellement, vous pouvez interrompre Socrate.'}
      </p>
    </div>
  );
}
