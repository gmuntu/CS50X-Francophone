'use client';

import { useRef, useState } from 'react';
import { Mic, MicOff, PhoneOff, Eye, EyeOff } from 'lucide-react';
import { useGeminiLive, type TranscriptLine } from '@/hooks/useGeminiLive';
import { demanderSocrateSite } from '@/lib/socrate-local';
import { enregistrementVersPcm16, jouerBase64 } from '@/lib/audio-pcm';
import { sanitizeForVoice } from '@/lib/voix-texte';

export type ModeVocal = 'parler' | 'expliquer';
const DUREE_MAX_MIN = 10;

const CONSIGNE_LIVE = `Tu es le tuteur vocal de SavoirIA (cours CS50 en français). Tu parles uniquement français, avec des phrases courtes et encourageantes.
Tu connais seulement le résumé du document et la notion affichée, ci-dessous : appuie-toi dessus et cite la page quand c'est utile.
Réponds en 2 à 4 phrases, puis laisse l'élève parler. Si la question sort du sujet, réponds brièvement et ramène l'élève à la notion.`;
const CONSIGNE_EXPLIQUER = `\nMODE « À VOUS D'EXPLIQUER » : c'est l'élève qui explique la notion avec ses mots. Écoute jusqu'au bout.
Ensuite : 1) dis ce qui est juste ; 2) dis ce qui manque ou est inexact ; 3) pose UNE question de vérification. Ne fais pas l'explication à sa place.`;

function Transcription({ lignes, visible }: { lignes: TranscriptLine[]; visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="mt-3 max-h-48 space-y-1.5 overflow-y-auto rounded-xl border border-border bg-background p-3 text-sm" aria-live="polite">
      {lignes.length === 0 ? <p className="text-muted-foreground">La transcription s'affichera ici.</p> : lignes.map((l, i) => (
        <p key={i}><span className="font-bold text-primary">{l.who === 'eleve' ? 'Vous' : 'Tuteur'} :</span> {l.text}</p>
      ))}
    </div>
  );
}

/**
 * Tuteur vocal de « Approfondir le sujet ».
 * En ligne : conversation en direct (gemini-3.8-live, jeton éphémère, 10 minutes au plus).
 * Sans Internet (ordinateur d'école) : tour par tour avec Whisper, Gemma et la voix locale.
 */
