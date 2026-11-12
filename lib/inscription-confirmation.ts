/**
 * Confirmation de l'adresse email à l'inscription.
 * 1. L'inscription contrôlée est mise de côté (table InscriptionEnAttente) et un lien est envoyé par email.
 * 2. Au clic sur le lien (valable 24 h), le compte est créé « en attente » de validation par l'administration.
 * Ainsi personne ne peut déposer un dossier avec l'adresse de quelqu'un d'autre, ni deviner qui est inscrit.
 */
import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export const DUREE_LIEN_MS = 24 * 3600_000;

/** Dossier d'inscription déjà contrôlé par le serveur, tel qu'il sera enregistré dans le compte. */
export interface DossierInscription {
  email: string;
  password: string; // déjà haché (bcrypt)
  name: string;
  firstName: string | null;
  lastName: string | null;
  institutionId: string | null;
  courseSessionId: string | null;
  birthDate: string | null; // AAAA-MM-JJ…, relu en date à la création
  countryCode: string | null;
  dialCode: string | null;
  phone: string;
  dossierNumber: string;
  studentType: string;
  university: string | null;
  paymentStatus: string;
  paymentMethod: string;
  paymentAmount: number;
}

export function hacherJeton(jeton: string): string {
  return createHash('sha256').update(jeton).digest('hex');
}

/** Adresse publique du site pour les liens des emails : vient de la configuration, jamais de la requête. */
export function adresseDuSite(): string {
  const base = process.env.SITE_URL || process.env.AUTH_URL || process.env.NEXTAUTH_URL || 'https://www.savoiria.online';
  return base.trim().replace(/\/$/, '');
}

/** Données du compte « en attente de validation » créé à partir d'un dossier contrôlé. */
export function compteDepuisDossier(d: DossierInscription) {
  return {
    email: d.email,
    password: d.password,
    name: d.name,
    firstName: d.firstName,
    lastName: d.lastName,
    role: 'STUDENT' as const,
    // Tous les nouveaux comptes attendent une validation de l'administration :
    // paiement vérifié (candidat libre) ou présence sur la liste de l'établissement (partenaire).
    status: 'PENDING' as const,
    institutionId: d.institutionId,
    courseSessionId: d.courseSessionId,
    birthDate: d.birthDate ? new Date(d.birthDate) : null,
    countryCode: d.countryCode,
    dialCode: d.dialCode,
    phone: d.phone,
    dossierNumber: d.dossierNumber,
    studentType: d.studentType,
    university: d.university,
    paymentStatus: d.paymentStatus,
    paymentMethod: d.paymentMethod,
    paymentAmount: d.paymentAmount,
  };
}

/** Efface les dossiers jamais confirmés dont le lien a expiré (appelé après chaque inscription ou confirmation). */
export async function menageDossiersExpires(maintenant: Date = new Date()): Promise<void> {
  await prisma.inscriptionEnAttente.deleteMany({ where: { expireLe: { lt: maintenant } } }).catch(() => {});
}

/** Met le dossier de côté et renvoie le jeton à placer dans le lien (seule son empreinte est gardée en base). */
export async function mettreDeCote(dossier: DossierInscription, maintenant: Date = new Date()): Promise<string> {
  const jeton = randomBytes(32).toString('base64url');
  await prisma.inscriptionEnAttente.create({
    data: { email: dossier.email, jetonHache: hacherJeton(jeton), donnees: dossier as any, expireLe: new Date(maintenant.getTime() + DUREE_LIEN_MS) },
  });
  return jeton;
}

export type ResultatConfirmation = 'ok' | 'expire' | 'invalide' | 'motdepasse';

function nouveauNumeroDossier(dossier: DossierInscription): string {
  const prefixe = String(dossier.dialCode || '+243').replace(/[^0-9]/g, '') || '243';
  const annee = new Date().getFullYear().toString().slice(-2);
  return `${prefixe}-${annee}-${Math.floor(10000 + Math.random() * 90000)}`;
}

