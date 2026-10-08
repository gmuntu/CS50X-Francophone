import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { ALL_COURSES } from '@/lib/catalog';

export const dynamic = 'force-dynamic';

// Export CSV (s'ouvre dans Excel) des demandes « Me prévenir ».
export async function GET() {
  const session = await auth();
  if ((session?.user as any)?.role !== 'ADMIN') return new Response('Accès refusé', { status: 403 });

  const rows = await prisma.courseInterest.findMany({ orderBy: [{ courseSlug: 'asc' }, { createdAt: 'asc' }] });
  const title = (slug: string) => ALL_COURSES.find((c) => c.slug === slug)?.title ?? slug;
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = [
    ['Formation', 'Courriel', 'Compte SavoirIA', 'Date'].join(';'),
    ...rows.map((r) => [esc(title(r.courseSlug)), esc(r.email), r.userId ? 'oui' : 'non', r.createdAt.toISOString().slice(0, 10)].join(';')),
  ];
  // BOM UTF-8 + « ; » : Excel en français affiche correctement les accents et les colonnes.
  return new Response('﻿' + lines.join('\r\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="savoiria-me-prevenir-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
