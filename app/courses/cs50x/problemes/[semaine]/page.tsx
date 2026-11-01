import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { auth } from '@/auth';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { CS50_MODULES } from '@/config/course-modules';
import { getProblemWeek } from '@/config/cs50-problems';
import { getExplication } from '@/config/cs50-explications';
import Cs50Credit from '../_components/cs50-credit';
import NiveauBadge from '../_components/niveau-badge';

export default async function ProblemesSemainePage({ params }: { params: Promise<{ semaine: string }> }) {
  const session = await auth();
  if (!session) redirect('/auth/login');

  const { semaine } = await params;
  const n = Number(semaine);
  const week = Number.isInteger(n) ? getProblemWeek(n) : undefined;
  if (!week) redirect('/courses/cs50x/problemes');
  const mod = CS50_MODULES.find((m) => m.id === week.week);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        <div className="flex items-center justify-between gap-4">
          <Link href="/courses/cs50x/problemes" className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition px-3 py-1.5 rounded-lg hover:bg-muted">
            <ArrowLeft className="w-3.5 h-3.5" /> Toutes les semaines
          </Link>
          <Link href={`/courses/cs50x/lessons/${week.week}`} className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline">
            Retour à la leçon <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="space-y-2">
          <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-extrabold border border-primary/20">Problèmes · Semaine {week.week}</span>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-foreground tracking-tight">{mod?.title ?? `Semaine ${week.week}`}</h1>
          {week.problems.length > 0 && (
            <p className="text-sm text-muted-foreground">Choisissez un exercice : on vous explique ce qu'il demande, comment le découper et comment le tester. Socrate répond à vos questions, sans donner la solution.</p>
          )}
        </div>

        {week.choices?.length ? (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-2xl p-4 text-sm text-amber-900 dark:text-amber-200 space-y-1">
            <p className="font-bold">À vous de choisir :</p>
            <ul className="list-disc pl-5">{week.choices.map((c) => <li key={c}>{c}</li>)}</ul>
            <p className="text-xs">Faites la version facile si vous débutez. Vous pouvez faire les deux : la meilleure note compte.</p>
          </div>
        ) : null}

        {week.problems.length === 0 ? (
          <div className="bg-card border border-border/80 rounded-2xl p-6 text-sm text-muted-foreground">
            Pas de problème cette semaine : c'est le moment du projet final.{' '}
            <Link href={`/courses/cs50x/lessons/${week.week}`} className="font-bold text-primary hover:underline">Voir le projet final</Link>
          </div>
        ) : (
          <ol className="space-y-3">
            {week.problems.map((p, i) => {
              const ex = getExplication(week.week, p.slug);
              return (
                <li key={p.slug}>
                  <Link href={`/courses/cs50x/problemes/${week.week}/${p.slug}`}
                    className="group bg-card border border-border/80 rounded-2xl p-4 sm:p-5 shadow-soft-sm hover:border-primary/40 transition flex items-start gap-4">
                    <span className="shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-extrabold flex items-center justify-center">{i + 1}</span>
                    <div className="flex-1 space-y-1">
                      <p className="font-extrabold text-foreground flex flex-wrap items-center gap-2">
                        {p.name}
                        {p.level && <NiveauBadge level={p.level} />}
                        {ex?.memeQue && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300">Déjà vu en C, semaine {ex.memeQue.week}</span>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">{p.summary}</p>
                    </div>
                    <span className="shrink-0 self-center inline-flex items-center gap-1 text-xs font-bold text-primary">
                      Comprendre <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        )}

        <Cs50Credit />
      </main>
      <Footer />
    </div>
  );
}
