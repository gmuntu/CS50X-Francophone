import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { CS50_MODULES } from '@/config/course-modules';
import { IA_SLUG, IA_TITLE, IA_WEEKS } from '@/lib/courses/ia-essentiels';
import { passedWeeks, isWeekOpen } from '@/lib/courses/progress';
import { versionsCs50x } from '@/lib/offline-versions';

export const dynamic = 'force-dynamic';

// Liste de ce qu'il faut enregistrer pour avoir TOUTE une formation hors ligne.
export async function GET(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Non connecté' }, { status: 401 });
  const params = new URL(req.url).searchParams;
  const course = params.get('course');

  // Seulement les empreintes des quiz : pour savoir si un paquet enregistré est périmé.
  if (course === 'cs50x' && params.get('versions') === '1') {
    return NextResponse.json({ versions: await versionsCs50x() });
  }

  if (course === 'cs50x') {
    const scripts = await prisma.audioScript
      .findMany({ where: { audioUrl: { not: null } }, select: { lessonId: true, audioUrl: true } })
      .catch(() => [] as { lessonId: number; audioUrl: string | null }[]);
    const versions = await versionsCs50x();
    return NextResponse.json({
      lessons: CS50_MODULES.map((m) => ({
        id: m.id,
        title: m.title,
        path: `/courses/cs50x/lessons/${m.id}`,
        version: versions[m.id],
        audio: [m.podcastUrl, ...scripts.filter((s) => s.lessonId === m.id).map((s) => s.audioUrl)].filter(
          (u): u is string => typeof u === 'string' && u.length > 0
        ),
      })),
    });
  }

  if (course === IA_SLUG) {
    const staff = ['ADMIN', 'INSTRUCTOR'].includes((session?.user as any)?.role);
    const passed = await passedWeeks(userId, IA_SLUG);
    return NextResponse.json({
      lessons: IA_WEEKS.filter((w) => w.ready && (staff || isWeekOpen(w.n, passed))).map((w) => ({
        id: 1000 + w.n,
        week: w.n,
        title: `${IA_TITLE} — Semaine ${w.n} : ${w.title}`,
        path: `/formations/ia-essentiels/semaine/${w.n}`,
        audio: [],
      })),
    });
  }

  return NextResponse.json({ error: 'Formation inconnue' }, { status: 400 });
}
