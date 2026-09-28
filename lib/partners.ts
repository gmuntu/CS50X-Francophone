import { randomBytes } from 'crypto';

/** Alphabet sans caractères ambigus (0/O, 1/I/L) pour des codes faciles à dicter. */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function randomChunk(length: number): string {
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

/** Sigle d'un établissement : texte entre parenthèses, sinon initiales des mots significatifs. */
export function institutionAcronym(name: string, acronym?: string | null): string {
  const clean = (v: string) => v.normalize('NFD').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (acronym && clean(acronym)) return clean(acronym).slice(0, 8);
  const paren = name.match(/\(([^)]+)\)/);
  if (paren && clean(paren[1])) return clean(paren[1]).slice(0, 8);
  const stop = new Set(['de', 'des', 'du', 'la', 'le', 'les', 'et', 'en', "d'", 'l']);
  const initials = name
    .split(/[\s'’-]+/)
    .filter((w) => w && !stop.has(w.toLowerCase()))
    .map((w) => w[0]);
  return clean(initials.join('')).slice(0, 8) || 'PART';
}

/** Exemple : UOM-CS50X-S1-2027-7Q4K9X */
export function generateAccessCode(opts: {
  institutionName: string;
  institutionAcronym?: string | null;
  courseSlug: string;
  sessionNumber: number;
  year: number;
}): string {
  const inst = institutionAcronym(opts.institutionName, opts.institutionAcronym);
  const course = opts.courseSlug.replace(/-francophone$/, '').replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 8);
  return `${inst}-${course}-S${opts.sessionNumber}-${opts.year}-${randomChunk(6)}`;
}

const DAY = 24 * 60 * 60 * 1000;

/**
 * Calcule les sessions d'une année à partir de la date de début de la première.
 * Cycle = durée + pause (ex. CS50x : 11 + 2 = 13 semaines → 4 sessions par an).
 */
export function computeYearSessions(firstStart: Date, durationWeeks: number, breakWeeks: number) {
  const cycleDays = (durationWeeks + breakWeeks) * 7;
  const perYear = Math.max(1, Math.floor(364 / cycleDays));
  return Array.from({ length: perYear }, (_, i) => {
    const start = new Date(firstStart.getTime() + i * cycleDays * DAY);
    const end = new Date(start.getTime() + (durationWeeks * 7 - 1) * DAY);
    return { number: i + 1, startDate: start, endDate: end };
  });
}
