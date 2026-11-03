import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { prisma } from '@/lib/prisma';

// Ordinateurs SavoirIA d'école : chaque poste a sa propre clé secrète.
// Le site central ne garde que l'empreinte (SHA-256) de la clé, jamais la clé elle-même.

export const ENTETE_POSTE = 'x-savoiria-poste';
export const MAX_LIGNES = 500; // par envoi (le poste envoie par paquets)

export function genererClePoste(): string {
  return `poste_${randomBytes(32).toString('base64url')}`;
}

export const empreinteCle = (cle: string) => createHash('sha256').update(cle).digest('hex');

/** Poste actif correspondant à la clé de la requête, ou null. */
export async function posteDeLaRequete(req: Request) {
  const cle = req.headers.get(ENTETE_POSTE)?.trim();
  if (!cle || !cle.startsWith('poste_') || cle.length > 200) return null;
  const h = empreinteCle(cle);
  const poste = await prisma.posteEcole.findUnique({ where: { cleHash: h }, include: { institution: true } });
  if (!poste || !poste.active || !poste.institution.active) return null;
  // Comparaison à temps constant (ceinture et bretelles : la recherche se fait déjà sur l'empreinte)
  const a = Buffer.from(poste.cleHash, 'hex');
  const b = Buffer.from(h, 'hex');
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return poste;
}

/** Identifiants des élèves de l'école qui peuvent se servir du poste. */
export async function elevesDeLEcole(institutionId: string) {
  return prisma.user.findMany({
    where: {
      institutionId,
      role: 'STUDENT',
      status: 'ACTIVE',
      OR: [{ accessExpiresAt: null }, { accessExpiresAt: { gt: new Date() } }],
    },
    select: {
      id: true,
      email: true,
      name: true,
      firstName: true,
      lastName: true,
      password: true,
      studentType: true,
      university: true,
      paymentStatus: true,
      accessExpiresAt: true,
    },
  });
}

/** Date reçue d'un poste : acceptée seulement si elle est plausible (pas dans le futur, moins d'un an). */
export function datePlausible(v: unknown): Date | null {
  if (typeof v !== 'string' && typeof v !== 'number') return null;
  const d = new Date(v);
  const t = d.getTime();
  if (isNaN(t) || t > Date.now() + 5 * 60_000 || Date.now() - t > 366 * 86_400_000) return null;
  return d;
}

/** Note d'un quiz à partir des réponses par numéro de question (« 0 » → « B »…). */
export function noter(questions: { order: number; correctOption: string }[], reponses: Record<string, unknown>) {
  let score = 0;
  for (const q of questions) {
    const r = String(reponses?.[String(q.order)] ?? '').trim().toUpperCase();
    if (r && r === String(q.correctOption ?? '').trim().toUpperCase()) score++;
  }
  const total = questions.length;
  return { score, total, passed: total > 0 && score / total >= 0.7 };
}

const RANG = { NOT_STARTED: 0, IN_PROGRESS: 1, COMPLETED: 2 } as const;
export type Statut = keyof typeof RANG;
export const statutValide = (s: unknown): s is Statut => typeof s === 'string' && s in RANG;
/** Garde le plus avancé des deux statuts. */
export const meilleurStatut = (a: Statut, b: Statut): Statut => (RANG[a] >= RANG[b] ? a : b);
