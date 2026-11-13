/**
 * Inscriptions d'un élève aux formations (table InscriptionFormation). Côté serveur seulement.
 * Pendant la transition, les colonnes du compte (statut, type d'étudiant, paiement) restent celles de la
 * première formation de l'élève ; l'admin validera formation par formation à l'étape suivante.
 */
import { prisma } from '@/lib/prisma';
import { FORMATION_PAR_DEFAUT, formationOuverte, prixInscription, statutDepuisCompte } from '@/lib/formations';

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
