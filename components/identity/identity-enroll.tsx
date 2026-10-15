'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, Mic, Square, Loader2, Trash2 } from 'lucide-react';
import { openCamera, snapshot } from '@/lib/camera';
import { startRecorder } from '@/lib/recorder';

const STEPS = ['Regardez la caméra, bien en face', 'Tournez la tête vers la gauche', 'Souriez'];

// Création de l'empreinte SavoirIA : 3 photos guidées (personne vivante) + 15 s de voix. Verrouillée ensuite.
export default function IdentityEnroll({ name, onDone }: { name?: string; onDone: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const camRef = useRef<MediaStream | null>(null);
  const micRef = useRef<MediaStream | null>(null);
  const recRef = useRef<{ done: () => Promise<Blob> } | null>(null);
  const [consent, setConsent] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [faces, setFaces] = useState<Blob[]>([]);
  const [faceUrls, setFaceUrls] = useState<string[]>([]);
  const [voice, setVoice] = useState<Blob | null>(null);
  const [voiceUrl, setVoiceUrl] = useState('');
  const [rec, setRec] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => () => { camRef.current?.getTracks().forEach((t) => t.stop()); micRef.current?.getTracks().forEach((t) => t.stop()); }, []);
  useEffect(() => { if (!rec) return; const t = setInterval(() => setSeconds((s) => s + 1), 1000); return () => clearInterval(t); }, [rec]);
  useEffect(() => { if (rec && seconds >= 30) stopVoice(); }, [seconds, rec]);

  const startCam = async () => {
    setMsg('');
    try { camRef.current = await openCamera(videoRef.current!); setCamOn(true); }
    catch { setMsg("Caméra refusée. Autorisez-la dans la barre d'adresse."); }
  };
  const shoot = async () => {
    const b = await snapshot(videoRef.current!);
    if (!b) return;
    const next = [...faces, b];
    setFaces(next); setFaceUrls((u) => [...u, URL.createObjectURL(b)]);
    if (next.length === 3) { camRef.current?.getTracks().forEach((t) => t.stop()); setCamOn(false); }
  };
  const resetFaces = () => { setFaces([]); setFaceUrls([]); };

  const startVoice = async () => {
    setMsg('');
    try {
      micRef.current = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 } });
      recRef.current = startRecorder(micRef.current); setSeconds(0); setRec(true);
    } catch { setMsg("Micro refusé. Autorisez-le dans la barre d'adresse."); }
  };
  const stopVoice = async () => {
    const b = await recRef.current?.done();
    micRef.current?.getTracks().forEach((t) => t.stop());
    setRec(false);
    if (b) { setVoice(b); setVoiceUrl(URL.createObjectURL(b)); }
  };

  const send = async () => {
    if (!voice || faces.length < 3) return;
    if (seconds < 8) { setMsg('Lisez la phrase en entier (au moins 8 secondes).'); return; }
    setSending(true); setMsg('');
    const fd = new FormData();
    fd.append('consent', 'true');
    faces.forEach((f, i) => fd.append(`face${i}`, f, `face${i}.jpg`));
    fd.append('voice', voice, voice.type.includes('mp4') ? 'voix.m4a' : 'voix.webm');
    try {
      const res = await fetch('/api/identite', { method: 'POST', body: fd });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d?.error || 'Erreur');
      onDone();
    } catch (e: any) { setMsg(e?.message || 'Erreur'); } finally { setSending(false); }
  };

  return (
    <div className="rounded-2xl border-2 border-blue-600 bg-card p-5 space-y-4">
      <div>
        <p className="text-xs font-extrabold tracking-wide text-blue-700 dark:text-blue-300">MON EMPREINTE SAVOIRIA</p>
        <p className="text-lg font-extrabold">Une minute, une seule fois</p>
        <p className="text-sm text-muted-foreground">Elle sert à vérifier que c'est bien vous qui passez les examens.</p>
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-1" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>J'accepte que mon visage et ma voix servent à vérifier que c'est bien moi aux examens. Ils sont supprimés 6 mois après la fin de la formation.</span>
      </label>

      <div className={consent ? '' : 'opacity-40 pointer-events-none'}>
        <p className="font-bold text-sm mb-2">1. 🤳 Votre visage ({Math.min(faces.length, 3)}/3)</p>
        <div className="flex flex-wrap items-start gap-3">
          <div className={`relative overflow-hidden rounded-xl bg-black ${camOn ? '' : 'hidden'}`} style={{ width: 240, height: 180 }}>
            <video ref={videoRef} className="h-full w-full object-cover -scale-x-100" playsInline muted />
            <p className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-xs text-center py-1">{STEPS[faces.length] ?? ''}</p>
          </div>
          {faceUrls.map((u, i) => <img key={i} src={u} alt="" className="h-20 w-20 rounded-lg object-cover -scale-x-100" />)}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {!camOn && faces.length < 3 && <button onClick={startCam} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white flex items-center gap-1.5"><Camera className="h-4 w-4" /> Ouvrir la caméra</button>}
          {camOn && <button onClick={shoot} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white">📸 {STEPS[faces.length]} — Prendre la photo</button>}
          {faces.length > 0 && !camOn && <button onClick={resetFaces} className="rounded-xl border border-border px-3 py-2 text-sm font-bold flex items-center gap-1.5"><Trash2 className="h-4 w-4" /> Recommencer les photos</button>}
        </div>
      </div>

      <div className={consent && faces.length === 3 ? '' : 'opacity-40 pointer-events-none'}>
        <p className="font-bold text-sm mb-2">2. 🎙️ Votre voix</p>
        <p className="rounded-xl bg-muted/50 p-3 text-sm">« Je m'appelle {name || '…'}, je suis étudiant SavoirIA. Je m'engage à faire moi-même mes travaux et mes examens. »</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {rec ? (
            <button onClick={stopVoice} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white flex items-center gap-1.5 animate-pulse"><Square className="h-3.5 w-3.5" /> Arrêter · {seconds} s</button>
          ) : !voice ? (
            <button onClick={startVoice} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white flex items-center gap-1.5"><Mic className="h-4 w-4" /> Enregistrer</button>
          ) : (
            <>
              <audio controls src={voiceUrl} className="h-9" />
              <button onClick={() => { setVoice(null); setVoiceUrl(''); }} className="rounded-xl border border-border px-3 py-2 text-sm font-bold flex items-center gap-1.5"><Trash2 className="h-4 w-4" /> Recommencer</button>
            </>
          )}
        </div>
      </div>

      <button disabled={!consent || faces.length < 3 || !voice || sending} onClick={send} className="w-full rounded-xl bg-blue-700 py-3 text-sm font-extrabold text-white disabled:opacity-40 flex items-center justify-center gap-2">
        {sending && <Loader2 className="h-4 w-4 animate-spin" />} Valider mon empreinte (elle sera verrouillée)
      </button>
      {msg && <p className="text-sm text-red-600">{msg}</p>}
    </div>
  );
}
