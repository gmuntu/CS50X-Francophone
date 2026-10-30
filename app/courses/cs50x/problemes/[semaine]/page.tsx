import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, ArrowRight, ExternalLink } from 'lucide-react';
import { auth } from '@/auth';
import Header from '@/components/header';
import Footer from '@/components/footer';
import BilingualVideo from '@/components/pwa/bilingual-video';
import { CS50_MODULES } from '@/config/course-modules';
import { getProblemWeek } from '@/config/cs50-problems';
import Cs50Credit from '../_components/cs50-credit';
import ProblemSocrate from '../_components/problem-socrate';

const VIDEO_LABEL = { presentation: 'Présentation', explication: 'Explication pas à pas' } as const;

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
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
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
        </div>

        {mod?.videoUrl && (
          <section className="space-y-3">
            <h2 className="text-lg font-extrabold text-foreground">Le cours de la semaine</h2>
            <BilingualVideo en={mod.videoUrl} fr={mod.videoUrlFr} title={mod.title} />
          </section>
        )}

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
          <div className="space-y-6">
            {week.problems.map((p, i) => (
              <section key={p.slug} id={p.slug} className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 shadow-soft-sm space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h2 className="text-xl font-extrabold text-foreground flex items-center gap-2">
                      {p.name}
                      {p.level && (
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${p.level === 'facile' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'}`}>
                          {p.level === 'facile' ? 'Version facile' : 'Version difficile'}
                        </span>
                      )}
                    </h2>
                    <p className="text-sm text-muted-foreground">{p.summary}</p>
                  </div>
                  <a href={p.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline shrink-0">
                    Consignes officielles (anglais) <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
                {p.videos.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {p.videos.map((v, i) => (
                      <div key={v.en + i} className="space-y-1.5">
                        <p className="text-xs font-bold text-muted-foreground">{VIDEO_LABEL[v.type]}</p>
                        <BilingualVideo en={v.en} fr={v.fr} title={`${p.name} — ${VIDEO_LABEL[v.type]}`} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">Pas de vidéo pour cet exercice : les consignes officielles suffisent.</p>
                )}
                <ProblemSocrate week={week.week} slug={p.slug} name={p.level ? `${p.name} (version ${p.level})` : p.name} index={i} />
              </section>
            ))}
          </div>
        )}

        <Cs50Credit />
      </main>
      <Footer />
    </div>
  );
}
