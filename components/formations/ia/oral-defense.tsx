'use client';

import { useEffect, useRef, useState } from 'react';
import { Mic, Loader2, Square } from 'lucide-react';
import { useGeminiLive } from '@/hooks/useGeminiLive';
import { startRecorder, uploadVoice } from '@/lib/recorder';

// Défense orale avec Socrate : conversation vocale en direct + transcription écrite (voix enregistrée pour la vérification).
export default function OralDefense({ course, systemPrompt, onDone }: { course: string; systemPrompt: string; onDone: () => void }) {
  const recRef = useRef<{ done: () => Promise<Blob> } | null>(null);
  const { status, error, start, stop, transcript } = useGeminiLive('', systemPrompt, {
    transcript: true,
    onStream: (s) => { try { recRef.current = startRecorder(s); } catch { recRef.current = null; } },
    opening: "Bonjour Socrate, je suis prêt pour la défense orale de mon projet final.",
  });
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState('');
  const [seconds, setSeconds] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);
  const active = status === 'connecting' || status === 'listening' || status === 'speaking';

  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [active]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'nearest' }); }, [transcript]);

  const finish = async () => {
    const voice = recRef.current ? await recRef.current.done().catch(() => null) : null;
    recRef.current = null;
    stop();
    setSending(true);
    setMsg('');
    try {
      if (voice && voice.size > 2000) await uploadVoice(course, 'defense', voice);
      const res = await fetch('/api/formations/projet/defense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ course, transcript }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error || 'Erreur');
      onDone();
    } catch (e: any) {
      setMsg(e?.message || "L'envoi a échoué.");
    } finally {
      setSending(false);
    }
  };

  const mmss = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 rounded-2xl bg-gradient-to-br from-blue-900 via-blue-600 to-sky-500 p-4 text-white">
        <div className={`flex h-14 w-14 items-center justify-center rounded-full bg-white/20 ${status === 'listening' ? 'animate-pulse' : ''}`}>
          {status === 'connecting' ? <Loader2 className="h-6 w-6 animate-spin" /> : <Mic className="h-6 w-6" />}
        </div>
        <div className="flex-1">
          <p className="font-bold">{status === 'listening' ? 'Socrate vous écoute…' : status === 'speaking' ? 'Socrate parle…' : status === 'connecting' ? 'Connexion…' : 'Prêt pour la défense orale'}</p>
          <p className="text-xs text-white/85">Présentez votre projet, puis répondez aux 5 questions de Socrate · ⏱ {mmss}</p>
        </div>
        {!active ? (
          <button onClick={() => { setSeconds(0); start(); }} disabled={sending} className="rounded-xl bg-white px-4 py-2 text-sm font-extrabold text-blue-700">Commencer</button>
        ) : (
          <button onClick={finish} className="rounded-xl bg-white px-4 py-2 text-sm font-extrabold text-blue-700 flex items-center gap-1.5"><Square className="h-3.5 w-3.5" /> Terminer</button>
        )}
      </div>
      {(transcript.length > 0) && (
        <div className="max-h-72 overflow-y-auto space-y-2 rounded-xl border border-border bg-card p-3">
          {transcript.map((l, i) => (
            <p key={i} className={`rounded-xl px-3 py-2 text-sm ${l.who === 'socrate' ? 'bg-blue-50 dark:bg-blue-950/40' : 'bg-muted ml-6'}`}>
              <b>{l.who === 'socrate' ? 'Socrate : ' : 'Vous : '}</b>{l.text}
            </p>
          ))}
          <div ref={endRef} />
        </div>
      )}
      {(error || msg) && <p className="text-sm text-red-600">{error || msg}</p>}
      {sending && <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Envoi de la défense…</p>}
      <p className="text-[11px] text-muted-foreground">🔒 Votre voix est enregistrée pour être comparée à votre empreinte vocale par votre formateur. Elle n'est jamais partagée et elle est supprimée 6 mois après la validation.</p>
    </div>
  );
}
