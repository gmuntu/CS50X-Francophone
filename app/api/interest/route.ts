import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { isUpcomingSlug } from '@/lib/catalog';
import { tropDEssais } from '@/lib/quota';

// « Me prévenir » : enregistre l'intérêt pour une formation à venir.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const courseSlug = String(body?.courseSlug || '');
  if (!isUpcomingSlug(courseSlug)) return NextResponse.json({ error: 'Formation inconnue' }, { status: 400 });

  const session = await auth();
  // Sans connexion : 20 envois par heure et par adresse IP au maximum
  if (!session?.user) {
    const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'inconnue';
    if (await tropDEssais('interet', ip, 20)) return NextResponse.json({ error: 'Trop de demandes. Réessayez plus tard.' }, { status: 429 });
  }
  const email = String(session?.user?.email || body?.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) {
    return NextResponse.json({ error: 'Adresse courriel invalide' }, { status: 400 });
  }

  await prisma.courseInterest.upsert({
    where: { email_courseSlug: { email, courseSlug } },
    update: {},
    create: { email, courseSlug, userId: session?.user?.id ?? null },
  });
  return NextResponse.json({ ok: true });
}
