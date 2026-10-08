import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { isUpcomingSlug } from '@/lib/catalog';

// « Me prévenir » : enregistre l'intérêt pour une formation à venir.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const courseSlug = String(body?.courseSlug || '');
  if (!isUpcomingSlug(courseSlug)) return NextResponse.json({ error: 'Formation inconnue' }, { status: 400 });

  const session = await auth();
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
