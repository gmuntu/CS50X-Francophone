// Quotas anti-abus (coût Gemini, essais de mots de passe). Compteurs en base, partagés entre serveurs.
import { prisma } from '@/lib/prisma';

/** Ajoute 1 au compteur et dit si la limite est dépassée. En cas de panne de base : on laisse passer. */
export async function depasse(cle: string, limite: number, dureeMs: number): Promise<boolean> {
  try {
    const c = await prisma.compteur.upsert({
      where: { cle },
      create: { cle, nombre: 1, expireLe: new Date(Date.now() + dureeMs) },
      update: { nombre: { increment: 1 } },
    });
    if (Math.random() < 0.01) prisma.compteur.deleteMany({ where: { expireLe: { lt: new Date() } } }).catch(() => {});
    return c.nombre > limite;
  } catch {
    return false;
  }
}

const JOUR = 24 * 3600_000;
const jour = () => new Date().toISOString().slice(0, 10);
const heure = () => new Date().toISOString().slice(0, 13);

// Limites quotidiennes par élève (le staff n'est pas limité).
export const LIMITES_IA = { tutor: 150, speech: 400, stt: 200, live: 30, defense: 10 } as const;

export async function quotaIA(user: { id?: string; role?: string } | undefined, type: keyof typeof LIMITES_IA): Promise<Response | null> {
  if (process.env.SAVOIRIA_LOCAL === '1') return null; // IA locale : gratuite, pas de quota
  if (!user?.id || user.role === 'ADMIN' || user.role === 'INSTRUCTOR') return null;
  if (!(await depasse(`ia:${type}:${user.id}:${jour()}`, LIMITES_IA[type], JOUR))) return null;
  return new Response(JSON.stringify({ error: "Limite du jour atteinte. Socrate se repose : reviens demain !" }), {
    status: 429, headers: { 'Content-Type': 'application/json' },
  });
}

/** Essais de connexion / réinitialisation : true = bloqué pour cette heure. */
export async function tropDEssais(type: string, identifiant: string, limite: number): Promise<boolean> {
  return depasse(`${type}:${identifiant.toLowerCase()}:${heure()}`, limite, 3600_000);
}
