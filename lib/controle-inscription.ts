/**
 * Contrôles partagés par le formulaire d'inscription (navigateur) et la route d'inscription (serveur).
 * Chaque fonction « erreur… » renvoie un message en français, ou null si la valeur est acceptable.
 */

/** Âge minimal pour s'inscrire soi-même en ligne. Les plus jeunes passent par une école. */
export const AGE_MINIMUM_EN_LIGNE = 14;
/** Âge minimal sur un poste d'école hors ligne (l'élève est encadré par son établissement). */
export const AGE_MINIMUM_ECOLE = 10;

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

export function erreurDateNaissance(valeur: unknown, maintenant: Date = new Date(), ageMinimum: number = AGE_MINIMUM_EN_LIGNE): string | null {
  if (valeur === null || valeur === undefined || valeur === '') return 'La date de naissance est obligatoire.';
  const d = lireDateNaissance(valeur);
  if (!d) return 'La date de naissance est invalide.';
  if (d.getTime() > maintenant.getTime()) return 'La date de naissance ne peut pas être dans le futur.';
  if (d.getUTCFullYear() < 1900) return 'La date de naissance est invalide.';
  const limite = new Date(maintenant);
  limite.setUTCFullYear(limite.getUTCFullYear() - ageMinimum);
  if (d.getTime() > limite.getTime()) return ageMinimum >= AGE_MINIMUM_EN_LIGNE
    ? `Il faut avoir au moins ${ageMinimum} ans pour s'inscrire en ligne. Les plus jeunes s'inscrivent par leur école.`
    : `Il faut avoir au moins ${ageMinimum} ans pour s'inscrire.`;
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

/** Longueur maximale et nombre de mots maximal d'un prénom repris dans un courriel. */
const PRENOM_COURRIEL_LONGUEUR_MAX = 25;
const PRENOM_COURRIEL_MOTS_MAX = 2;

// Une suite de lettres latines (accents permis, au plus une marque d'accent séparée par lettre).
const LETTRES = "(?:\\p{Script=Latin}[\\u0300-\\u036f]?)+";
// Des groupes de lettres reliés par UN seul séparateur : espace, trait d'union ou apostrophe.
const PRENOM_COURRIEL = new RegExp(`^${LETTRES}(?:[ '’-]${LETTRES})*$`, 'u');

/**
 * Prénom autorisé dans un courriel : uniquement des lettres latines (accents permis), reliées par un seul
 * espace, trait d'union ou apostrophe ; 25 caractères et 2 mots au plus. Renvoie null sinon (chiffres, liens,
 * symboles, balises, caractères invisibles, accents empilés, phrase entière…).
 * Le prénom est saisi par un inconnu : il ne doit jamais pouvoir glisser un lien, du code ou un message dans un courriel.
 */
export function prenomPourCourriel(valeur: unknown): string | null {
  if (typeof valeur !== 'string') return null;
  const prenom = valeur.normalize('NFC').trim();
  if (!prenom || prenom.length > PRENOM_COURRIEL_LONGUEUR_MAX) return null;
  if (prenom.split(' ').length > PRENOM_COURRIEL_MOTS_MAX) return null;
  if (!PRENOM_COURRIEL.test(prenom)) return null;
  return prenom;
}

/** Première ligne d'un courriel : « Bonjour Awa, » si le prénom est acceptable, sinon « Bonjour, ». */
export function salutationCourriel(prenom: unknown): { texte: string; html: string } {
  const p = prenomPourCourriel(prenom);
  if (!p) return { texte: 'Bonjour,', html: 'Bonjour,' };
  return { texte: `Bonjour ${p},`, html: `Bonjour ${p.replace(/'/g, '&#39;')},` };
}
