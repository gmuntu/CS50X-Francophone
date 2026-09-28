export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
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
      photoUrl,
      studentType,
      university,
      paymentMethod,
      partnerCode,
      academicHonorCodeAccepted,
    } = body ?? {};

    const causes: string[] = [];
    let errorField: string | null = null;

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
      const existing = await prisma.user.findUnique({ where: { email: trimmedEmail } });
      if (existing) {
        causes.push(`Email déjà utilisé : Un compte existe déjà avec l'adresse "${trimmedEmail}". Connectez-vous directement ou réinitialisez votre mot de passe.`);
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

    // 7. Date de naissance
    let parsedBirthDate: Date | null = null;
    if (birthDate) {
      const d = new Date(birthDate);
      if (!isNaN(d.getTime())) {
        parsedBirthDate = d;
      }
    }

    if (causes.length > 0) {
      return NextResponse.json(
        {
          error: `Inscription rejetée : ${causes.length} anomalie${causes.length > 1 ? 's' : ''} à corriger.`,
          causes,
          field: errorField,
        },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(rawPassword, 12);
    const resolvedPaymentStatus = resolvedType === 'UNIVERSITAIRE' ? 'EXEMPTED' : 'PENDING';
    // Montant fixé par le serveur, jamais par le navigateur
    const resolvedPaymentAmount = resolvedType === 'UNIVERSITAIRE' ? 0 : Number(process.env.COURSE_PRICE_USD || 500);

    const user = await prisma.user.create({
      data: {
        email: trimmedEmail,
        password: hashedPassword,
        name: compositeName || (trimmedFirst ? `${trimmedFirst} ${trimmedLast}`.trim() : trimmedEmail.split('@')[0]),
        firstName: trimmedFirst || null,
        lastName: trimmedLast || null,
        role: 'STUDENT',
        // Tous les nouveaux comptes attendent une validation de l'administration :
        // paiement vérifié (candidat libre) ou présence sur la liste de l'établissement (partenaire).
        status: 'PENDING',
        institutionId: partnerInstitutionId,
        courseSessionId: partnerSessionId,
        birthDate: parsedBirthDate,
        countryCode: countryCode ? String(countryCode) : null,
        dialCode: dialCode ? String(dialCode) : null,
        phone: phone ? String(phone).trim() : null,
        dossierNumber: validDossier,
        photoUrl: photoUrl ? String(photoUrl) : null,
        // La photo est vérifiée manuellement par l'administration (jamais automatiquement)
        facialVerificationStatus: 'PENDING',
        studentType: resolvedType,
        university: resolvedUniversity,
        paymentStatus: resolvedPaymentStatus,
        paymentMethod: paymentMethod ? String(paymentMethod) : (resolvedType === 'UNIVERSITAIRE' ? 'EXEMPT_UNIVERSITY' : 'MPESA'),
        paymentAmount: resolvedPaymentAmount,
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        dossierNumber: user.dossierNumber,
        studentType: user.studentType,
      },
    });
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
