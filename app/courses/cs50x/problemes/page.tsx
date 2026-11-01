import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, Puzzle } from 'lucide-react';
import { auth } from '@/auth';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { CS50_MODULES } from '@/config/course-modules';
import { CS50_PROBLEM_WEEKS, CS50_PROBLEMS_DEADLINE } from '@/config/cs50-problems';
import Cs50Credit from './_components/cs50-credit';

export const metadata = { title: 'Problèmes CS50x — SavoirIA' };

export default async function ProblemesPage() {
  const session = await auth();
  if (!session) redirect('/auth/login');

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-10 space-y-8">
        <div className="space-y-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-extrabold border border-primary/20">
            <Puzzle className="w-3.5 h-3.5" /> Problèmes CS50x 2026
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">Les problèmes, semaine par semaine</h1>
          <p className="text-muted-foreground max-w-3xl leading-relaxed">
            Chaque semaine, mettez en pratique le cours avec les exercices officiels de CS50. Pour chaque exercice, une explication en
            français vous dit ce qu'on attend de vous, comment découper le problème, les pièges à éviter et comment tester votre travail.
            Ensuite, essayez par vous-même : Socrate vous guide sans donner la réponse. À terminer avant le {CS50_PROBLEMS_DEADLINE}.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {CS50_PROBLEM_WEEKS.map((w) => {
            const mod = CS50_MODULES.find((m) => m.id === w.week);
            const videos = w.problems.reduce((n, p) => n + p.videos.length, 0);
            return (
              <Link
                key={w.week}
                href={`/courses/cs50x/problemes/${w.week}`}
                className="group bg-card border border-border/80 rounded-2xl p-5 shadow-soft-sm hover:border-primary/40 transition flex items-start justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <p className="font-extrabold text-foreground">{mod?.title ?? `Semaine ${w.week}`}</p>
                  <p className="text-xs text-muted-foreground">
                    {w.problems.length > 0
                      ? `${w.problems.length} exercice${w.problems.length > 1 ? 's' : ''} · ${videos} vidéo${videos > 1 ? 's' : ''}`
                      : 'Pas de problème cette semaine : place au projet final'}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 mt-1 text-muted-foreground group-hover:text-primary transition shrink-0" />
              </Link>
            );
          })}
        </div>

        <Cs50Credit />
      </main>
      <Footer />
    </div>
  );
}