export default function TuteurVocal({ mode, contexte, contexteCourt, moduleId, enLigne, titreNotion, onFermer }: {
  mode: ModeVocal; contexte: string; contexteCourt: string; moduleId?: number; enLigne: boolean; titreNotion: string; onFermer: () => void;
}) {
  const [voirTexte, setVoirTexte] = useState(true);
  const consigne = CONSIGNE_LIVE + (mode === 'expliquer' ? CONSIGNE_EXPLIQUER : '');
  const ouverture = mode === 'expliquer'
    ? `Salue l'élève en une phrase et demande-lui d'expliquer avec ses mots la notion « ${titreNotion} ».`
    : `Salue l'élève en une phrase et demande-lui ce qu'il veut comprendre sur « ${titreNotion} ».`;
  const live = useGeminiLive(contexte, consigne, { transcript: true, opening: ouverture, maxMinutes: DUREE_MAX_MIN });

  // ---- Tour par tour (hors ligne) ----
  const [lignes, setLignes] = useState<TranscriptLine[]>([]);
  const [etat, setEtat] = useState<'pret' | 'ecoute' | 'reflechit' | 'parle'>('pret');
  const [erreurLocale, setErreurLocale] = useState<string | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);

  const tourParTour = async () => {
    if (recRef.current) { recRef.current.stop(); return; }
    setErreurLocale(null);
    let flux: MediaStream;
    try { flux = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch { setErreurLocale("Micro refusé. Autorisez-le dans la barre d'adresse."); return; }
    const type = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/aac'].find((m) => MediaRecorder.isTypeSupported?.(m)) || '';
    const rec = new MediaRecorder(flux, type ? { mimeType: type } : undefined);
    const morceaux: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size && morceaux.push(e.data);
    rec.onstop = async () => {
      flux.getTracks().forEach((t) => t.stop());
      recRef.current = null;
      setEtat('reflechit');
      try {
        const audio = await enregistrementVersPcm16(new Blob(morceaux, { type: rec.mimeType }));
        const prefixe = mode === 'expliquer'
          ? "L'élève explique la notion avec ses mots : dis ce qui est juste, ce qui manque, puis pose une question de vérification. "
          : '';
        let lecture = Promise.resolve();
        await demanderSocrateSite(
          { audio, contexte: prefixe + contexteCourt, moduleId },
          (q) => setLignes((l) => [...l, { who: 'eleve', text: q }]),
          (phrase, son) => {
            setLignes((l) => {
              const d = l[l.length - 1];
              return d?.who === 'socrate' ? [...l.slice(0, -1), { who: 'socrate', text: `${d.text} ${phrase}` }] : [...l, { who: 'socrate', text: phrase }];
            });
            lecture = lecture.then(() => { setEtat('parle'); return jouerBase64(son); });
          },
        );
        await lecture;
      } catch {
        setErreurLocale("Le tuteur vocal n'est pas disponible sur cet appareil sans Internet. Il fonctionne sur un ordinateur SavoirIA.");
      } finally {
        setEtat('pret');
      }
    };
    recRef.current = rec;
    rec.start();
    setEtat('ecoute');
  };

  const titre = mode === 'expliquer' ? "À vous d'expliquer" : 'Parler au tuteur';
  const ecoute = enLigne ? live.status === 'listening' && !live.muted : etat === 'ecoute';
  const actif = enLigne ? ['connecting', 'listening', 'speaking'].includes(live.status) : etat !== 'pret';

  return (
    <div className="rounded-2xl border-2 border-primary/30 bg-card p-4 shadow-soft-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-extrabold text-foreground">🎙️ {titre} <span className="font-normal text-muted-foreground">· {titreNotion}</span></p>
        <button type="button" onClick={() => setVoirTexte((v) => !v)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted">
          {voirTexte ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />} {voirTexte ? 'Masquer la transcription' : 'Afficher la transcription'}
        </button>
      </div>

      {ecoute && (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-bold text-primary-foreground" role="status">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-white" aria-hidden /> Le tuteur écoute
        </div>
      )}
      {enLigne && live.status === 'speaking' && <p className="mt-3 text-sm font-semibold text-primary" role="status">Le tuteur parle…</p>}
      {!enLigne && etat === 'reflechit' && <p className="mt-3 text-sm font-semibold text-primary" role="status">Le tuteur réfléchit… (sans Internet, cela peut prendre un moment)</p>}
      {enLigne && live.muted && live.status !== 'idle' && <p className="mt-3 text-sm font-semibold text-amber-600" role="status">Micro coupé</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        {enLigne ? (
          !actif ? (
            <button type="button" onClick={live.start} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90">
              <Mic className="h-4 w-4" /> Commencer
            </button>
          ) : (
            <>
              <button type="button" onClick={live.toggleMute} className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2.5 text-sm font-semibold hover:bg-muted">
                {live.muted ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />} {live.muted ? 'Réactiver le micro' : 'Couper le micro'}
              </button>
              <button type="button" onClick={live.stop} className="inline-flex items-center gap-2 rounded-xl bg-destructive px-3 py-2.5 text-sm font-bold text-destructive-foreground hover:bg-destructive/90">
                <PhoneOff className="h-4 w-4" /> Terminer
              </button>
            </>
          )
        ) : (
          <button type="button" onClick={tourParTour} disabled={etat === 'reflechit' || etat === 'parle'}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
            <Mic className="h-4 w-4" /> {etat === 'ecoute' ? "J'ai fini de parler" : 'Appuyer pour parler'}
          </button>
        )}
        <button type="button" onClick={() => { live.stop(); recRef.current?.stop(); onFermer(); }} className="rounded-xl px-3 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted">Fermer</button>
      </div>
      {enLigne && <p className="mt-2 text-[11px] text-muted-foreground">Session de {DUREE_MAX_MIN} minutes au plus. Le son n'est pas enregistré.</p>}
      {!enLigne && <p className="mt-2 text-[11px] text-muted-foreground">Sans Internet : parlez, appuyez sur « J'ai fini », puis le tuteur répond (tour par tour).</p>}

      {(live.error || erreurLocale) && <p className="mt-2 text-sm text-destructive">{enLigne ? live.error : erreurLocale}</p>}
      <Transcription lignes={enLigne ? live.transcript.map((l) => ({ ...l, text: sanitizeForVoice(l.text) })) : lignes} visible={voirTexte} />
    </div>
  );
}