/**
 * Clic sur le lien : crée le compte « en attente » si le jeton est bon, encore valable, ET si le mot de passe saisi
 * est celui choisi à l'inscription. Sans ce contrôle, quelqu'un pourrait s'inscrire avec l'adresse d'un élève et son
 * propre mot de passe, puis laisser l'élève confirmer ce dossier sans le savoir.
 */
export async function confirmerInscription(jeton: string, motDePasse: string, maintenant: Date = new Date()): Promise<ResultatConfirmation> {
  if (typeof jeton !== 'string' || jeton.length < 20 || jeton.length > 200) return 'invalide';
  const attente = await prisma.inscriptionEnAttente.findUnique({ where: { jetonHache: hacherJeton(jeton) } });
  if (!attente) return 'invalide';
  if (attente.expireLe.getTime() <= maintenant.getTime()) {
    await prisma.inscriptionEnAttente.delete({ where: { id: attente.id } }).catch(() => {});
    return 'expire';
  }
  const dossier = attente.donnees as unknown as DossierInscription;
  if (typeof motDePasse !== 'string' || !motDePasse || motDePasse.length > 200) return 'motdepasse';
  if (!(await bcrypt.compare(motDePasse, dossier.password))) return 'motdepasse';

  // Un compte existe déjà avec cette adresse (autre lien confirmé entre-temps) : on ne crée rien de plus.
  const existant = await prisma.user.findUnique({ where: { email: dossier.email }, select: { id: true } });
  if (!existant) {
    const pris = await prisma.user.findUnique({ where: { dossierNumber: dossier.dossierNumber }, select: { id: true } });
    const donnees = compteDepuisDossier(pris ? { ...dossier, dossierNumber: nouveauNumeroDossier(dossier) } : dossier);
    try {
      await prisma.user.create({ data: donnees });
    } catch (e: any) {
      // Deux clics en même temps : le premier a créé le compte, le second n'a plus rien à faire.
      if (e?.code !== 'P2002') throw e;
    }
  }
  // L'adresse est confirmée : tous les dossiers en attente pour cette adresse (autres liens) sont effacés.
  await prisma.inscriptionEnAttente.deleteMany({ where: { email: dossier.email } }).catch(() => {});
  return 'ok';
}

/** Email envoyé à l'inscription : un seul lien, construit avec l'adresse du site de la configuration. */
export function courrielDeConfirmation(jeton: string): { subject: string; text: string; html: string } {
  const lien = `${adresseDuSite()}/auth/confirmer?jeton=${encodeURIComponent(jeton)}`;
  return {
    subject: 'Confirmez votre inscription à SavoirIA',
    text: `Bonjour,\n\nPour terminer votre inscription à SavoirIA, confirmez votre adresse en ouvrant ce lien (valable 24 heures) :\n${lien}\n\nLe mot de passe choisi à l'inscription vous sera demandé.\n\nVotre dossier sera ensuite validé par l'administration.\n\nSi vous n'avez pas demandé cette inscription, ignorez cet email : aucun compte ne sera créé.`,
    html: `<p>Bonjour,</p><p>Pour terminer votre inscription à SavoirIA, confirmez votre adresse (lien valable 24 heures) :</p><p><a href="${lien}" style="display:inline-block;padding:12px 20px;background:#2563eb;color:#fff;border-radius:10px;text-decoration:none;font-weight:bold">Confirmer mon inscription</a></p><p>Si le bouton ne marche pas, copiez cette adresse dans votre navigateur :<br>${lien}</p><p>Le mot de passe choisi à l'inscription vous sera demandé. Votre dossier sera ensuite validé par l'administration.</p><p style="color:#666">Si vous n'avez pas demandé cette inscription, ignorez cet email : aucun compte ne sera créé.</p>`,
  };
}
