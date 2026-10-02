export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const { name, phone, dialCode } = await request.json();
    const data: { name?: string; phone?: string | null; dialCode?: string | null } = { name: name ?? undefined };

    // Téléphone (sert au tuteur Socrate par SMS / WhatsApp)
    if (phone !== undefined) {
      const local = String(phone ?? '').replace(/\D/g, '').replace(/^0+/, '');
      const dial = String(dialCode ?? '').replace(/\D/g, '');
      if (!local) {
        data.phone = null;
      } else {
        if (!dial || dial.length > 4) return NextResponse.json({ error: "Indicatif du pays invalide (ex. +243, +237, +1)." }, { status: 400 });
        if (local.length < 6 || local.length > 12) return NextResponse.json({ error: 'Numéro de téléphone invalide.' }, { status: 400 });
        // Un numéro ne peut appartenir qu'à un seul compte (sinon le tuteur ne saurait pas qui écrit).
        const others = await prisma.user.findMany({
          where: { id: { not: session.user.id }, phone: { contains: local.slice(-6) } },
          select: { phone: true, dialCode: true },
        });
        const full = dial + local;
        const taken = others.some((u) => {
          const p = String(u.phone ?? '').replace(/\D/g, '').replace(/^0+/, '');
          const d = String(u.dialCode ?? '').replace(/\D/g, '');
          return p === full || d + p === full;
        });
        if (taken) return NextResponse.json({ error: 'Ce numéro est déjà utilisé par un autre compte.' }, { status: 409 });
        data.phone = local;
        data.dialCode = '+' + dial;
      }
    }

    const updated = await prisma.user.update({ where: { id: session.user.id }, data });

    return NextResponse.json({ id: updated?.id, name: updated?.name, email: updated?.email, phone: updated?.phone, dialCode: updated?.dialCode });
  } catch (error: any) {
    console.error('Profile update error:', error);
    return NextResponse.json({ error: 'Erreur' }, { status: 500 });
  }
}
