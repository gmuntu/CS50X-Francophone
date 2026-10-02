export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { normalizeCode, formatDateFr } from '@/lib/tester-codes';

/**
 * Inscription express d'un testeur avec un code TEST-XXXX-XXXX.
 * Le compte est actif tout de suite (pas de validation manuelle) et son accès
 * s'arrête automatiquement à la date d'expiration du code.
 */
export async function POST(request: Request) {
  try {
    const { code, firstName, lastName, email, password, dialCode, phone } = (await request.json()) ?? {};

    const errors: string[] = [];
    const first = String(firstName ?? '').trim();
    const last = String(lastName ?? '').trim();
    const mail = String(email ?? '').trim().toLowerCase();
    const pwd = String(password ?? '');
    if (!first || !last) errors.push('Prénom et nom obligatoires.');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) errors.push('Adresse courriel invalide.');
    if (pwd.length < 10) errors.push('Le mot de passe doit comporter au moins 10 caractères.');

    const local = String(phone ?? '').replace(/\D/g, '').replace(/^0+/, '');
    const dial = String(dialCode ?? '').replace(/\D/g, '');
    if (local && (!dial || local.length < 6)) errors.push('Téléphone invalide : indiquez l\'indicatif du pays (ex. +243) puis le numéro.');

    const tc = await prisma.testerCode.findUnique({ where: { code: normalizeCode(code) } });
    const now = new Date();
    if (!tc || !tc.active) errors.push('Code testeur invalide. Vérifiez-le dans le message reçu.');
    else if (tc.expiresAt <= now) errors.push(`Ce code testeur a expiré le ${formatDateFr(tc.expiresAt)}.`);
    else if (tc.maxUses != null && tc.usedCount >= tc.maxUses) errors.push('Ce code testeur a atteint son nombre maximal d\'inscriptions.');

    if (mail && (await prisma.user.findUnique({ where: { email: mail } }))) {
      errors.push('Un compte existe déjà avec ce courriel : connectez-vous directement.');
    }
    if (errors.length || !tc) return NextResponse.json({ error: errors[0], causes: errors }, { status: 400 });

    // Réservation d'une place de façon atomique (pas de dépassement du plafond, même à plusieurs en même temps).
    const reserved = await prisma.testerCode.updateMany({
      where: {
        id: tc.id,
        active: true,
        expiresAt: { gt: now },
        ...(tc.maxUses != null ? { usedCount: { lt: tc.maxUses } } : {}),
      },
      data: { usedCount: { increment: 1 } },
    });
    if (reserved.count === 0) {
      return NextResponse.json({ error: 'Ce code testeur n\'est plus disponible.' }, { status: 400 });
    }

    const user = await prisma.user.create({
      data: {
        email: mail,
        password: await bcrypt.hash(pwd, 12),
        name: `${first} ${last}`,
        firstName: first,
        lastName: last,
        role: 'STUDENT',
        status: 'ACTIVE',
        studentType: 'TESTEUR',
        paymentStatus: 'EXEMPTED',
        paymentMethod: 'TESTEUR',
        paymentAmount: 0,
        dialCode: local ? '+' + dial : null,
        phone: local || null,
        testerCodeId: tc.id,
        accessExpiresAt: tc.expiresAt,
      },
    });

    return NextResponse.json({ success: true, email: user.email, expiresAt: tc.expiresAt });
  } catch (error: any) {
    console.error('Inscription testeur :', error);
    const msg = error?.code === 'P2002' ? 'Ce courriel est déjà utilisé.' : 'Erreur technique, réessayez dans un instant.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
