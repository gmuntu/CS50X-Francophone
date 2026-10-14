'use client';

import { useEffect, useRef, useState } from 'react';
import { Mic, Square, Loader2, Trash2 } from 'lucide-react';
import { startRecorder, uploadVoice } from '@/lib/recorder';

// Empreinte vocale : 15 secondes de lecture à voix haute, avec consentement explicite.
export default function VoiceEnroll({ course, name, onDone }: { course: string; name?: string; onDone: () => void }) {
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<'idle' | 'rec' | 'ready' | 'sending'>('idle');
  const [seconds, setSeconds] = useState(0);
  const [audio, setAudio] = useState<Blob | null>(null);
  const [url, setUrl] = useState('');
  const [msg, setMsg] = useState('');
  const recRef = useRef<{ done: () => Promise<Blob> } | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (state !== 'rec') return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [state]);
  useEffect(() => { if (state === 'rec' && seconds >= 30) stopRec(); }, [seconds, state]);
  useEffect(() => () => { streamRef.current?.getTracks().forEach((t) => t.stop()); if (url) URL.revokeObjectURL(url); }, [url]);

  const startRec = async () => {
    setMsg('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 } });
      streamRef.current = stream;
      recRef.current = startRecorder(stream);
      setSeconds(0);
      setState('rec');
    } catch {
      setMsg("Micro refusé. Autorisez-le dans la barre d'adresse.");
    }
  };

  const stopRec = async () => {
    const blob = await recRef.current?.done();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (!blob) return;
    if (url) URL.revokeObjectURL(url);
    setAudio(blob);
    setUrl(URL.createObjectURL(blob));
    setState('ready');
  };

  const erase = () => {
    if (url) URL.revokeObjectURL(url);
    setAudio(null); setUrl(''); setSeconds(0); setMsg(''); setState('idle');
  };

  const send = async () => {
    if (!audio) return;
    if (seconds < 8) { setMsg('Lisez la phrase en entier (au moins 8 secondes).'); return; }
    setState('sending'); setMsg('');
    try { await uploadVoice(course, 'reference', audio, true); onDone(); }
    catch (e: any) { setMsg(e?.message || 'Erreur'); setState('ready'); }
  };

  return (
    <div className="rounded-2xl border border-blue-200 dark:border-blue-900 bg-blue-50/60 dark:bg-blue-950/30 p-4 space-y-3">
      <p className="font-bold">🎙️ Empreinte vocale (une seule fois)</p>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-1" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>J'accepte que ma voix soit enregistrée pour vérifier que c'est bien moi qui passe la défense orale. Les enregistrements sont écoutés seulement par les formateurs et supprimés 6 mois après la validation.</span>
      </label>
      <div className="rounded-xl bg-card border border-border p-3 text-sm">
        <p className="text-xs font-bold text-muted-foreground mb-1">Lisez à voix haute (environ 15 secondes) :</p>
        « Je m'appelle {name || '…'}, je suis étudiant SavoirIA et je présente aujourd'hui mon projet final. J'ai écrit ce projet moi-même et je peux l'expliquer. »
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {state === 'rec' ? (
          <button onClick={stopRec} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white flex items-center gap-1.5 animate-pulse">
            <Square className="h-3.5 w-3.5" /> Arrêter · {seconds} s
          </button>
        ) : !audio && (
          <button disabled={!consent || state === 'sending'} onClick={startRec} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-40 flex items-center gap-1.5">
            <Mic className="h-4 w-4" /> Enregistrer
          </button>
        )}
        {url && state !== 'rec' && <audio controls src={url} className="h-9" />}
        {audio && state !== 'rec' && (
          <button disabled={state === 'sending'} onClick={erase} className="rounded-xl border border-border px-3 py-2 text-sm font-bold flex items-center gap-1.5">
            <Trash2 className="h-4 w-4" /> Effacer
          </button>
        )}
        {audio && state !== 'rec' && (
          <button disabled={state === 'sending'} onClick={send} className="rounded-xl border-2 border-blue-600 px-4 py-2 text-sm font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
            {state === 'sending' && <Loader2 className="h-4 w-4 animate-spin" />} Valider
          </button>
        )}
      </div>
      {msg && <p className="text-sm text-red-600">{msg}</p>}
    </div>
  );
}
