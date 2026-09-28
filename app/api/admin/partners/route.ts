export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { computeYearSessions, generateAccessCode } from '@/lib/partners';

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Non authentifié', status: 401 as const };
  const dbUser = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (dbUser?.role !== 'ADMIN') return { error: 'Accès réservé aux administrateurs', status: 403 as const };
  return { ok: true as const };
}

const DEFAULT_COURSE = { slug: 'cs50x-francophone', title: 'CS50X Francophone', durationWeeks: 11, breakWeeks: 2 };

async function ensureDefaultCourse() {
  const count = await prisma.course.count();
  if (count === 0) {
    await prisma.course.create({ data: { ...DEFAULT_COURSE, isPublished: true } });
  }
}

async function loadAll() {
  await ensureDefaultCourse();
  const now = new Date();
  const [institutions, courses, sessions] = await Promise.all([
    prisma.institution.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { students: true } },
        codes: {
          orderBy: { createdAt: 'desc' },
          include: { session: { include: { course: { select: { title: true, slug: true } } } } },
        },
      },
    }),
    prisma.course.findMany({
      orderBy: { order: 'asc' },
      select: { id: true, title: true, slug: true, durationWeeks: true, breakWeeks: true },
    }),
    prisma.courseSession.findMany({
      orderBy: [{ startDate: 'asc' }],
      include: {
        course: { select: { title: true, slug: true } },
        _count: { select: { students: true, codes: true } },
      },
    }),
  ]);
  return { institutions, courses, sessions, now };
}

export async function GET() {
  const guard = await requireAdmin();
  if ('error' in guard) return NextResponse.json({ error: guard.error }, { status: guard.status });
  try {
    return NextResponse.json(await loadAll());
  } catch (error) {
    console.error('[partners] GET', error);
    return NextResponse.json({ error: 'Erreur de chargement des partenaires' }, { status: 500 });
  }
}

/**
 * Actions :
 *  - createInstitution { name, acronym?, country?, type?, contactEmail? }
 *  - toggleInstitution { id }
 *  - updateCourseCalendar { courseId, durationWeeks, breakWeeks }
 *  - generateSessions { courseId, year, firstStart }        (crée les sessions de l'année)
 *  - createCode { institutionId, sessionId }                  (ou régénère si existe)
 *  - generateCodesForSession { sessionId }                    (tous les établissements actifs)
 *  - toggleCode { id }
 */
export async function POST(request: NextRequest) {
  const guard = await requireAdmin();
  if ('error' in guard) return NextResponse.json({ error: guard.error }, { status: guard.status });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Requête invalide' }, { status: 400 });
  }
  const action = String(body?.action || '');

  try {
    switch (action) {
      case 'createInstitution': {
        const name = String(body.name || '').trim();
        if (name.length < 3) return NextResponse.json({ error: "Nom de l'établissement requis" }, { status: 400 });
        const type = body.type === 'INSTITUTE' ? 'INSTITUTE' : 'UNIVERSITY';
        const exists = await prisma.institution.findUnique({ where: { name } });
        if (exists) return NextResponse.json({ error: 'Cet établissement existe déjà' }, { status: 409 });
        await prisma.institution.create({
          data: {
            name,
            type,
            acronym: body.acronym ? String(body.acronym).trim().slice(0, 20) : null,
            country: body.country ? String(body.country).trim().slice(0, 60) : null,
            contactEmail: body.contactEmail ? String(body.contactEmail).trim().slice(0, 200) : null,
          },
        });
        break;
      }

      case 'toggleInstitution': {
        const inst = await prisma.institution.findUnique({ where: { id: String(body.id) } });
        if (!inst) return NextResponse.json({ error: 'Établissement introuvable' }, { status: 404 });
        await prisma.institution.update({ where: { id: inst.id }, data: { active: !inst.active } });
        break;
      }

      case 'updateCourseCalendar': {
        const durationWeeks = Math.round(Number(body.durationWeeks));
        const breakWeeks = Math.round(Number(body.breakWeeks));
        if (!(durationWeeks >= 1 && durationWeeks <= 52) || !(breakWeeks >= 0 && breakWeeks <= 26)) {
          return NextResponse.json({ error: 'Durée ou pause invalide' }, { status: 400 });
        }
        await prisma.course.update({ where: { id: String(body.courseId) }, data: { durationWeeks, breakWeeks } });
        break;
      }

      case 'generateSessions': {
        const course = await prisma.course.findUnique({ where: { id: String(body.courseId) } });
        if (!course) return NextResponse.json({ error: 'Cours introuvable' }, { status: 404 });
        const year = Math.round(Number(body.year));
        const firstStart = new Date(String(body.firstStart));
        if (!(year >= 2024 && year <= 2100) || isNaN(firstStart.getTime())) {
          return NextResponse.json({ error: 'Année ou date de début invalide' }, { status: 400 });
        }
        const planned = computeYearSessions(firstStart, course.durationWeeks, course.breakWeeks);
        for (const s of planned) {
          await prisma.courseSession.upsert({
            where: { courseId_year_number: { courseId: course.id, year, number: s.number } },
            update: { startDate: s.startDate, endDate: s.endDate },
            create: { courseId: course.id, year, number: s.number, startDate: s.startDate, endDate: s.endDate },
          });
        }
        break;
      }

      case 'createCode':
      case 'generateCodesForSession': {
        const session = await prisma.courseSession.findUnique({
          where: { id: String(body.sessionId) },
          include: { course: true },
        });
        if (!session) return NextResponse.json({ error: 'Session introuvable' }, { status: 404 });
        const institutions =
          action === 'createCode'
            ? await prisma.institution.findMany({ where: { id: String(body.institutionId) } })
            : await prisma.institution.findMany({ where: { active: true } });
        if (institutions.length === 0) return NextResponse.json({ error: 'Aucun établissement' }, { status: 404 });

        for (const inst of institutions) {
          const existing = await prisma.accessCode.findUnique({
            where: { institutionId_sessionId: { institutionId: inst.id, sessionId: session.id } },
          });
          // En génération groupée, on ne remplace pas un code existant
          if (existing && action === 'generateCodesForSession') continue;
          const code = generateAccessCode({
            institutionName: inst.name,
            institutionAcronym: inst.acronym,
            courseSlug: session.course.slug,
            sessionNumber: session.number,
            year: session.year,
          });
          await prisma.accessCode.upsert({
            where: { institutionId_sessionId: { institutionId: inst.id, sessionId: session.id } },
            update: { code, active: true },
            create: { code, institutionId: inst.id, sessionId: session.id },
          });
        }
        break;
      }

      case 'toggleCode': {
        const code = await prisma.accessCode.findUnique({ where: { id: String(body.id) } });
        if (!code) return NextResponse.json({ error: 'Code introuvable' }, { status: 404 });
        await prisma.accessCode.update({ where: { id: code.id }, data: { active: !code.active } });
        break;
      }

      default:
        return NextResponse.json({ error: 'Action inconnue' }, { status: 400 });
    }

    return NextResponse.json({ success: true, ...(await loadAll()) });
  } catch (error) {
    console.error('[partners] POST', action, error);
    return NextResponse.json({ error: "Erreur lors de l'opération" }, { status: 500 });
  }
}
