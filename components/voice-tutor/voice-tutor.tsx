'use client';

import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Loader2, Volume2, AlertTriangle } from 'lucide-react';
import { useGeminiLive } from '@/hooks/useGeminiLive';

// Petit serveur vocal séparé (appareil sans Internet relié à un Socrate local) : sa consigne est fixe,
// la règle des deux langues lui est donc rappelée avec le contexte. Sur l'ordinateur SavoirIA, elle vient du serveur.
const BILINGUE = "(Réponds en français ; donne le terme anglais de CS50 entre parenthèses quand c'est utile, ex. « boucle (loop) » ; si l'élève demande l'anglais, explique en anglais puis reviens au français ; guide par des questions.) ";
import { detecterMode, demanderSocrateLocal, demanderSocrateSite, prechaufferTuteur, ORDINATEUR_LOCAL, type ModeSocrate } from '@/lib/socrate-local';
import { creerConversation, type Conversation, type EtatConversation } from '@/lib/conversation-locale';

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
  idle: 'Poser ma question à voix haute',
  connecting: 'Connexion…',
  listening: 'Je vous écoute…',
  speaking: 'Le tuteur répond…',
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

  if (mode !== 'en-ligne') return <SocrateLocal mode={mode} context={context} moduleId={moduleId} onActive={onActive} bureau={!systemPrompt} />;

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
function SocrateLocal({ mode, context, moduleId, onActive, bureau }: { mode: ModeSocrate; context: string; moduleId: number; onActive?: () => void; bureau?: boolean }) {
  // « Demande au prof » sur un ordinateur SavoirIA : conversation suivie, comme en ligne sur /agora.
  const suivi = !!bureau && ORDINATEUR_LOCAL;
  const [etat, setEtat] = useState<EtatConversation>('idle');
  const [question, setQuestion] = useState('');
  const [reponse, setReponse] = useState('');
  const conversation = useRef<Conversation | null>(null);
  // Toujours les dernières valeurs (le contenu de la leçon arrive après l'affichage).
  const donnees = useRef({ context, moduleId, onActive, bureau });
  useEffect(() => { donnees.current = { context, moduleId, onActive, bureau }; });
  useEffect(() => prechaufferTuteur({ moduleId, voix: true, bureau: suivi }), [moduleId, suivi]);
  // Quitter la page ferme le micro et fait taire Socrate.
  useEffect(() => () => { conversation.current?.terminer(); }, []);

  const obtenir = (): Conversation => {
    conversation.current ??= creerConversation({
      suivi,
      // 20 s au plus sur le poste : la route /api/stt refuse les enregistrements plus longs.
      dureeMaxMs: ORDINATEUR_LOCAL ? 20000 : 30000,
      demander: (audio, historique, surQuestion, surPhrase, signal) => {
        const d = donnees.current;
        // Sur l'ordinateur SavoirIA : le site lui-même (Whisper + Gemma + voix) ; sinon le petit serveur vocal local.
        if (!ORDINATEUR_LOCAL) return demanderSocrateLocal({ audio, contexte: d.bureau ? BILINGUE + d.context : d.context }, surQuestion, surPhrase);
        return demanderSocrateSite(
          suivi ? { audio, moduleId: d.moduleId, bureau: true, historique, signal } : { audio, contexte: d.context, moduleId: d.moduleId },
          surQuestion, surPhrase,
        );
      },
      surEtat: setEtat,
      surQuestion: setQuestion,
      surReponse: setReponse,
      surEcoute: () => donnees.current.onActive?.(),
    });
    return conversation.current;
  };
  const basculer = () => { if (mode === 'local') obtenir().basculer(); };

  if (mode === 'pause') {
    return (
      <div className="flex flex-col gap-2 p-4 rounded-2xl border border-rose-200 bg-rose-50">
        <p className="text-sm font-bold text-rose-800">✈ Pas d&apos;Internet : Socrate est en pause sur cet appareil.</p>
        <p className="text-xs text-rose-700">Tu peux revoir la vidéo enregistrée. Socrate reviendra dès que tu seras connecté.</p>
      </div>
    );
  }

  const libelle = suivi
    ? { idle: 'Poser ma question à voix haute', listening: 'Je vous écoute…', thinking: 'Le tuteur réfléchit…', speaking: 'Le tuteur répond…' }[etat]
    : { idle: 'Poser ma question à voix haute', listening: 'Je t\'écoute… (appuie pour envoyer)', thinking: 'Le tuteur réfléchit…', speaking: 'Le tuteur répond…' }[etat];
  const couleur = etat === 'listening' ? 'bg-rose-600 animate-pulse' : etat === 'speaking' ? 'bg-[#7c3aed]' : etat === 'thinking' ? 'bg-slate-400' : 'bg-primary hover:bg-primary/90';
  return (
    <div className="flex flex-col gap-2 p-4 rounded-2xl border border-amber-200 bg-card">
      <span className="self-start text-[10px] font-bold text-amber-700 bg-amber-500/15 px-2 py-0.5 rounded-full">✈ Socrate local · sans Internet</span>
      <div className="flex items-center gap-3">
        <button type="button" onClick={basculer} aria-pressed={etat !== 'idle'} className={`px-5 py-3 rounded-xl text-sm font-bold text-white flex items-center gap-2 transition-all ${couleur}`}>
          {etat === 'thinking' ? <Loader2 className="w-4 h-4 animate-spin" /> : etat === 'speaking' ? <Volume2 className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          {libelle}
        </button>
        {suivi && etat !== 'idle' && (
          <button type="button" onClick={() => conversation.current?.terminer()} className="text-xs underline text-muted-foreground">
            Terminer
          </button>
        )}
      </div>
      {question && <p className="text-xs"><span className="font-bold">Toi :</span> {question}</p>}
      {reponse && <p className="text-sm bg-muted/40 rounded-xl p-3"><span className="font-bold">Socrate :</span> {reponse}</p>}
      <p className="text-xs text-muted-foreground">
        {suivi
          ? 'Conversation vocale sur cet ordinateur. Parlez naturellement : Socrate répond quand vous vous taisez, puis vous écoute à nouveau. Appuyez sur le bouton pour envoyer tout de suite ou pour l’interrompre.'
          : <>Pas d&apos;Internet : Socrate t&apos;aide grâce à cet ordinateur. Appuie pour parler, appuie encore quand tu as fini.</>}
      </p>
    </div>
  );
}
