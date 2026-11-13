/**
 * Inscriptions d'un élève aux formations (table InscriptionFormation). Côté serveur seulement.
 * Pendant la transition, les colonnes du compte (statut, type d'étudiant, paiement) restent celles de la
 * première formation de l'élève ; l'admin validera formation par formation à l'étape suivante.
 */
import { prisma } from '@/lib/prisma';
import { FORMATION_PAR_DEFAUT, formationOuverte, prixInscription, statutDepuisCompte, STATUTS_INSCRIPTION } from '@/lib/formations';
import { moyenPaiementConnu, statutPaiementConnu } from '@/lib/paiement';

interface PremiereInscription {
  formation?: string | null;
  statutCompte: string;
  studentType: string;
  university?: string | null;
  paymentStatus: string;
  paymentMethod?: string | null;
  paymentAmount?: number | null;
  courseSessionId?: string | null;
}

/**
 * Inscription créée en même temps que le compte : elle reprend ce qui est enregistré sur le compte.
 * Sans formation (dossier d'avant les formations multiples, testeur, compte créé par l'admin) : CS50x.
 * Une formation demandée est gardée telle quelle, même si elle a été fermée entre-temps : jamais remplacée
 * par une autre (son prix ne correspondrait plus).
 */
export function premiereInscription(p: PremiereInscription) {
  const statut = statutDepuisCompte(p.statutCompte);
  return {
    formation: typeof p.formation === 'string' && p.formation ? p.formation : FORMATION_PAR_DEFAUT,
    statut,
    studentType: p.studentType,
    university: p.university ?? null,
    paymentStatus: p.paymentStatus,
    paymentMethod: p.paymentMethod ?? null,
    paymentAmount: p.paymentAmount ?? null,
    courseSessionId: p.courseSessionId ?? null,
    valideeLe: statut === 'VALIDEE' ? new Date() : null,
  };
}

export type ResultatAjout = 'ok' | 'inconnue' | 'deja' | 'trop';
/** Nombre maximal d'inscriptions en attente à la fois pour un élève. */
export const DEMANDES_EN_ATTENTE_MAX = 3;

/**
 * Un élève déjà inscrit demande une formation de plus : elle reste « en attente » jusqu'à la validation
 * de l'administration. Le prix est fixé ici, jamais par le navigateur.
 */
export async function ajouterFormation(userId: string, formationId: unknown): Promise<ResultatAjout> {
  const formation = formationOuverte(formationId);
  if (!formation) return 'inconnue';
  const existantes = await prisma.inscriptionFormation.findMany({ where: { userId }, select: { formation: true, statut: true } });
  if (existantes.some((i) => i.formation === formation.id)) return 'deja';
  if (existantes.filter((i) => i.statut === 'EN_ATTENTE').length >= DEMANDES_EN_ATTENTE_MAX) return 'trop';
  try {
    await prisma.inscriptionFormation.create({
      data: {
        userId,
        formation: formation.id,
        statut: 'EN_ATTENTE',
        studentType: 'LIBRE',
        paymentStatus: 'PENDING',
        paymentMethod: 'A_CONVENIR',
        paymentAmount: prixInscription(formation, 'LIBRE', process.env.COURSE_PRICE_USD),
      },
    });
  } catch (e: any) {
    if (e?.code === 'P2002') return 'deja'; // deux demandes au même instant
    throw e;
  }
  return 'ok';
}

/**
 * Transition : l'admin modifie encore le compte (validation, paiement). Si l'élève n'a qu'UNE inscription,
 * elle suit le compte tout de suite. Avec plusieurs inscriptions, on ne devine pas laquelle est visée :
 * rien n'est changé ici (la validation par formation arrive avec l'écran d'admin dédié).
 */
