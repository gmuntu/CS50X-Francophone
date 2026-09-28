export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { generateDossierNumber } from '@/config/african-countries';

const SUPER_ADMIN_EMAILS = ['gmuntusip@gmail.com', 'admin@cs50x-francophone.com'];
const isSuperAdminEmail = (email: string | null | undefined) => !!email && SUPER_ADMIN_EMAILS.includes(email.toLowerCase().trim());

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Non authentifié', status: 401 as const };
  const dbUser = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (dbUser?.role !== 'ADMIN') return { error: 'Accès réservé aux administrateurs', status: 403 as const };
  return { ok: true as const, adminUser: dbUser };
}

// --------------------------------------------------------------------------
// POST : Enregistrement d'un nouvel étudiant par l'administrateur
// --------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    const guard = await requireAdmin();
    if ('error' in guard) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const body = await request.json();
    const {
      firstName,
      lastName,
      name,
      email,
      password,
      passwordConfirm,
      role = 'STUDENT',
      status = 'ACTIVE',
      phone,
      countryCode,
      dialCode,
      dossierNumber,
      birthDate,
      photoUrl,
      facialVerificationStatus = 'PENDING',
      studentType = 'LIBRE', // 'LIBRE' | 'UNIVERSITAIRE'
      university,
      paymentStatus = 'PENDING',
      paymentMethod,
      paymentAmount,
    } = body ?? {};

    // Collecte exhaustive des causes de rejet pour guider l'utilisateur
    const causes: string[] = [];
    let errorField: string | undefined = undefined;

    // 1. Validation du Nom / Prénom
    const finalFirstName = String(firstName || '').trim();
    const finalLastName = String(lastName || '').trim();
    const finalFullName = finalFirstName && finalLastName
      ? `${finalFirstName} ${finalLastName}`
      : String(name || '').trim() || `${finalFirstName} ${finalLastName}`.trim();

    if (!finalFirstName) {
      causes.push("Prénom manquant : Le prénom de l'étudiant est requis.");
      if (!errorField) errorField = 'firstName';
    }
    if (!finalLastName) {
      causes.push("Nom manquant : Le nom de famille de l'étudiant est requis.");
      if (!errorField) errorField = 'lastName';
    }

    // 2. Validation Email
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail) {
      causes.push("Email manquant : L'adresse email est requise pour créer le compte.");
      if (!errorField) errorField = 'email';
    } else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalizedEmail)) {
      causes.push(`Format d'email invalide ("${normalizedEmail}") : Veuillez entrer une adresse email valide (ex: jean.mukendi@domaine.com).`);
      if (!errorField) errorField = 'email';
    } else {
      const existingEmail = await prisma.user.findUnique({ where: { email: normalizedEmail } });
      if (existingEmail) {
        causes.push(`Email déjà utilisé : Un compte existe déjà avec l'adresse "${normalizedEmail}". Action requise : Utilisez une autre adresse email ou modifiez la fiche de l'utilisateur existant.`);
        if (!errorField) errorField = 'email';
      }
    }

    // 3. Contre-vérification du mot de passe
    const rawPassword = String(password || '');
    if (rawPassword.length < 6) {
      causes.push("Mot de passe trop court : Le mot de passe doit comporter au moins 6 caractères pour sécuriser le compte.");
      if (!errorField) errorField = 'password';
    }

    if (passwordConfirm !== undefined && passwordConfirm !== null) {
      if (rawPassword !== String(passwordConfirm)) {
        causes.push("Erreur de contre-vérification : Les deux mots de passe ne sont pas identiques (faute de frappe). Veuillez retaper la confirmation.");
        if (!errorField) errorField = 'passwordConfirm';
      }
    }

    // 4. Numéro de téléphone
    if (!phone || String(phone).trim() === '') {
      causes.push("Numéro de téléphone manquant : Le numéro de téléphone avec indicatif pays est obligatoire.");
      if (!errorField) errorField = 'phone';
    }

    // 5. Types d'étudiants & Université
    const isInstructor = role === 'INSTRUCTOR';
    const isUniversitaire = studentType === 'UNIVERSITAIRE' && !isInstructor;

    if (isUniversitaire && (!university || String(university).trim() === '')) {
      causes.push("Université partenaire obligatoire : Pour un étudiant universitaire exempté (0 USD), vous devez sélectionner une université conventionnée ou spécifier son nom.");
      if (!errorField) errorField = 'university';
    }

    // 6. Date de naissance (validation de cohérence)
    let parsedBirthDate: Date | null = null;
    if (birthDate) {
      const d = new Date(birthDate);
      if (isNaN(d.getTime())) {
        causes.push("Date de naissance invalide : Le format de la date est incorrect.");
        if (!errorField) errorField = 'birthDate';
      } else if (d > new Date()) {
        causes.push("Date de naissance impossible : La date de naissance ne peut pas être dans le futur.");
        if (!errorField) errorField = 'birthDate';
      } else {
        parsedBirthDate = d;
      }
    }

    // Si des causes de rejet ont été identifiées, renvoyer la liste complète immédiatement
    if (causes.length > 0) {
      return NextResponse.json(
        {
          error: `Enregistrement rejeté : ${causes.length} élément${causes.length > 1 ? 's' : ''} à corriger.`,
          causes,
          field: errorField,
        },
        { status: 400 }
      );
    }

    // 7. Numéro de dossier : doit commencer par le code pays
    let finalDossier = String(dossierNumber || '').trim();
    const countryPrefix = String(dialCode || countryCode || '243').replace(/[^0-9]/g, '');

    if (!finalDossier) {
      finalDossier = generateDossierNumber(countryPrefix);
    } else if (!finalDossier.startsWith(countryPrefix)) {
      finalDossier = `${countryPrefix}-${finalDossier}`;
    }

    const existingDossier = await prisma.user.findUnique({ where: { dossierNumber: finalDossier } });
    if (existingDossier) {
      finalDossier = generateDossierNumber(countryPrefix);
    }

    // 8. Types d'étudiants & Montant de paiement
    const finalAmount = isInstructor || isUniversitaire ? 0 : (typeof paymentAmount === 'number' ? paymentAmount : 500);
    const finalPaymentStatus = isInstructor || isUniversitaire ? 'EXEMPTED' : (paymentStatus || 'PENDING');
    const finalPaymentMethod = isInstructor ? 'PERSONNEL' : (isUniversitaire ? 'EXEMPT_UNIVERSITY' : paymentMethod);
    const finalStudentType = isInstructor ? 'PERSONNEL' : (isUniversitaire ? 'UNIVERSITAIRE' : 'LIBRE');

    // 9. Hachage du mot de passe
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    const created = await prisma.user.create({
      data: {
        name: finalFullName,
        firstName: finalFirstName || null,
        lastName: finalLastName || null,
        email: normalizedEmail,
        password: hashedPassword,
        role: ['STUDENT', 'INSTRUCTOR', 'ADMIN'].includes(role) ? role : 'STUDENT',
        status: ['ACTIVE', 'SUSPENDED', 'PENDING'].includes(status) ? status : 'ACTIVE',
        phone: phone ? String(phone).trim() : null,
        countryCode: countryCode ? String(countryCode).trim() : null,
        dialCode: dialCode ? String(dialCode).trim() : null,
        dossierNumber: finalDossier,
        birthDate: parsedBirthDate,
        photoUrl: photoUrl || null,
        facialVerificationStatus: ['PENDING', 'VERIFIED', 'REJECTED'].includes(facialVerificationStatus)
          ? facialVerificationStatus
          : 'PENDING',
        studentType: finalStudentType,
        university: isUniversitaire ? String(university).trim() : null,
        paymentStatus: finalPaymentStatus,
        paymentMethod: finalPaymentMethod || null,
        paymentAmount: finalAmount,
      },
      select: {
        id: true,
        name: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        status: true,
        phone: true,
        countryCode: true,
        dialCode: true,
        dossierNumber: true,
        birthDate: true,
        photoUrl: true,
        facialVerificationStatus: true,
        studentType: true,
        university: true,
        paymentStatus: true,
        paymentMethod: true,
        paymentAmount: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, user: JSON.parse(JSON.stringify(created)) });
  } catch (error: any) {
    console.error('Admin create user error:', error);
    const serverCauses: string[] = [];

    if (error?.code === 'P2002') {
      const targets = error?.meta?.target;
      const targetStr = Array.isArray(targets) ? targets.join(', ') : String(targets || '');
      if (targetStr.includes('email')) {
        serverCauses.push("Cette adresse email est déjà enregistrée dans la base de données. Veuillez utiliser une autre adresse.");
      } else if (targetStr.includes('dossierNumber')) {
        serverCauses.push("Ce numéro de dossier est déjà attribué. Cliquez sur 'Régénérer' pour en obtenir un nouveau.");
      } else {
        serverCauses.push(`Un conflit d'unicité est survenu sur le champ : ${targetStr}.`);
      }
    } else if (error?.name === 'PrismaClientValidationError') {
      serverCauses.push("Incompatibilité des données transmises avec le schéma de la base de données. Veuillez vérifier que tous les champs sont valides.");
    } else {
      serverCauses.push(error?.message || "Une erreur inattendue est survenue lors de l'enregistrement en base de données.");
    }

    return NextResponse.json(
      {
        error: "L'enregistrement a été rejeté par le serveur.",
        causes: serverCauses,
      },
      { status: 400 }
    );
  }
}

