// Petits outils de sécurité partagés par les routes du serveur.
import { createHash, timingSafeEqual } from 'node:crypto';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

/**
 * Compare une clé reçue à la clé attendue en temps constant :
 * le temps de réponse ne révèle pas combien de caractères sont justes.
 */
export function cleEgale(recue: string | null | undefined, attendue: string): boolean {
  if (!recue || !attendue) return false;
  const a = createHash('sha256').update(recue).digest();
  const b = createHash('sha256').update(attendue).digest();
  return timingSafeEqual(a, b);
}

/** « Authorization: Bearer <CRON_SECRET> » envoyé par les tâches automatiques de Vercel. */
export function cronAutorise(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  return !!secret && cleEgale(req.headers.get('authorization'), `Bearer ${secret}`);
}

/**
 * Rôle ACTUEL de la personne connectée, relu dans la base (et non celui gardé dans la session) :
 * un administrateur rétrogradé ou suspendu perd ses droits tout de suite.
 */
export async function roleActuel(): Promise<string | null> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  const u = await prisma.user.findUnique({ where: { id }, select: { role: true, status: true } });
  if (!u || u.status === 'SUSPENDED') return null;
  return u.role;
}

/** Adresse IP de la demande (première adresse de x-forwarded-for, fournie par Vercel). */
export function adresseIP(req: Request): string {
  return (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || req.headers.get('x-real-ip') || 'inconnue';
}
