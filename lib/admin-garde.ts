/** Contrôle d'accès des routes d'administration : rôle relu en base, jamais pris dans le navigateur. */
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function exigerAdmin(): Promise<{ ok: true; adminId: string } | { ok: false; error: string; status: 401 | 403 }> {
  const session = await auth();
  const id = (session?.user as any)?.id as string | undefined;
  if (!id) return { ok: false, error: 'Non authentifié', status: 401 };
  const u = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (u?.role !== 'ADMIN') return { ok: false, error: 'Accès réservé aux administrateurs', status: 403 };
  return { ok: true, adminId: id };
}
