import { randomBytes } from 'crypto';

// Codes testeurs : TEST-XXXX-XXXX (sans caractères ambigus 0/O, 1/I).
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateTesterCode(): string {
  const chunk = () =>
    Array.from(randomBytes(4))
      .map((b) => ALPHABET[b % ALPHABET.length])
      .join('');
  return `TEST-${chunk()}-${chunk()}`;
}

export const normalizeCode = (s: unknown) => String(s ?? '').trim().toUpperCase().replace(/\s+/g, '');

/** L'accès d'un compte est-il expiré ? (null = compte normal, jamais expiré) */
export const accessExpired = (accessExpiresAt: Date | string | null | undefined) =>
  !!accessExpiresAt && new Date(accessExpiresAt).getTime() <= Date.now();

export const formatDateFr = (d: Date | string) =>
  new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
