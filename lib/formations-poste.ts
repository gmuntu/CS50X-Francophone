/**
 * Formations installées sur un ordinateur SavoirIA ou un Chromebook (« miroir ») : décidées par l'administration,
 * 3 au maximum. Sans accès à la base : utilisable par l'admin, le serveur et le navigateur.
 */
import { FORMATIONS_OUVERTES, formationOuverte } from '@/lib/formations';

export const FORMATIONS_PAR_POSTE_MAX = 3;

/** Nettoie une liste reçue : formations ouvertes seulement, sans doublon, 3 au plus. Null si invalide ou vide. */
export function formationsDuPoste(valeur: unknown): string[] | null {
  if (!Array.isArray(valeur)) return null;
  const ids = [...new Set(valeur.filter((v): v is string => typeof v === 'string' && !!formationOuverte(v)))];
  if (ids.length === 0 || ids.length > FORMATIONS_PAR_POSTE_MAX || ids.length !== valeur.length) return null;
  // Toujours dans l'ordre du catalogue.
  return FORMATIONS_OUVERTES.map((f) => f.id).filter((id) => ids.includes(id));
}

/**
 * Formations à installer pour un élève sur son appareil : ses inscriptions validées, parmi celles du poste,
 * dans l'ordre du catalogue, 3 au plus. Sans aucune inscription (compte ancien) : CS50x, comme avant.
 */
export function formationsAInstaller(inscriptions: { formation: string; statut: string }[], formationsPoste?: string[]): string[] {
  const validees = inscriptions.length === 0 ? ['cs50x'] : inscriptions.filter((i) => i.statut === 'VALIDEE').map((i) => i.formation);
  return FORMATIONS_OUVERTES.map((f) => f.id)
    .filter((id) => validees.includes(id) && (!formationsPoste || formationsPoste.includes(id)))
    .slice(0, FORMATIONS_PAR_POSTE_MAX);
}

/** Formation d'une leçon enregistrée sur l'appareil, d'après son numéro (1000 à 2999 : L'essentiel de l'IA). */
export function formationDeLaLecon(id: number): string {
  return id >= 1000 && id < 3000 ? 'ia-essentiels' : 'cs50x';
}
