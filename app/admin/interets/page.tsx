import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { prisma } from '@/lib/prisma';
import { ALL_COURSES } from '@/lib/catalog';

export const dynamic = 'force-dynamic';

// Liste des personnes qui ont cliqué « Me prévenir », regroupées par formation.
export default async function AdminInteretsPage() {
  const session = await auth();
  if (!session?.user) redirect('/auth/login');
  if ((session.user as any)?.role !== 'ADMIN') redirect('/admin');

  const rows = await prisma.courseInterest.findMany({ orderBy: { createdAt: 'desc' } });
  const groups = ALL_COURSES.filter((c) => c.status === 'bientot')
    .map((c) => ({ course: c, people: rows.filter((r) => r.courseSlug === c.slug) }))
    .sort((a, b) => b.people.length - a.people.length);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-foreground">Demandes « Me prévenir »</h1>
            <p className="text-sm text-muted-foreground">{rows.length} demande(s) au total. La formation la plus demandée est en haut.</p>
          </div>
          <a href="/api/admin/interests" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">
            Télécharger (Excel / CSV)
          </a>
        </div>
        <div className="space-y-3">
          {groups.map(({ course, people }) => (
            <details key={course.slug} className="rounded-xl border border-border bg-card p-4" open={people.length > 0 && people.length <= 10}>
              <summary className="flex cursor-pointer items-center justify-between gap-3">
                <span className="font-bold text-foreground">{course.title} <span className="font-normal text-muted-foreground">· {course.certificate}</span></span>
                <span className="rounded-full bg-blue-100 px-3 py-0.5 text-sm font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">{people.length}</span>
              </summary>
              {people.length > 0 && (
                <ul className="mt-3 divide-y divide-border text-sm">
                  {people.map((p) => (
                    <li key={p.id} className="flex justify-between gap-3 py-1.5">
                      <span className="truncate">{p.email}{p.userId ? ' · compte SavoirIA' : ''}</span>
                      <span className="shrink-0 text-muted-foreground">{p.createdAt.toLocaleDateString('fr-FR')}</span>
                    </li>
                  ))}
                </ul>
              )}
            </details>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
