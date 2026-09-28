export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/** Liste publique des établissements partenaires actifs (nom et pays uniquement, jamais les codes). */
export async function GET() {
  try {
    const institutions = await prisma.institution.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, country: true, type: true },
    });
    return NextResponse.json({ institutions });
  } catch (error) {
    console.error('[partners] public GET', error);
    return NextResponse.json({ institutions: [] });
  }
}
