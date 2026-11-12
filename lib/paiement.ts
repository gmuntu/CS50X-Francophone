/**
 * Texte du paiement d'un élève, en français, partagé par la liste et la fiche de l'admin :
 * les deux écrans affichent ainsi toujours la même chose.
 */
import { PAYMENT_METHODS } from '@/config/african-countries';

/** Statuts de paiement acceptés en base. */
export const STATUTS_PAIEMENT = ['PAID', 'PENDING', 'EXEMPTED', 'FAILED'] as const;

const STATUTS_FR: Record<string, string> = {
  PAID: 'Payé',
  PENDING: 'En attente',
  EXEMPTED: 'Exempté',
  FAILED: 'Échoué',
};

/** Statut de paiement en français (« EXEMPTED » → « Exempté »). */
export function statutPaiementFr(statut: string | null | undefined): string {
  return STATUTS_FR[String(statut || '').toUpperCase()] || 'Non renseigné';
}

/** Moyen de paiement en français (« A_CONVENIR » → « À convenir »). */
export function moyenPaiementFr(moyen: string | null | undefined): string {
  if (!moyen) return 'Non renseigné';
  if (moyen === 'PERSONNEL') return 'Personnel';
  return PAYMENT_METHODS.find((m) => m.id === moyen)?.name || moyen;
}

export type TonPaiement = 'ok' | 'attente' | 'erreur' | 'neutre';

interface PaiementDUnCompte {
  role?: string | null;
  studentType?: string | null;
  paymentStatus?: string | null;
  paymentAmount?: number | null;
}

/** Résumé du paiement d'un compte : le même texte pour la liste et pour la fiche. */
export function resumePaiement(u: PaiementDUnCompte): { texte: string; ton: TonPaiement } {
  if (u.role === 'INSTRUCTOR' || u.role === 'ADMIN') return { texte: 'Personnel (0 USD)', ton: 'neutre' };
  if (u.studentType === 'UNIVERSITAIRE') return { texte: 'Exempté (0 USD, convention)', ton: 'ok' };
  const statut = String(u.paymentStatus || 'PENDING').toUpperCase();
  const montant = `${typeof u.paymentAmount === 'number' ? u.paymentAmount : 500} USD`;
  if (statut === 'EXEMPTED') return { texte: 'Exempté', ton: 'ok' };
  if (statut === 'PAID') return { texte: `Payé (${montant})`, ton: 'ok' };
  if (statut === 'PENDING') return { texte: `En attente (${montant})`, ton: 'attente' };
  if (statut === 'FAILED') return { texte: `Échoué (${montant})`, ton: 'erreur' };
  return { texte: 'Non renseigné', ton: 'erreur' };
}

/** Vrai si le statut de paiement est l'un des quatre statuts connus. */
export function statutPaiementConnu(statut: unknown): statut is (typeof STATUTS_PAIEMENT)[number] {
  return typeof statut === 'string' && (STATUTS_PAIEMENT as readonly string[]).includes(statut);
}

/** Vrai si le moyen de paiement fait partie de la liste proposée dans l'admin (ou « Personnel »). */
export function moyenPaiementConnu(moyen: unknown): moyen is string {
  return typeof moyen === 'string' && (moyen === 'PERSONNEL' || PAYMENT_METHODS.some((m) => m.id === moyen));
}
