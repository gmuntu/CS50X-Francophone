// Cours préparés de « Approfondir le sujet », un fichier par semaine (content/approfondir/semaine-N.json).
// Ils sont intégrés au site lors du build : disponibles hors ligne sur les ordinateurs d'école
// et dans le paquet hors ligne du navigateur, sans appel à Internet.
// Pour ajouter une semaine : créer le fichier (skill « preparer-approfondir »), puis l'importer ici.
import { validerContenu, type ContenuApprofondir } from './types';
import semaine0 from '@/content/approfondir/semaine-0.json';
import semaine1 from '@/content/approfondir/semaine-1.json';
import semaine2 from '@/content/approfondir/semaine-2.json';
import semaine3 from '@/content/approfondir/semaine-3.json';
import semaine4 from '@/content/approfondir/semaine-4.json';
import semaine5 from '@/content/approfondir/semaine-5.json';
import semaine6 from '@/content/approfondir/semaine-6.json';
import semaine7 from '@/content/approfondir/semaine-7.json';
import semaine11 from '@/content/approfondir/semaine-11.json';
import semaine8 from '@/content/approfondir/semaine-8.json';
import semaine9 from '@/content/approfondir/semaine-9.json';
import semaine10 from '@/content/approfondir/semaine-10.json';

const FICHIERS: Record<number, unknown> = {
  0: semaine0,
  1: semaine1,
  2: semaine2,
  3: semaine3,
  4: semaine4,
  5: semaine5,
  6: semaine6,
  7: semaine7,
  11: semaine11,
  8: semaine8,
  9: semaine9,
  10: semaine10,
};

const cache = new Map<number, ContenuApprofondir | null>();

/** Contenu préparé d'une leçon (numéro de leçon), ou null s'il n'existe pas encore. */
export function contenuSemaine(lessonId: number): ContenuApprofondir | null {
  if (!cache.has(lessonId)) cache.set(lessonId, FICHIERS[lessonId] ? validerContenu(FICHIERS[lessonId]) : null);
  return cache.get(lessonId) ?? null;
}

/** Interrupteur Vercel SALLE_APPROFONDIR : « notebooklm » réaffiche l'ancienne carte NotebookLM. */
export function salleActive(): 'approfondir' | 'notebooklm' {
  return process.env.SALLE_APPROFONDIR?.trim().toLowerCase() === 'notebooklm' ? 'notebooklm' : 'approfondir';
}
