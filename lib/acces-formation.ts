/**
 * Accès d'un élève au contenu d'une formation, d'après SES inscriptions (côté serveur).
 * Un compte actif n'ouvre plus tout le site : chaque formation s'ouvre avec son inscription validée.
 */
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { formationOuverte } from '@/lib/formations';

export type Acces = 'ok' | 'attente' | 'refuse' | 'aucune';

/**
 * - Administrateurs et formateurs : toutes les formations (pour tester et corriger).
 * - Compte non actif ou accès testeur expiré : refusé.
 * - Élève sans aucune inscription (compte d'avant les formations multiples, poste d'école pas encore mis à jour) :
 *   il est élève de CS50x, comme avant.
 * - Sinon : l'inscription à cette formation doit être validée.
 */
export async function accesFormation(userId: string | undefined, formation: string): Promise<Acces> {
  if (!userId || !formationOuverte(formation)) return 'aucune';
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, status: true, accessExpiresAt: true, inscriptions: { select: { formation: true, statut: true } } },
  });
  if (!u) return 'aucune';
  if (u.role === 'ADMIN' || u.role === 'INSTRUCTOR') return 'ok';
  if (u.status !== 'ACTIVE') return u.status === 'PENDING' ? 'attente' : 'refuse';
  if (u.accessExpiresAt && u.accessExpiresAt.getTime() <= Date.now()) return 'refuse';
  if (u.inscriptions.length === 0) return formation === 'cs50x' ? 'ok' : 'aucune';
  const i = u.inscriptions.find((x) => x.formation === formation);
  if (!i) return 'aucune';
  return i.statut === 'VALIDEE' ? 'ok' : i.statut === 'EN_ATTENTE' ? 'attente' : 'refuse';
}

/**
 * Pour une page d'une formation : connexion obligatoire, puis inscription validée à cette formation.
 * Sinon l'élève arrive sur une page qui lui explique pourquoi (et comment demander l'inscription).
 */
export async function exigerFormation(formation: string) {
  const session = await auth();
  if (!session?.user) redirect('/auth/login');
  const acces = await accesFormation((session.user as any).id, formation);
  if (acces !== 'ok') redirect(`/formations/${formation}/acces`);
  return session;
}

/** Pour une route d'API : réponse 403 si l'élève n'a pas accès à cette formation, sinon null. */
export async function refusSiPasInscrit(userId: string | undefined, formation: string): Promise<Response | null> {
  if ((await accesFormation(userId, formation)) === 'ok') return null;
  return new Response(JSON.stringify({ error: 'Cette formation n\'est pas ouverte pour votre compte.' }), {
    status: 403, headers: { 'Content-Type': 'application/json' },
  });
}
