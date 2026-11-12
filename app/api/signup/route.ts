export const dynamic = 'force-dynamic';

import { NextResponse, after } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { tropDEssais, tropAujourdhui } from '@/lib/quota';
import { adresseIP } from '@/lib/securite';
import { sendEmail } from '@/lib/email';
import { LEGAL } from '@/lib/legal';
import { compteDepuisDossier, courrielDeConfirmation, menageDossiersExpires, mettreDeCote, MOT_DE_PASSE_LONGUEUR_MAX, type DossierInscription } from '@/lib/inscription-confirmation';
import { erreurDateNaissance, erreurTelephone, lireDateNaissance, telephonePropre } from '@/lib/controle-inscription';

// Poste d'école sans Internet : aucun email ne peut partir, l'inscription crée donc le compte tout de suite.
const HORS_LIGNE = process.env.SAVOIRIA_LOCAL === '1';

export async function POST(request: Request) {
  try {
    // Anti-robots : 60 tentatives d'inscription par heure et par adresse IP (une classe entière derrière la même connexion, erreurs de saisie comprises)
    if (await tropDEssais('inscription', adresseIP(request), 60)) {
      return NextResponse.json({ error: 'Trop d\'inscriptions depuis cette connexion. Réessayez dans une heure.' }, { status: 429 });
    }
    const body = await request.json();
    const {
      firstName,
      lastName,
      name,
      email,
      password,
      birthDate,
      countryCode,
      dialCode,
      phone,
      dossierNumber,
      studentType,
      university,
      paymentMethod,
      partnerCode,
      academicHonorCodeAccepted,
    } = body ?? {};

    const causes: string[] = [];
    let errorField: string | null = null;
    let dejaInscrit = false;

    // 1. Validation du prénom et du nom
    const trimmedFirst = String(firstName || '').trim();
    const trimmedLast = String(lastName || '').trim();
    const compositeName = String(name || `${trimmedFirst} ${trimmedLast}`).trim();

    if (!trimmedFirst && !trimmedLast && !compositeName) {
      causes.push("Nom complet manquant : Veuillez renseigner votre prénom et nom.");
      if (!errorField) errorField = 'firstName';
    }

    // 2. Validation de l'email
    const trimmedEmail = String(email || '').trim().toLowerCase();
    if (!trimmedEmail) {
      causes.push("Email manquant : L'adresse email est requise pour créer votre compte.");
      if (!errorField) errorField = 'email';
    } else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmedEmail)) {
      causes.push(`Format d'email invalide ("${trimmedEmail}") : Veuillez entrer une adresse email valide (ex: etudiant@gmail.com).`);
      if (!errorField) errorField = 'email';
    } else {
      // Adresse déjà inscrite : en ligne, on ne le dit PAS à l'écran (sinon n'importe qui peut savoir qui a un compte) ;
      // la réponse est la même que pour une nouvelle inscription, et le vrai propriétaire est prévenu par email.
      const existing = await prisma.user.findUnique({ where: { email: trimmedEmail }, select: { id: true } });
      dejaInscrit = !!existing;
      // Poste hors ligne (salle de classe, aucun email possible) : on le dit clairement, comme avant.
      if (dejaInscrit && HORS_LIGNE) {
        causes.push("Email déjà utilisé : un compte existe déjà avec cette adresse. Connectez-vous ou réinitialisez votre mot de passe.");
        if (!errorField) errorField = 'email';
      }
    }

    // 3. Validation du mot de passe
    const rawPassword = String(password || '');
    if (!rawPassword) {
      causes.push("Mot de passe manquant : Veuillez choisir un mot de passe pour sécuriser votre compte.");
      if (!errorField) errorField = 'password';
    } else if (rawPassword.length < 10) {
      causes.push("Mot de passe trop court : Le mot de passe doit comporter au moins 10 caractères.");
      if (!errorField) errorField = 'password';
    } else if (rawPassword.length > MOT_DE_PASSE_LONGUEUR_MAX) {
      causes.push(`Mot de passe trop long : ${MOT_DE_PASSE_LONGUEUR_MAX} caractères au plus.`);
      if (!errorField) errorField = 'password';
    }

    // 4. Validation du numéro de dossier
    let validDossier = String(dossierNumber || '').trim();
    if (!validDossier) {
      const cleanPrefix = String(dialCode || '+243').replace(/[^0-9]/g, '') || '243';
      const yearSuffix = new Date().getFullYear().toString().slice(-2);
      const randomDigits = Math.floor(10000 + Math.random() * 90000);
      validDossier = `${cleanPrefix}-${yearSuffix}-${randomDigits}`;
    } else {
      const existingDossier = await prisma.user.findUnique({ where: { dossierNumber: validDossier } });
      if (existingDossier) {
        const cleanPrefix = String(dialCode || '+243').replace(/[^0-9]/g, '') || '243';
        const yearSuffix = new Date().getFullYear().toString().slice(-2);
        const randomDigits = Math.floor(10000 + Math.random() * 90000);
        validDossier = `${cleanPrefix}-${yearSuffix}-${randomDigits}`;
      }
    }

    // 5. Validation du type d'étudiant et de l'université partenaire
    const resolvedType = studentType === 'UNIVERSITAIRE' ? 'UNIVERSITAIRE' : 'LIBRE';
    let resolvedUniversity = university ? String(university).trim() : null;
    if (resolvedType === 'UNIVERSITAIRE' && !resolvedUniversity) {
      causes.push("Université partenaire obligatoire : Pour un étudiant sous convention de partenariat, veuillez spécifier votre université.");
      if (!errorField) errorField = 'university';
    }

    // 5b. Code de convention : il identifie l'établissement ET la session (promotion).
    // Codes gérés dans /admin/partners ; un code expire à la fin de sa session.
    let partnerInstitutionId: string | null = null;
    let partnerSessionId: string | null = null;
    if (resolvedType === 'UNIVERSITAIRE') {
      const submitted = String(partnerCode || '').trim().toUpperCase();
      const access = submitted
        ? await prisma.accessCode.findUnique({
            where: { code: submitted },
            include: { institution: true, session: true },
          })
        : null;
      const valid =
        !!access && access.active && access.institution.active && access.session.endDate >= new Date();
      if (!valid) {
        causes.push("Code de convention invalide ou expiré : demandez le code de la session en cours à votre établissement.");
        if (!errorField) errorField = 'partnerCode';
      } else {
        partnerInstitutionId = access.institutionId;
        partnerSessionId = access.sessionId;
        resolvedUniversity = access.institution.name; // l'établissement est celui du code
      }
    }

    // 6. Charte d'intégrité académique et anti-plagiat
    if (academicHonorCodeAccepted === false) {
      causes.push("Charte d'intégrité académique obligatoire : Vous devez souscrire à la charte anti-plagiat pour être admis.");
      if (!errorField) errorField = 'academicHonorCode';
    }

    // 7. Date de naissance : obligatoire, au format AAAA-MM-JJ ; la date enregistrée est exactement celle contrôlée.
    let parsedBirthDate: Date | null = null;
    const erreurDate = erreurDateNaissance(birthDate);
    if (erreurDate) {
      causes.push(`Date de naissance : ${erreurDate}`);
      if (!errorField) errorField = 'birthDate';
    } else {
      parsedBirthDate = lireDateNaissance(birthDate);
    }

    // 8. Téléphone : obligatoire, chiffres seulement (avec indicatif)
    const erreurTel = erreurTelephone(phone);
    if (erreurTel) {
      causes.push(`Téléphone : ${erreurTel}`);
      if (!errorField) errorField = 'phone';
    }

    if (causes.length > 0) {
      return NextResponse.json(
        {
          error: causes.length > 1 ? `${causes.length} points à corriger avant de continuer.` : 'Un point à corriger avant de continuer.',
          causes,
          field: errorField,
        },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(rawPassword, 12);

    if (dejaInscrit) {
      // Aucun compte créé ni modifié. Un seul email d'avertissement par jour pour une même adresse (pas de harcèlement possible).
      if (!(await tropAujourdhui('inscription-existant', trimmedEmail, 1))) {
        // Pas de lien dans l'email : l'adresse du site ne doit jamais venir de la requête (elle pourrait être falsifiée).
        after(() =>
          sendEmail({
            to: trimmedEmail,
            subject: 'Vous avez déjà un compte SavoirIA',
            text: "Bonjour,\n\nUne inscription vient d'être tentée avec votre adresse, mais vous avez déjà un compte SavoirIA.\n\nPour y accéder, ouvrez la page de connexion de SavoirIA. Si vous avez oublié votre mot de passe, utilisez « Mot de passe oublié ? » sur cette page.\n\nSi ce n'était pas vous, ignorez cet email : votre compte n'a pas été modifié.",
            html: "<p>Bonjour,</p><p>Une inscription vient d'être tentée avec votre adresse, mais vous avez déjà un compte SavoirIA.</p><p>Pour y accéder, ouvrez la page de connexion de SavoirIA. Si vous avez oublié votre mot de passe, utilisez « Mot de passe oublié ? » sur cette page.</p><p style=\"color:#666\">Si ce n'était pas vous, ignorez cet email : votre compte n'a pas été modifié.</p>",
          })
        );
      }
      return NextResponse.json({ success: true, confirmation: true });
    }
    const resolvedPaymentStatus = resolvedType === 'UNIVERSITAIRE' ? 'EXEMPTED' : 'PENDING';
    // Montant fixé par le serveur, jamais par le navigateur
    const resolvedPaymentAmount = resolvedType === 'UNIVERSITAIRE' ? 0 : Number(process.env.COURSE_PRICE_USD || 500);

    const dossier: DossierInscription = {
      email: trimmedEmail,
      password: hashedPassword,
      name: compositeName || (trimmedFirst ? `${trimmedFirst} ${trimmedLast}`.trim() : trimmedEmail.split('@')[0]),
      firstName: trimmedFirst || null,
      lastName: trimmedLast || null,
      institutionId: partnerInstitutionId,
      courseSessionId: partnerSessionId,
      birthDate: parsedBirthDate ? parsedBirthDate.toISOString() : null,
      countryCode: countryCode ? String(countryCode) : null,
      dialCode: dialCode ? String(dialCode) : null,
      phone: telephonePropre(String(phone)),
      dossierNumber: validDossier,
      // Plus de photo à l'inscription : le visage « témoin » est pris dans l'empreinte SavoirIA (stockage privé).
      studentType: resolvedType,
      university: resolvedUniversity,
      paymentStatus: resolvedPaymentStatus,
      paymentMethod: paymentMethod ? String(paymentMethod) : (resolvedType === 'UNIVERSITAIRE' ? 'EXEMPT_UNIVERSITY' : 'MPESA'),
      paymentAmount: resolvedPaymentAmount,
    };

    if (HORS_LIGNE) {
      // Poste hors ligne : pas de confirmation par email possible, le compte « en attente » est créé tout de suite.
      await prisma.user.create({ data: compteDepuisDossier(dossier) });
      return NextResponse.json({ success: true });
    }

    // En ligne : aucun compte n'est créé maintenant. Le dossier est mis de côté et un lien de confirmation part par email.
    // La réponse est la même que pour une adresse déjà inscrite. Garde-fous contre les abus, du plus étroit au plus large
    // (une demande arrêtée par un garde-fou ne consomme pas les suivants) :
    //  - 15 liens par jour depuis une même connexion (une seule machine ne peut pas épuiser le plafond du site) ;
    //  - 3 liens par jour pour une même adresse depuis une même connexion (un tiers ne bloque pas le vrai élève) ;
    //  - 8 liens par jour pour une même adresse, toutes connexions confondues (la boîte de l'élève n'est pas inondée) ;
    //  - un plafond quotidien pour tout le site (le site ne sert pas à envoyer des emails en masse).
    const ip = adresseIP(request);
    const plafondSite = Number(process.env.CONFIRMATIONS_MAX_PAR_JOUR || 500);
    const bloqueAvantPlafond =
      (await tropAujourdhui('inscription-confirmation-connexion', ip, 15)) ||
      (await tropAujourdhui('inscription-confirmation', `${trimmedEmail}|${ip}`, 3)) ||
      (await tropAujourdhui('inscription-confirmation-adresse', trimmedEmail, 8));
    const plafondAtteint = !bloqueAvantPlafond && (await tropAujourdhui('inscription-confirmation-site', 'total', plafondSite));
    if (plafondAtteint) {
      console.error('[inscription] Plafond quotidien de liens de confirmation atteint : plus aucun email envoyé aujourd\'hui.');
      // Une seule alerte par jour à l'administration : de vrais élèves n'ont peut-être pas reçu leur lien.
      if (!(await tropAujourdhui('inscription-confirmation-alerte', 'site', 1))) {
        after(() =>
          sendEmail({
            to: process.env.ALERTE_ADMIN_EMAIL || LEGAL.contactEmail,
            subject: 'SavoirIA : plafond des inscriptions atteint aujourd\'hui',
            text: `Le plafond de ${plafondSite} liens de confirmation par jour vient d'être atteint. Jusqu'à minuit (heure universelle), les nouvelles inscriptions ne reçoivent plus de lien : les élèves concernés devront recommencer demain. Si ce n'est pas une vraie affluence, il s'agit peut-être d'un abus du formulaire d'inscription.`,
            html: `<p>Le plafond de <strong>${plafondSite}</strong> liens de confirmation par jour vient d'être atteint.</p><p>Jusqu'à minuit (heure universelle), les nouvelles inscriptions ne reçoivent plus de lien : les élèves concernés devront recommencer demain.</p><p>Si ce n'est pas une vraie affluence, il s'agit peut-être d'un abus du formulaire d'inscription.</p>`,
          })
        );
      }
    } else if (!bloqueAvantPlafond) {
      const jeton = await mettreDeCote(dossier);
      after(async () => {
        await sendEmail({ to: trimmedEmail, ...courrielDeConfirmation(jeton) });
        await menageDossiersExpires();
      });
    }
    return NextResponse.json({ success: true, confirmation: true });
  } catch (error: any) {
    console.error('Signup error:', error);

    const causes: string[] = [];
    let errorField: string | null = null;

    if (error?.code === 'P2002') {
      causes.push("Conflit de données : Cette adresse email ou ce numéro de dossier est déjà utilisé.");
      errorField = 'email';
    } else {
      causes.push("Une erreur technique imprévue est survenue lors de l'enregistrement de votre compte.");
    }

    return NextResponse.json(
      {
        error: "Impossible de finaliser l'inscription.",
        causes,
        field: errorField,
      },
      { status: 500 }
    );
  }
}
