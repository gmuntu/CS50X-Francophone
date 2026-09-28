export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { sendEmail } from '@/lib/email';

/**
 * POST: Demander un code / token de réinitialisation de mot de passe
 */
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || !String(email).trim()) {
      return NextResponse.json({ error: 'Veuillez renseigner votre adresse email.' }, { status: 400 });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Réponse identique que le compte existe ou non (ne révèle pas les emails inscrits)
    const genericResponse = NextResponse.json({
      success: true,
      message:
        "Si un compte existe pour cette adresse, un code de réinitialisation vous sera transmis par email ou par l'administration.",
    });
    if (!user) return genericResponse;

    // Code à 8 caractères (sans caractères ambigus), valable 1 heure
    const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    const bytes = crypto.randomBytes(8);
    const combinedToken = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 heure

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: combinedToken,
        resetTokenExpiry: expiry,
      },
    });

    // Le code est envoyé UNIQUEMENT par email, jamais renvoyé au navigateur.
    await sendEmail({
      to: user.email,
      subject: 'Votre code de réinitialisation',
      text: `Bonjour,\n\nVotre code de réinitialisation est : ${combinedToken}\nIl est valable 1 heure.\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez cet email.`,
      html: `<p>Bonjour,</p><p>Votre code de réinitialisation est :</p><p style="font-size:24px;font-weight:bold;letter-spacing:4px;font-family:monospace">${combinedToken}</p><p>Il est valable 1 heure.</p><p style="color:#666">Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>`,
    });
    return genericResponse;
  } catch (error: any) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Erreur lors du traitement de la demande.' },
      { status: 500 }
    );
  }
}

/**
 * PUT: Réinitialiser le mot de passe avec le code ou token
 */
export async function PUT(request: NextRequest) {
  try {
    const { email, token, newPassword, confirmPassword } = await request.json();

    if (!email || !token || !newPassword) {
      return NextResponse.json(
        { error: 'Email, code/token et nouveau mot de passe sont obligatoires.' },
        { status: 400 }
      );
    }

    const rawPassword = String(newPassword);
    if (rawPassword.length < 10) {
      return NextResponse.json(
        { error: 'Le mot de passe doit contenir au moins 10 caractères.' },
        { status: 400 }
      );
    }

    // Contre-vérification du mot de passe
    if (confirmPassword !== undefined && rawPassword !== String(confirmPassword)) {
      return NextResponse.json(
        { error: 'Les deux mots de passe ne correspondent pas.' },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user || !user.resetToken) {
      return NextResponse.json(
        { error: 'Demande de réinitialisation introuvable ou expirée. Veuillez refaire une demande.' },
        { status: 400 }
      );
    }

    // Vérifier l'expiration
    if (user.resetTokenExpiry && new Date() > new Date(user.resetTokenExpiry)) {
      return NextResponse.json(
        { error: 'Ce code a expiré. Veuillez demander un nouveau code.' },
        { status: 400 }
      );
    }

    const inputToken = String(token).trim().toUpperCase();
    const tokenMatches =
      !!inputToken && user.resetToken === inputToken;

    if (!tokenMatches) {
      return NextResponse.json(
        { error: 'Le code ou token de réinitialisation est incorrect.' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(rawPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Votre mot de passe a été modifié avec succès. Vous pouvez maintenant vous connecter.',
    });
  } catch (error: any) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la réinitialisation du mot de passe.' },
      { status: 500 }
    );
  }
}
