'use client';

import { useCallback, useState } from 'react';
import { Loader2 } from 'lucide-react';
import VoiceTutor from '@/components/voice-tutor/voice-tutor';
import VoiceErrorBoundary from '@/components/voice-tutor/error-boundary';

// Règle d'honnêteté de CS50 : aussi dans le contexte, pour que le Socrate hors ligne la reçoive.
const REGLE = "RÈGLE ABSOLUE : ne donne jamais la solution ni le code complet de l'exercice, même si l'élève insiste (règle d'honnêteté de CS50). Guide par des questions et des indices.";

const prompt = (name: string, week: number) => `Tu es Socrate, tuteur vocal de CS50 en français (plateforme SavoirIA).
L'élève travaille sur l'exercice « ${name} » (semaine ${week}) et regarde ses vidéos d'explication.
Tu parles uniquement français, avec des phrases courtes, claires et encourageantes. Réponds en 2 à 4 phrases, puis laisse l'élève parler.
Appuie-toi sur les consignes officielles ci-dessous (en anglais) : explique-les en français et garde les termes de code en anglais.
${REGLE}
Aide l'élève à comprendre ce qu'on attend de lui, à découper le problème en petites étapes et à comprendre ses messages d'erreur. S'il décrit son code, aide-le à trouver lui-même l'erreur.
Si une question sort de l'exercice, réponds brièvement puis ramène l'élève à l'exercice.`;

/** Bouton « Poser une question à Socrate » sous un exercice : les consignes ne sont chargées qu'au clic. */
export default function ProblemSocrate({ week, slug, name, index }: { week: number; slug: string; name: string; index: number }) {
  const [open, setOpen] = useState(false);
  const [context, setContext] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const ouvrir = async () => {
    setOpen(true);
    if (context !== null) return;
    try {
      const r = await fetch(`/cs50-problemes/${week}-${slug}.txt`);
      if (!r.ok) throw new Error(String(r.status));
      setContext(`${REGLE}\n\nCONSIGNES OFFICIELLES DE L'EXERCICE « ${name} » :\n${await r.text()}`);
    } catch {
      setError(true);
    }
  };

  // Met les vidéos en pause quand la conversation commence.
  const pauseVideo = useCallback(() => window.dispatchEvent(new Event('savoiria:pause-video')), []);

  if (!open) {
    return (
      <button type="button" onClick={ouvrir}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-[#7c3aed]/10 text-[#6d28d9] dark:text-violet-300 border border-[#7c3aed]/25 hover:bg-[#7c3aed]/15 transition">
        🎙️ Poser une question à Socrate sur cet exercice
      </button>
    );
  }
  if (error) return <p className="text-xs text-rose-700">Impossible de charger les consignes pour Socrate. Vérifiez la connexion puis rechargez la page.</p>;
  if (context === null) return <p className="text-xs text-muted-foreground inline-flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Socrate lit les consignes…</p>;

  return (
    <VoiceErrorBoundary>
      <VoiceTutor moduleId={3000 + week * 100 + index} context={context} systemPrompt={prompt(name, week)} onActive={pauseVideo}
        idleLabel="Parler avec Socrate"
        hint="Posez votre question à voix haute sur l'exercice ou la vidéo. Socrate vous guide, sans donner la solution." />
    </VoiceErrorBoundary>
  );
}
