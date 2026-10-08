import Link from 'next/link';
import { redirect } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { auth } from '@/auth';
import Header from '@/components/header';
import Footer from '@/components/footer';
import PodcastPlayer from '@/components/formations/ia/podcast-player';
import WeekQuiz from '@/components/formations/ia/week-quiz';
import SocrateChat from '@/components/formations/ia/socrate-chat';
import VoiceTutor from '@/components/voice-tutor/voice-tutor';
import VoiceErrorBoundary from '@/components/voice-tutor/error-boundary';
import { IA_SLUG, IA_TITLE, IA_WEEKS, IA_SYSTEM_PROMPT, getIaWeek, iaWeekContext } from '@/lib/courses/ia-essentiels';
import { passedWeeks, isWeekOpen } from '@/lib/courses/progress';

export const dynamic = 'force-dynamic';

export default async function IaWeekPage({ params }: { params: Promise<{ n: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth/login');
  const n = parseInt((await params).n, 10);
  const w = getIaWeek(n);
  if (!w) redirect('/formations/ia-essentiels');
  const passed = await passedWeeks(session.user.id, IA_SLUG);
  if (!w.ready || !isWeekOpen(n, passed)) redirect('/formations/ia-essentiels');

  const next = IA_WEEKS.find((x) => x.n === n + 1);
  const context = iaWeekContext(n);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        <p className="text-xs text-muted-foreground">
          <Link href="/formations/ia-essentiels" className="hover:underline">{IA_TITLE}</Link> › Semaine {n}
        </p>
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold">Semaine {n} : {w.title}</h1>
          <p className="text-muted-foreground">{w.intro}</p>
        </div>

        {w.keyPoints && (
          <div className="rounded-2xl border border-blue-100 dark:border-blue-900 bg-blue-50/60 dark:bg-blue-950/30 p-4 sm:p-5">
            <p className="font-bold mb-2">⭐ À retenir</p>
            <ul className="list-disc pl-5 space-y-1 text-sm">{w.keyPoints.map((k) => <li key={k}>{k}</li>)}</ul>
          </div>
        )}

        {w.podcast && <PodcastPlayer lines={w.podcast} />}

        {w.summary && (
          <details open className="rounded-2xl border border-border bg-card p-4 sm:p-5">
            <summary className="cursor-pointer font-bold">📄 Résumé du cours</summary>
            <div className="mt-3 text-sm leading-relaxed space-y-2 [&_h2]:mt-4 [&_h2]:text-base [&_h2]:font-bold [&_ul]:list-disc [&_ul]:pl-5 [&_li]:my-1 [&_blockquote]:border-l-4 [&_blockquote]:border-blue-300 [&_blockquote]:bg-blue-50/60 dark:[&_blockquote]:bg-blue-950/30 [&_blockquote]:px-3 [&_blockquote]:py-1 [&_blockquote]:italic">
              <ReactMarkdown>{w.summary}</ReactMarkdown>
            </div>
          </details>
        )}

        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-3">
          <p className="font-bold">🎙️ Socrate Agora : parler de vive voix</p>
          <VoiceErrorBoundary>
            <VoiceTutor moduleId={1000 + n} context={context} systemPrompt={IA_SYSTEM_PROMPT}
              hint="Posez votre question à voix haute ; vous pouvez couper la parole à Socrate." />
          </VoiceErrorBoundary>
          {w.oral && (
            <div className="rounded-xl border border-violet-200 dark:border-violet-900 bg-violet-50 dark:bg-violet-950/30 p-3 space-y-2">
              <p className="font-bold text-violet-900 dark:text-violet-200">{w.oral.title}</p>
              <p className="text-sm text-violet-900/80 dark:text-violet-200/80">{w.oral.instructions}</p>
              <VoiceErrorBoundary>
                <VoiceTutor moduleId={2000 + n} context={context} systemPrompt={`${IA_SYSTEM_PROMPT}\n\n${w.oral.prompt}`}
                  idleLabel="Commencer l'exercice oral" hint="Socrate commence par vous demander votre prompt." />
              </VoiceErrorBoundary>
            </div>
          )}
        </div>

        <SocrateChat course={IA_SLUG} week={n}
          starter={`Bonjour ! Je suis Socrate. Qu'est-ce qui t'a le plus surpris dans « ${w.title} » ?`} />

        {w.quiz && (
          <WeekQuiz course={IA_SLUG} week={n} questions={w.quiz}
            nextHref={next?.ready ? `/formations/ia-essentiels/semaine/${next.n}` : '/formations/ia-essentiels'} />
        )}
      </main>
      <Footer />
    </div>
  );
}
