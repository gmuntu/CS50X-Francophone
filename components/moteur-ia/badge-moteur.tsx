'use client';

import { useSyncExternalStore } from 'react';
import { LIBELLES_MODE, abonnerMoteur, libelleMoteur, lireDernierMoteur, lireMode } from '@/lib/choix-moteur';

// Texte du badge (une chaîne : React compare les valeurs, pas d'affichage en boucle).
const lireBadge = () => {
  const moteur = libelleMoteur(lireDernierMoteur());
  return `${LIBELLES_MODE[lireMode()]}${moteur ? ` · ${moteur}` : ''}`;
};

/** Petit badge discret près du tuteur : mode choisi + moteur réellement utilisé au dernier tour (ex. « Auto · Gemma e2b »). */
export default function BadgeMoteur({ className = '' }: { className?: string }) {
  // Côté serveur, rien (seul le navigateur connaît le réglage) : pas de décalage à l'affichage.
  const texte = useSyncExternalStore(abonnerMoteur, lireBadge, () => null);
  if (!texte) return null;
  return (
    <span className={`text-[10px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full ${className}`} title="Moteur de Socrate">
      {texte}
    </span>
  );
}
