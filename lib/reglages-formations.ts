/**
 * Réglages des formations modifiables dans l'admin (table ReglageFormation). Côté serveur seulement.
 * Sans réglage enregistré, la valeur par défaut du catalogue s'applique (bourse : CS50x seulement).
 */
import { prisma } from '@/lib/prisma';
import { FORMATIONS_OUVERTES, formationOuverte } from '@/lib/formations';

export interface ReglagesFormation {
  formation: string;
  titre: string;
  bourseUniversitaire: boolean;
  profWhatsApp: boolean;
}

/** Réglages de toutes les formations ouvertes, base + valeurs par défaut du catalogue. */
export async function reglagesFormations(): Promise<ReglagesFormation[]> {
  const lignes = await prisma.reglageFormation.findMany().catch(() => []);
  return FORMATIONS_OUVERTES.map((f) => {
    const l = lignes.find((x) => x.formation === f.id);
    return { formation: f.id, titre: f.titre, bourseUniversitaire: l?.bourseUniversitaire ?? f.bourseUniversitaire, profWhatsApp: l?.profWhatsApp ?? false };
  });
}

/** La bourse universitaire est-elle proposée pour cette formation ? (réglage de l'admin, sinon catalogue) */
export async function bourseActive(formationId: string): Promise<boolean> {
  const f = formationOuverte(formationId);
  if (!f) return false;
  const l = await prisma.reglageFormation.findUnique({ where: { formation: f.id } }).catch(() => null);
  return l?.bourseUniversitaire ?? f.bourseUniversitaire;
}

/** Enregistre un réglage d'une formation ouverte. Renvoie false si la formation n'existe pas. */
export async function changerReglage(formationId: unknown, champ: 'bourseUniversitaire' | 'profWhatsApp', valeur: boolean): Promise<boolean> {
  const f = formationOuverte(formationId);
  if (!f) return false;
  await prisma.reglageFormation.upsert({
    where: { formation: f.id },
    create: { formation: f.id, bourseUniversitaire: f.bourseUniversitaire, profWhatsApp: false, [champ]: valeur },
    update: { [champ]: valeur },
  });
  return true;
}
