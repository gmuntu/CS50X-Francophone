'use client';

import { useSyncExternalStore } from 'react';
import { GEMMA_POSSIBLE, LIBELLES_MODE, abonnerMoteur, ecrireMode, lireMode, type ModeMoteur } from '@/lib/choix-moteur';

const AIDE: Record<ModeMoteur, string> = {
  auto: 'Gemini quand Internet répond vite ; sinon l’IA de l’ordinateur prend le relais, sans rien demander.',
  gemini: 'Toujours Gemini. Sans Internet, Socrate le dit clairement au lieu de changer de moteur.',
  gemma: 'Toujours l’IA installée sur cet ordinateur (Gemma), même avec Internet.',
};

/** Interrupteur à trois positions : Auto (défaut), Gemini, Gemma local. Réglage gardé dans ce navigateur. */
export default function ChoixMoteur() {
  // Réglage lu dans le navigateur seulement (rien côté serveur) ; suivi si un autre onglet le change.
  const mode = useSyncExternalStore<ModeMoteur | null>(abonnerMoteur, lireMode, () => null);
  if (!mode) return null;
  const choisir = (m: ModeMoteur) => ecrireMode(m); // prévient tous les abonnés (badge compris)
  return (
    <fieldset className="space-y-2">
      <legend className="text-xs font-bold text-muted-foreground mb-1.5">Moteur de Socrate</legend>
      <div role="radiogroup" className="grid grid-cols-3 gap-1 p-1 bg-muted/70 rounded-xl border border-border/70">
        {(['auto', 'gemini', 'gemma'] as ModeMoteur[]).map((m) => {
          const grise = m === 'gemma' && !GEMMA_POSSIBLE;
          return (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={mode === m}
              disabled={grise}
              title={grise ? 'Seulement sur l’ordinateur SavoirIA' : undefined}
              onClick={() => choisir(m)}
              className={`py-2 rounded-lg text-xs font-bold transition ${mode === m ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'} ${grise ? 'opacity-40 cursor-not-allowed' : 'hover:text-foreground'}`}
            >
              {LIBELLES_MODE[m]}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">{AIDE[mode]}</p>
      {!GEMMA_POSSIBLE && <p className="text-xs text-muted-foreground">Gemma local : seulement sur l’ordinateur SavoirIA.</p>}
      <p className="text-xs text-muted-foreground">La conversation en cours est gardée quand on change de moteur.</p>
    </fieldset>
  );
}
