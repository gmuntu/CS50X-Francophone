'use client';

import { useRef, useState } from 'react';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { Play, Loader2, Copy } from 'lucide-react';

type Speaker = 'Socrate' | 'Étudiant';
interface Config {
  model: string;
  voices: Record<Speaker, string>;
  styles: Record<Speaker, string>;
}

// Voix Gemini-TTS disponibles (masculines / féminines) pour les essais.
const MALE = ['Algieba', 'Charon', 'Orus', 'Iapetus', 'Umbriel', 'Gacrux', 'Achird', 'Sadaltager', 'Alnilam', 'Schedar', 'Enceladus', 'Rasalgethi', 'Fenrir', 'Puck'];
const FEMALE = ['Leda', 'Sulafat', 'Aoede', 'Achernar', 'Vindemiatrix', 'Kore', 'Despina', 'Callirrhoe', 'Autonoe', 'Erinome', 'Laomedeia', 'Pulcherrima', 'Zephyr'];
const MODELS = ['gemini-2.5-flash-tts', 'gemini-2.5-pro-tts', 'gemini-3.1-flash-tts-preview'];

const SAMPLES: Record<Speaker, string> = {
  Socrate:
    "Bonjour ma fille. Prends ton temps, il n'y a aucune honte à ne pas savoir. Dis-moi : si tu devais expliquer à ta petite sœur comment on trouve un nom dans l'annuaire, par où commencerais-tu ?",
  Étudiant:
    "Euh… je crois que j'ouvrirais au milieu, et selon la lettre, je garderais seulement une moitié ? Attends… c'est ça, l'algorithme de recherche binaire ?",
};

export default function VoixClient({ config }: { config: Config }) {
  const [model, setModel] = useState(config.model);
  const [voices, setVoices] = useState(config.voices);
  const [styles, setStyles] = useState(config.styles);
  const [texts, setTexts] = useState(SAMPLES);
  const [busy, setBusy] = useState<Speaker | null>(null);
  const [info, setInfo] = useState<string>('');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const play = async (speaker: Speaker) => {
    setBusy(speaker);
    setInfo('');
    try {
      const res = await fetch('/api/speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: texts[speaker], speaker, test: { voice: voices[speaker], style: styles[speaker], model } }),
      });
      const data = await res.json();
      if (!res.ok || !data?.audioContent) {
        setInfo(`Échec : ${data?.error ?? res.status}`);
        return;
      }
      setInfo(
        data.engine === 'gemini'
          ? 'Voix Gemini-TTS utilisée.'
          : 'Attention : Gemini-TTS a échoué, la voix de secours (accent de France) a été utilisée. Vérifiez le modèle et la voix.'
      );
      audioRef.current?.pause();
      audioRef.current = new Audio('data:audio/mp3;base64,' + data.audioContent);
      await audioRef.current.play();
    } catch (e: any) {
      setInfo(`Erreur : ${e?.message ?? e}`);
    } finally {
      setBusy(null);
    }
  };

  const vercelSettings = [
    `PODCAST_TTS_MODEL = ${model}`,
    `PODCAST_VOICE_SOCRATE = ${voices.Socrate}`,
    `PODCAST_VOICE_ETUDIANTE = ${voices['Étudiant']}`,
    `PODCAST_STYLE_SOCRATE = ${styles.Socrate}`,
    `PODCAST_STYLE_ETUDIANTE = ${styles['Étudiant']}`,
  ].join('\n');

  const card = (speaker: Speaker, label: string, list: string[]) => (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
      <h2 className="font-extrabold text-foreground">{label}</h2>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs font-bold text-muted-foreground">
          Voix de base
          <select
            value={voices[speaker]}
            onChange={(e) => setVoices({ ...voices, [speaker]: e.target.value })}
            className="mt-1 w-full bg-muted border border-border rounded-lg px-2 py-2 text-sm text-foreground"
          >
            {[voices[speaker], ...list.filter((v) => v !== voices[speaker])].map((v) => <option key={v}>{v}</option>)}
          </select>
        </label>
      </div>
      <label className="block text-xs font-bold text-muted-foreground">
        Consigne de style (accent, ton, âge…)
        <textarea
          value={styles[speaker]}
          onChange={(e) => setStyles({ ...styles, [speaker]: e.target.value })}
          rows={4}
          className="mt-1 w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground"
        />
      </label>
      <label className="block text-xs font-bold text-muted-foreground">
        Texte d'essai
        <textarea
          value={texts[speaker]}
          onChange={(e) => setTexts({ ...texts, [speaker]: e.target.value })}
          rows={3}
          className="mt-1 w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground"
        />
      </label>
      <button
        onClick={() => play(speaker)}
        disabled={busy !== null}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50"
      >
        {busy === speaker ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />} Écouter
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Tester les voix des podcasts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Essayez différentes voix et consignes. Ces essais ne changent rien pour les élèves : quand le résultat vous plaît,
            copiez les réglages en bas de page dans Vercel.
          </p>
        </div>

        <label className="block text-xs font-bold text-muted-foreground max-w-xs">
          Modèle de voix
          <select value={model} onChange={(e) => setModel(e.target.value)} className="mt-1 w-full bg-muted border border-border rounded-lg px-2 py-2 text-sm text-foreground">
            {[model, ...MODELS.filter((m) => m !== model)].map((m) => <option key={m}>{m}</option>)}
          </select>
        </label>

        {info && <p className="text-sm font-semibold text-foreground bg-muted border border-border rounded-xl px-4 py-2">{info}</p>}

        <div className="grid md:grid-cols-2 gap-4">
          {card('Socrate', 'Socrate (homme, calme et rassurant)', MALE)}
          {card('Étudiant', "L'étudiante (jeune femme)", FEMALE)}
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 space-y-2">
          <h2 className="font-extrabold text-foreground">Réglages à copier dans Vercel</h2>
          <p className="text-xs text-muted-foreground">Vercel → projet cs-50-x-francophone → Settings → Environment Variables (une ligne = un réglage), puis Redeploy.</p>
          <pre className="text-xs bg-muted rounded-lg p-3 whitespace-pre-wrap">{vercelSettings}</pre>
          <button
            onClick={() => navigator.clipboard?.writeText(vercelSettings)}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border text-xs font-bold"
          >
            <Copy className="w-3.5 h-3.5" /> Copier
          </button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