// --------------------------------------------------------------------------
// PUT : Modification complète d'un étudiant par l'administrateur
// --------------------------------------------------------------------------
export async function PUT(request: NextRequest) {
  try {
    const guard = await requireAdmin();
    if ('error' in guard) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const body = await request.json();
    const {
      userId,
      firstName,
      lastName,
      name,
      email,
      role,
      status,
      facialVerificationStatus,
      paymentStatus,
      paymentMethod,
      paymentAmount,
      university,
      studentType,
      phone,
      countryCode,
      dialCode,
      dossierNumber,
      birthDate,
      photoUrl,
      newPassword,
    } = body ?? {};

    if (!userId) return NextResponse.json({ error: 'Identifiant (userId) requis.' }, { status: 400 });

    const existingUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!existingUser) {
      return NextResponse.json({ error: 'Étudiant introuvable.' }, { status: 404 });
    }

    const data: any = {};

    // 1. Prénom, Nom, Nom complet
    if (firstName !== undefined || lastName !== undefined || name !== undefined) {
      const finalFirst = firstName !== undefined ? String(firstName).trim() : (existingUser.firstName || '');
      const finalLast = lastName !== undefined ? String(lastName).trim() : (existingUser.lastName || '');
      data.firstName = finalFirst || null;
      data.lastName = finalLast || null;
      data.name = finalFirst && finalLast ? `${finalFirst} ${finalLast}` : (String(name || '').trim() || `${finalFirst} ${finalLast}`.trim() || existingUser.name);
    }

    // 2. Email avec vérification d'unicité
    if (email !== undefined && String(email).trim().toLowerCase() !== existingUser.email) {
      const normalizedEmail = String(email).trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalizedEmail)) {
        return NextResponse.json({ error: 'Adresse email invalide.' }, { status: 400 });
      }
      const duplicateEmail = await prisma.user.findUnique({ where: { email: normalizedEmail } });
      if (duplicateEmail && duplicateEmail.id !== userId) {
        return NextResponse.json({ error: 'Cette adresse email est déjà utilisée par un autre compte.' }, { status: 400 });
      }
      data.email = normalizedEmail;
    }

    // 3. Téléphone, Pays, Indicatif
    if (phone !== undefined) data.phone = phone ? String(phone).trim() : null;
    if (countryCode !== undefined) data.countryCode = countryCode ? String(countryCode).trim() : null;
    if (dialCode !== undefined) data.dialCode = dialCode ? String(dialCode).trim() : null;

    // 4. Numéro de dossier
    if (dossierNumber !== undefined) {
      const trimmedDossier = String(dossierNumber).trim();
      if (trimmedDossier && trimmedDossier !== existingUser.dossierNumber) {
        const duplicateDossier = await prisma.user.findUnique({ where: { dossierNumber: trimmedDossier } });
        if (duplicateDossier && duplicateDossier.id !== userId) {
          return NextResponse.json({ error: 'Ce numéro de dossier est déjà attribué à un autre étudiant.' }, { status: 400 });
        }
        data.dossierNumber = trimmedDossier;
      }
    }

    // 5. Date de naissance
    if (birthDate !== undefined) {
      if (!birthDate) {
        data.birthDate = null;
      } else {
        const d = new Date(birthDate);
        if (!isNaN(d.getTime())) {
          data.birthDate = d;
        }
      }
    }

    // 6. Statut & Rôle (Sécurité Super Admin)
    if (role) {
      // Protection : ne jamais rétrograder le Super Admin
      if (isSuperAdminEmail(existingUser.email) && role !== 'ADMIN') {
        return NextResponse.json({ error: 'Le Super Admin Ghislain Muntu doit conserver le rôle ADMIN.' }, { status: 400 });
      }
      data.role = ['STUDENT', 'INSTRUCTOR', 'ADMIN'].includes(role) ? role : existingUser.role;
    }

    if (status) {
      data.status = ['ACTIVE', 'SUSPENDED', 'PENDING'].includes(status) ? status : existingUser.status;
    }

    // 7. Biométrie & Photo
    if (facialVerificationStatus) {
      data.facialVerificationStatus = ['PENDING', 'VERIFIED', 'REJECTED'].includes(facialVerificationStatus)
        ? facialVerificationStatus
        : existingUser.facialVerificationStatus;
    }
    if (photoUrl !== undefined) data.photoUrl = photoUrl || null;

    // 8. Type d'étudiant & Paiement
    if (studentType) {
      data.studentType = studentType;
      if (studentType === 'UNIVERSITAIRE') {
        data.paymentAmount = 0;
        data.paymentStatus = 'EXEMPTED';
        data.paymentMethod = 'EXEMPT_UNIVERSITY';
        if (university !== undefined) data.university = university ? String(university).trim() : null;
      } else {
        data.studentType = 'LIBRE';
        if (paymentAmount !== undefined) {
          data.paymentAmount = typeof paymentAmount === 'number' ? paymentAmount : parseFloat(paymentAmount) || 500;
        } else if (existingUser.paymentAmount === 0 || existingUser.studentType === 'UNIVERSITAIRE') {
          data.paymentAmount = 500;
        }
        if (paymentStatus) data.paymentStatus = paymentStatus;
        if (paymentMethod !== undefined) data.paymentMethod = paymentMethod;
      }
    } else {
      if (paymentStatus) data.paymentStatus = paymentStatus;
      if (paymentMethod !== undefined) data.paymentMethod = paymentMethod;
      if (paymentAmount !== undefined) data.paymentAmount = typeof paymentAmount === 'number' ? paymentAmount : parseFloat(paymentAmount) || 0;
      if (university !== undefined) data.university = university ? String(university).trim() : null;
    }

    // 9. Réinitialisation / Changement du mot de passe
    if (newPassword) {
      if (String(newPassword).length < 6) {
        return NextResponse.json({ error: 'Le mot de passe doit contenir au moins 6 caractères.' }, { status: 400 });
      }
      data.password = await bcrypt.hash(String(newPassword), 10);
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        name: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        status: true,
        phone: true,
        countryCode: true,
        dialCode: true,
        dossierNumber: true,
        birthDate: true,
        photoUrl: true,
        facialVerificationStatus: true,
        studentType: true,
        university: true,
        paymentStatus: true,
        paymentMethod: true,
        paymentAmount: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ success: true, user: JSON.parse(JSON.stringify(updated)) });
  } catch (error: any) {
    console.error('Admin update user error:', error);
    return NextResponse.json({ error: error?.message || 'Erreur lors de la modification de l\'étudiant.' }, { status: 500 });
  }
}

