import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, ArrowRight, ExternalLink } from 'lucide-react';
import { auth } from '@/auth';
import Header from '@/components/header';
import Footer from '@/components/footer';
import BilingualVideo from '@/components/pwa/bilingual-video';
import { getProblemWeek } from '@/config/cs50-problems';
import { explicationEnTexte, getExplication } from '@/config/cs50-explications';
import Cs50Credit from '../../_components/cs50-credit';
import NiveauBadge from '../../_components/niveau-badge';
import ProblemSocrate from '../../_components/problem-socrate';

const VIDEO_LABEL = { presentation: 'Présentation du problème', explication: 'Explication pas à pas' } as const;

function Bloc({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-extrabold text-foreground">{titre}</h2>
      {children}
    </section>
  );
}

const Liste = ({ items }: { items: string[] }) => (
  <ul className="list-disc pl-5 space-y-1 text-sm text-foreground/90 leading-relaxed">{items.map((t) => <li key={t}>{t}</li>)}</ul>
);

/** Un problème de CS50 expliqué en français : quoi faire, comment le découper, quoi tester. */
export default async function ProblemePage({ params }: { params: Promise<{ semaine: string; probleme: string }> }) {
  const session = await auth();
  if (!session) redirect('/auth/login');

  const { semaine, probleme } = await params;
  const n = Number(semaine);
  const week = Number.isInteger(n) ? getProblemWeek(n) : undefined;
  if (!week) redirect('/courses/cs50x/problemes');
  const index = week.problems.findIndex((p) => p.slug === probleme);
  if (index < 0) redirect(`/courses/cs50x/problemes/${week.week}`);
  const p = week.problems[index];
  const ex = getExplication(week.week, p.slug);
  const avant = week.problems[index - 1];
  const apres = week.problems[index + 1];
  const nom = p.level ? `${p.name} (version ${p.level})` : p.name;
  const origine = ex?.memeQue ? getProblemWeek(ex.memeQue.week)?.problems.find((q) => q.slug === ex.memeQue!.slug) : undefined;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-8 space-y-7">
        <Link href={`/courses/cs50x/problemes/${week.week}`} className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition px-3 py-1.5 rounded-lg hover:bg-muted">
          <ArrowLeft className="w-3.5 h-3.5" /> Semaine {week.week}
        </Link>

        <div className="space-y-2">
          <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-extrabold border border-primary/20">Problème · Semaine {week.week}</span>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-foreground tracking-tight flex flex-wrap items-center gap-3">
            {p.name} {p.level && <NiveauBadge level={p.level} />}
          </h1>
        </div>

        {ex ? (
          <div className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 shadow-soft-sm space-y-6">
            <Bloc titre="Le problème en bref">
              <p className="text-sm text-foreground/90 leading-relaxed">{ex.enBref}</p>
              {origine && ex.memeQue && (
                <p className="text-sm">
                  <Link href={`/courses/cs50x/problemes/${ex.memeQue.week}/${ex.memeQue.slug}`} className="font-bold text-primary hover:underline">
                    Revoir l'explication de « {origine.name} » (semaine {ex.memeQue.week})
                  </Link>
                </p>
              )}
            </Bloc>
            {ex.exemple && (
              <Bloc titre="Ce que fait le programme">
                <pre className="rounded-xl bg-zinc-900 text-zinc-100 text-xs sm:text-sm p-4 overflow-x-auto leading-relaxed"><code>{ex.exemple}</code></pre>
              </Bloc>
            )}
            <Bloc titre="Découper le problème, étape par étape">
              <ol className="list-decimal pl-5 space-y-1 text-sm text-foreground/90 leading-relaxed">{ex.etapes.map((t) => <li key={t}>{t}</li>)}</ol>
            </Bloc>
            <Bloc titre={ex.memeQue ? 'Ce qui change en Python' : 'Ce qu’il faut savoir du cours'}><Liste items={ex.notions} /></Bloc>
            <Bloc titre="Les pièges fréquents"><Liste items={ex.pieges} /></Bloc>
            <Bloc titre="Tester et rendre">
              <pre className="rounded-xl bg-zinc-900 text-zinc-100 text-xs sm:text-sm p-4 overflow-x-auto leading-relaxed"><code>{ex.verifier.join('\n')}</code></pre>
            </Bloc>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{p.summary}</p>
        )}

        <section className="space-y-3">
          <h2 className="text-base font-extrabold text-foreground">Une question ? Demandez à Socrate</h2>
          <ProblemSocrate week={week.week} slug={p.slug} name={nom} index={index} explication={ex ? explicationEnTexte(ex) : undefined} />
        </section>

        {p.videos.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-base font-extrabold text-foreground">Les vidéos de CS50</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {p.videos.map((v, i) => (
                <div key={v.en + i} className="space-y-1.5">
                  <p className="text-xs font-bold text-muted-foreground">{VIDEO_LABEL[v.type]}</p>
                  <BilingualVideo en={v.en} fr={v.fr} title={`${p.name} — ${VIDEO_LABEL[v.type]}`} />
                </div>
              ))}
            </div>
          </section>
        )}

        <a href={p.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline">
          Consignes officielles complètes (anglais) <ExternalLink className="w-3.5 h-3.5" />
        </a>

        <nav className="flex items-center justify-between gap-4 border-t border-border/60 pt-4 text-sm font-bold">
          {avant ? (
            <Link href={`/courses/cs50x/problemes/${week.week}/${avant.slug}`} className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" /> {avant.name}{avant.level ? ` (${avant.level})` : ''}
            </Link>
          ) : <span />}
          {apres ? (
            <Link href={`/courses/cs50x/problemes/${week.week}/${apres.slug}`} className="inline-flex items-center gap-1.5 text-primary hover:underline">
              {apres.name}{apres.level ? ` (${apres.level})` : ''} <ArrowRight className="w-4 h-4" />
            </Link>
          ) : <span />}
        </nav>

        <Cs50Credit />
      </main>
      <Footer />
    </div>
  );
}
