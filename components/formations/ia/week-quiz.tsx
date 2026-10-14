'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { ShuffledQuestion } from '@/lib/courses/shuffle';

type Res = { correct: boolean; answer: number; explain: string };
type Result = { score: number; passed: boolean; results: Record<number, Res> };

// Quiz mélangé : chaque élève a ses questions et ses réponses dans un ordre différent.
export default function WeekQuiz({ course, week, questions, nextHref }: { course: string; week: number; questions: ShuffledQuestion[]; nextHref?: string }) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [result, setResult] = useState<Result | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const complete = questions.every((q) => answers[q.qi] !== undefined);

  const submit = async () => {
    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/formations/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ course, week, answers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Erreur');
      setResult(data);
    } catch (e: any) {
      setError(navigator.onLine ? (e?.message || "L'envoi a échoué.") : 'Vous êtes hors ligne : reconnectez-vous pour valider le quiz.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <p className="font-bold text-foreground">✅ Quiz de la semaine</p>
      <p className="text-xs text-muted-foreground mb-4">70 % de bonnes réponses ouvrent la semaine suivante. Vos questions et vos réponses sont dans un ordre qui vous est propre.</p>
      <ol className="space-y-5">
        {questions.map((q, i) => {
          const r = result?.results[q.qi];
          return (
            <li key={q.qi}>
              <p className="font-semibold text-sm mb-2">{i + 1}. {q.q}</p>
              <div className="grid gap-1.5">
                {q.options.map((o) => {
                  const tone = r ? (o.oi === r.answer ? 'border-green-500 bg-green-50 dark:bg-green-950/30' : answers[q.qi] === o.oi ? 'border-red-400 bg-red-50 dark:bg-red-950/30' : 'border-border') : answers[q.qi] === o.oi ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40' : 'border-border';
                  return (
                    <button key={o.oi} type="button" disabled={!!result}
                      onClick={() => setAnswers((a) => ({ ...a, [q.qi]: o.oi }))}
                      className={`text-left rounded-lg border px-3 py-2 text-sm ${tone}`}>
                      {o.text}
                    </button>
                  );
                })}
              </div>
              {r && <p className="mt-1.5 text-xs text-muted-foreground">{r.correct ? '✓ ' : '✗ '}{r.explain}</p>}
            </li>
          );
        })}
      </ol>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {!result ? (
        <button onClick={submit} disabled={sending || !complete}
          className="mt-5 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">
          {sending ? 'Correction…' : 'Valider mes réponses'}
        </button>
      ) : (
        <div className="mt-5 rounded-xl bg-muted/50 p-4">
          <p className="font-bold">{Math.round(result.score * 100)} % de bonnes réponses {result.passed ? '🎉' : ''}</p>
          <p className="text-sm text-muted-foreground mb-3">{result.passed ? 'Bravo, la semaine suivante est ouverte.' : 'Relisez le résumé ou demandez à Socrate, puis recommencez.'}</p>
          <div className="flex gap-2">
            {result.passed && nextHref && <Link href={nextHref} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white">Semaine suivante →</Link>}
            <button onClick={() => { setResult(null); setAnswers({}); }} className="rounded-lg border border-border px-4 py-2 text-sm font-bold">Recommencer</button>
          </div>
        </div>
      )}
    </div>
  );
}