// --------------------------------------------------------------------------
// DELETE : Suppression définitive d'un étudiant par l'administrateur
// --------------------------------------------------------------------------
export async function DELETE(request: NextRequest) {
  try {
    const guard = await requireAdmin();
    if ('error' in guard) return NextResponse.json({ error: guard.error }, { status: guard.status });

    // Récupérer userId soit du corps JSON soit des query params (?userId=...)
    let userId: string | null = null;
    try {
      const body = await request.json();
      userId = body?.userId || null;
    } catch {
      // Si pas de corps JSON, essayer searchParams
    }

    if (!userId) {
      const url = new URL(request.url);
      userId = url.searchParams.get('userId') || url.searchParams.get('id');
    }

    if (!userId) {
      return NextResponse.json({ error: 'Identifiant (userId) requis pour la suppression.' }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return NextResponse.json({ error: 'Étudiant introuvable ou déjà supprimé.' }, { status: 404 });
    }

    // Sécurité 1 : Protection du compte Super Admin Ghislain Muntu
    if (isSuperAdminEmail(targetUser.email)) {
      return NextResponse.json(
        { error: 'Action interdite : Le compte Super Admin principal de Ghislain Muntu ne peut pas être supprimé.' },
        { status: 403 }
      );
    }

    // Sécurité 2 : Un admin ne peut pas supprimer son propre compte
    if (targetUser.id === guard.adminUser.id) {
      return NextResponse.json(
        { error: 'Action interdite : Vous ne pouvez pas supprimer votre propre compte connecté.' },
        { status: 400 }
      );
    }

    // Nettoyage en cascade dans une transaction Prisma
    await prisma.$transaction([
      prisma.account.deleteMany({ where: { userId } }),
      prisma.session.deleteMany({ where: { userId } }),
      prisma.enrollment.deleteMany({ where: { userId } }),
      prisma.conversation.deleteMany({ where: { userId } }),
      prisma.quizAttempt.deleteMany({ where: { userId } }),
      prisma.submission.deleteMany({ where: { userId } }),
      prisma.progress.deleteMany({ where: { userId } }),
      prisma.user.delete({ where: { id: userId } }),
    ]);

    return NextResponse.json({
      success: true,
      message: `L'étudiant ${targetUser.name || targetUser.email} a été définitivement supprimé de la base de données.`,
      deletedUserId: userId,
    });
  } catch (error: any) {
    console.error('Admin delete user error:', error);
    return NextResponse.json(
      { error: error?.message || 'Erreur lors de la suppression de l\'étudiant.' },
      { status: 500 }
    );
  }
}
