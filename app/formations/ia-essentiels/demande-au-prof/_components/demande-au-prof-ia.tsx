'use client';

import { useState } from 'react';
import VoiceTutor from '@/components/voice-tutor/voice-tutor';
import VoiceErrorBoundary from '@/components/voice-tutor/error-boundary';
import { IA_SYSTEM_PROMPT } from '@/lib/courses/ia-essentiels';

export default function DemandeAuProfIa({ semaines }: { semaines: { n: number; titre: string; contexte: string }[] }) {
  const [n, setN] = useState(semaines[0]?.n ?? 1);
  const semaine = semaines.find((s) => s.n === n) ?? semaines[0];
  if (!semaine) return <p className="text-sm text-muted-foreground">Aucune semaine n&apos;est encore prête.</p>;
  return (
    <div className="space-y-4">
      <label className="flex flex-wrap items-center gap-2 text-sm font-bold text-muted-foreground">
        Semaine
        <select value={n} onChange={(e) => setN(Number(e.target.value))}
          className="w-full sm:w-auto rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground">
          {semaines.map((s) => <option key={s.n} value={s.n}>Semaine {s.n} : {s.titre}</option>)}
        </select>
      </label>
      <VoiceErrorBoundary>
        <VoiceTutor key={semaine.n} moduleId={1000 + semaine.n} context={semaine.contexte} systemPrompt={IA_SYSTEM_PROMPT}
          hint="Posez votre question à voix haute ; vous pouvez couper la parole à Socrate." />
      </VoiceErrorBoundary>
    </div>
  );
}
