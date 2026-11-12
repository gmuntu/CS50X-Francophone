/**
 * Contrôles partagés par le formulaire d'inscription (navigateur) et la route d'inscription (serveur).
 * Chaque fonction « erreur… » renvoie un message en français, ou null si la valeur est acceptable.
 */

/** Âge minimal accepté à l'inscription (les mineurs passent ensuite par l'accord parental). */
export const AGE_MINIMUM = 10;

/** Longueur maximale d'un numéro tel qu'il est saisi (chiffres et séparateurs compris). */
const TELEPHONE_LONGUEUR_MAX = 30;

/**
 * Lit une date de naissance au format strict AAAA-MM-JJ (celui du champ « date » du navigateur).
 * Renvoie null si ce n'est pas un texte à ce format ou si le jour n'existe pas (31 février…).
 */
export function lireDateNaissance(valeur: unknown): Date | null {
  if (typeof valeur !== 'string') return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valeur.trim());
  if (!m) return null;
  const [annee, mois, jour] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(Date.UTC(annee, mois - 1, jour));
  if (d.getUTCFullYear() !== annee || d.getUTCMonth() !== mois - 1 || d.getUTCDate() !== jour) return null;
  return d;
}

export function erreurDateNaissance(valeur: unknown, maintenant: Date = new Date()): string | null {
  if (valeur === null || valeur === undefined || valeur === '') return 'La date de naissance est obligatoire.';
  const d = lireDateNaissance(valeur);
  if (!d) return 'La date de naissance est invalide.';
  if (d.getTime() > maintenant.getTime()) return 'La date de naissance ne peut pas être dans le futur.';
  if (d.getUTCFullYear() < 1900) return 'La date de naissance est invalide.';
  const limite = new Date(maintenant);
  limite.setUTCFullYear(limite.getUTCFullYear() - AGE_MINIMUM);
  if (d.getTime() > limite.getTime()) return `Il faut avoir au moins ${AGE_MINIMUM} ans pour s'inscrire.`;
  return null;
}

/**
 * Numéro de téléphone, avec ou sans indicatif : chiffres, espaces (même insécables), points, tirets,
 * barres obliques et parenthèses ; entre 6 et 15 chiffres au total (15 = maximum international).
 */
export function erreurTelephone(valeur: unknown): string | null {
  if (valeur === null || valeur === undefined) return 'Le téléphone est obligatoire.';
  if (typeof valeur !== 'string') return 'Le numéro de téléphone est invalide.';
  const v = valeur.trim();
  if (!v) return 'Le téléphone est obligatoire.';
  if (v.length > TELEPHONE_LONGUEUR_MAX) return 'Le numéro de téléphone est trop long.';
  if (!/^\+?[0-9\s()./-]+$/.test(v)) return 'Le numéro de téléphone ne doit contenir que des chiffres.';
  const chiffres = v.replace(/\D/g, '').length;
  if (chiffres < 6) return 'Le numéro de téléphone est trop court.';
  if (chiffres > 15) return 'Le numéro de téléphone est trop long.';
  return null;
}

/** Forme enregistrée d'un numéro déjà contrôlé : espaces ordinaires, un seul à la fois. */
export function telephonePropre(valeur: string): string {
  return valeur.trim().replace(/\s+/g, ' ');
}
