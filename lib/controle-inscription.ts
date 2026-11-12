/**
 * Contrôles partagés par le formulaire d'inscription (navigateur) et la route d'inscription (serveur).
 * Chaque fonction renvoie un message d'erreur en français, ou null si la valeur est acceptable.
 */

/** Âge minimal accepté à l'inscription (les mineurs passent ensuite par l'accord parental). */
export const AGE_MINIMUM = 10;

export function erreurDateNaissance(valeur: string | null | undefined, maintenant: Date = new Date()): string | null {
  if (!valeur) return null; // « obligatoire ou non » est décidé par l'appelant
  const d = new Date(valeur);
  if (isNaN(d.getTime())) return 'La date de naissance est invalide.';
  if (d.getTime() > maintenant.getTime()) return 'La date de naissance ne peut pas être dans le futur.';
  if (d.getUTCFullYear() < 1900) return 'La date de naissance est invalide.';
  const limite = new Date(maintenant);
  limite.setUTCFullYear(limite.getUTCFullYear() - AGE_MINIMUM);
  if (d.getTime() > limite.getTime()) return `Il faut avoir au moins ${AGE_MINIMUM} ans pour s'inscrire.`;
  return null;
}

/**
 * Numéro de téléphone, avec ou sans indicatif : chiffres, espaces, points, tirets et parenthèses seulement ;
 * entre 6 et 15 chiffres au total (15 = maximum international).
 */
export function erreurTelephone(valeur: string | null | undefined): string | null {
  const v = String(valeur ?? '').trim();
  if (!v) return null;
  if (!/^\+?[0-9 ().-]+$/.test(v)) return 'Le numéro de téléphone ne doit contenir que des chiffres.';
  const chiffres = v.replace(/\D/g, '').length;
  if (chiffres < 6) return 'Le numéro de téléphone est trop court.';
  if (chiffres > 15) return 'Le numéro de téléphone est trop long.';
  return null;
}
