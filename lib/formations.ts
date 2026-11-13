/**
 * Formations ouvertes aux inscriptions, leur prix et le vocabulaire des inscriptions.
 * Fichier sans accès à la base : utilisable par les pages comme par le serveur.
 * La liste vient du catalogue (lib/catalog.ts) : une formation « disponible » avec un identifiant d'inscription.
 */
import { ALL_COURSES } from '@/lib/catalog';

export interface FormationOuverte {
  /** Identifiant enregistré dans les inscriptions : 'cs50x', 'ia-essentiels'… */
  id: string;
  titre: string;
  certificat: string;
  note: string;
  href: string;
  /** Prix pour un étudiant libre, en dollars ; null = à convenir. */
  prixUsd: number | null;
  /** Bourse universitaire (convention) proposée pour cette formation. */
  bourseUniversitaire: boolean;
}

export const FORMATIONS_OUVERTES: FormationOuverte[] = ALL_COURSES
  .filter((c) => c.status === 'disponible' && c.formation && c.href)
  .map((c) => ({ id: c.formation!, titre: c.title, certificat: c.certificate, note: c.note, href: c.href!, prixUsd: c.prixUsd ?? null, bourseUniversitaire: c.bourseUniversitaire === true }));

/** Formation des élèves inscrits avant les formations multiples, et choix par défaut du formulaire. */
export const FORMATION_PAR_DEFAUT = 'cs50x';

export function formationOuverte(id: unknown): FormationOuverte | null {
  return typeof id === 'string' ? FORMATIONS_OUVERTES.find((f) => f.id === id) ?? null : null;
}

/** Nom d'une formation pour l'affichage, même si elle n'est plus ouverte aux inscriptions. */
export function titreFormation(id: string): string {
  return ALL_COURSES.find((c) => c.formation === id)?.title ?? id;
}

export const STATUTS_INSCRIPTION = ['EN_ATTENTE', 'VALIDEE', 'SUSPENDUE', 'REFUSEE'] as const;
export type StatutInscription = (typeof STATUTS_INSCRIPTION)[number];

const STATUTS_FR: Record<string, string> = {
  EN_ATTENTE: 'En attente de validation',
  VALIDEE: 'Validée',
  SUSPENDUE: 'Suspendue',
  REFUSEE: 'Refusée',
};
export function statutInscriptionFr(statut: string | null | undefined): string {
  return STATUTS_FR[String(statut || '')] || 'Non renseigné';
}

/** Statut du compte -> statut de l'inscription (même règle que scripts/rattacher-inscriptions.mjs). */
export function statutDepuisCompte(statutCompte: string | null | undefined): StatutInscription {
  return statutCompte === 'ACTIVE' ? 'VALIDEE' : statutCompte === 'SUSPENDED' ? 'SUSPENDUE' : 'EN_ATTENTE';
}

/** Prix d'une inscription, décidé par le serveur : 0 sous convention, sinon le prix de la formation (null = à convenir). */
export function prixInscription(formation: FormationOuverte, studentType: string, prixCs50xConfigure?: string): number | null {
  if (studentType === 'UNIVERSITAIRE') return 0;
  if (formation.id === 'cs50x' && prixCs50xConfigure && Number.isFinite(Number(prixCs50xConfigure))) return Number(prixCs50xConfigure);
  return formation.prixUsd;
}

/** « 500 USD », « 0 USD » ou « Prix à convenir ». */
export function libellePrix(prix: number | null | undefined): string {
  return typeof prix === 'number' ? `${prix} USD` : 'Prix à convenir';
}

/** La bourse universitaire (convention) est-elle proposée pour cette formation ? Réglage par formation, dans le catalogue. */
export function conventionPossible(formationId: string): boolean {
  return formationOuverte(formationId)?.bourseUniversitaire === true;
}