export async function refleterCompteSurInscription(userId: string): Promise<void> {
  const compte = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, status: true, studentType: true, university: true, paymentStatus: true, paymentMethod: true, paymentAmount: true, courseSessionId: true, inscriptions: { select: { id: true, valideeLe: true } } },
  });
  if (!compte || compte.role !== 'STUDENT' || compte.inscriptions.length !== 1) return;
  const statut = statutDepuisCompte(compte.status);
  const seule = compte.inscriptions[0];
  await prisma.inscriptionFormation.update({
    where: { id: seule.id },
    data: {
      statut,
      studentType: compte.studentType,
      university: compte.university,
      paymentStatus: compte.paymentStatus,
      paymentMethod: compte.paymentMethod,
      paymentAmount: compte.paymentAmount,
      courseSessionId: compte.courseSessionId,
      valideeLe: statut === 'VALIDEE' ? seule.valideeLe ?? new Date() : null,
    },
  });
}

export interface ChangementInscription {
  statut?: unknown;
  paymentStatus?: unknown;
  paymentMethod?: unknown;
  paymentAmount?: unknown;
}

export type ResultatChangement = { ok: true; compteActive: boolean } | { ok: false; erreur: string; code: number };

/**
 * L'admin change une inscription (validation, paiement). Le compte devient actif dès sa première
 * inscription validée. Refuser ou suspendre une formation ne touche pas au compte (l'élève peut en
 * suivre une autre) : pour bloquer tout le compte, l'admin passe par « Utilisateurs ».
 * Élève à une seule inscription : le compte reprend le paiement, pour que les anciens écrans restent justes.
 */
export async function changerInscription(id: unknown, c: ChangementInscription): Promise<ResultatChangement> {
  if (typeof id !== 'string' || !id) return { ok: false, erreur: 'Inscription inconnue.', code: 400 };
  const inscription = await prisma.inscriptionFormation.findUnique({
    where: { id },
    include: { user: { select: { id: true, role: true, status: true, _count: { select: { inscriptions: true } } } } },
  });
  if (!inscription || inscription.user.role !== 'STUDENT') return { ok: false, erreur: 'Inscription introuvable.', code: 404 };

  const data: Record<string, unknown> = {};
  if (c.statut !== undefined) {
    if (!(STATUTS_INSCRIPTION as readonly string[]).includes(c.statut as string)) return { ok: false, erreur: 'Statut inconnu.', code: 400 };
    data.statut = c.statut;
    data.valideeLe = c.statut === 'VALIDEE' ? inscription.valideeLe ?? new Date() : null;
  }
  if (c.paymentStatus !== undefined) {
    if (!statutPaiementConnu(c.paymentStatus)) return { ok: false, erreur: 'Statut de paiement inconnu.', code: 400 };
    data.paymentStatus = c.paymentStatus;
  }
  if (c.paymentMethod !== undefined) {
    if (c.paymentMethod !== null && c.paymentMethod !== '' && !moyenPaiementConnu(c.paymentMethod)) return { ok: false, erreur: 'Moyen de paiement inconnu.', code: 400 };
    data.paymentMethod = c.paymentMethod ? String(c.paymentMethod) : null;
  }
  if (c.paymentAmount !== undefined) {
    const m = c.paymentAmount === null || c.paymentAmount === '' ? null : Number(c.paymentAmount);
    if (m !== null && (!Number.isFinite(m) || m < 0 || m > 100_000)) return { ok: false, erreur: 'Montant invalide.', code: 400 };
    data.paymentAmount = m;
  }
  if (!Object.keys(data).length) return { ok: false, erreur: 'Rien à modifier.', code: 400 };

  await prisma.inscriptionFormation.update({ where: { id }, data });

  const compte: Record<string, unknown> = {};
  const compteActive = data.statut === 'VALIDEE' && inscription.user.status === 'PENDING';
  if (compteActive) compte.status = 'ACTIVE';
  if (inscription.user._count.inscriptions === 1) {
    for (const k of ['paymentStatus', 'paymentMethod', 'paymentAmount'] as const) if (k in data) compte[k] = data[k];
  }
  if (Object.keys(compte).length) await prisma.user.update({ where: { id: inscription.user.id }, data: compte });
  return { ok: true, compteActive };
}
