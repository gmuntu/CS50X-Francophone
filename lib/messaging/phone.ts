import { prisma } from '@/lib/prisma';

const digits = (s: unknown) => String(s ?? '').replace(/\D/g, '');

/** Retrouve l'élève à partir du numéro qui écrit (format international, ex. +237699123456). */
export async function findUserByPhone(e164: string) {
  const incoming = digits(e164);
  if (incoming.length < 8) return null;
  const tail = incoming.slice(-8);
  const candidates = await prisma.user.findMany({
    where: { phone: { contains: tail.slice(-4) } },
    select: { id: true, firstName: true, name: true, phone: true, dialCode: true, status: true },
    take: 200,
  });
  const matches = candidates.filter((u) => {
    const p = digits(u.phone);
    if (!p.endsWith(tail)) return false;
    const local = p.replace(/^0+/, '');
    const dial = digits(u.dialCode);
    return p === incoming || (dial && dial + local === incoming) || (dial && local.startsWith(dial) && local === incoming);
  });
  // Numéro partagé par plusieurs comptes : on refuse plutôt que de se tromper d'élève.
  return matches.length === 1 ? matches[0] : null;
}
