'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { IaQuestion } from '@/lib/courses/ia-essentiels';

type Result = { score: number; passed: boolean; results: { correct: boolean; answer: number; explain: string }[] };

export default function WeekQuiz({ course, week, questions, nextHref }: { course: string; week: number; questions: IaQuestion[]; nextHref?: string }) {
  const [answers, setAnswers] = useState<number[]>(Array(questions.length).fill(-1));
  const [result, setResult] = useState<Result | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

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
      <p className="text-xs text-muted-foreground mb-4">70 % de bonnes réponses ouvrent la semaine suivante. Vous pouvez recommencer.</p>
      <ol className="space-y-5">
        {questions.map((q, i) => (
          <li key={i}>
            <p className="font-semibold text-sm mb-2">{i + 1}. {q.q}</p>
            <div className="grid gap-1.5">
              {q.options.map((o, j) => {
                const r = result?.results[i];
                const tone = r ? (j === r.answer ? 'border-green-500 bg-green-50 dark:bg-green-950/30' : answers[i] === j ? 'border-red-400 bg-red-50 dark:bg-red-950/30' : 'border-border') : answers[i] === j ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40' : 'border-border';
                return (
                  <button key={j} type="button" disabled={!!result}
                    onClick={() => setAnswers((a) => a.map((v, k) => (k === i ? j : v)))}
                    className={`text-left rounded-lg border px-3 py-2 text-sm ${tone}`}>
                    {o}
                  </button>
                );
              })}
            </div>
            {result && <p className="mt-1.5 text-xs text-muted-foreground">{result.results[i].correct ? '✓ ' : '✗ '}{result.results[i].explain}</p>}
          </li>
        ))}
      </ol>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {!result ? (
        <button onClick={submit} disabled={sending || answers.includes(-1)}
          className="mt-5 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">
          {sending ? 'Correction…' : 'Valider mes réponses'}
        </button>
      ) : (
        <div className="mt-5 rounded-xl bg-muted/50 p-4">
          <p className="font-bold">{Math.round(result.score * 100)} % de bonnes réponses {result.passed ? '🎉' : ''}</p>
          <p className="text-sm text-muted-foreground mb-3">{result.passed ? 'Bravo, la semaine suivante est ouverte.' : 'Relisez le résumé ou demandez à Socrate, puis recommencez.'}</p>
          <div className="flex gap-2">
            {result.passed && nextHref && <Link href={nextHref} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white">Semaine suivante →</Link>}
            <button onClick={() => { setResult(null); setAnswers(Array(questions.length).fill(-1)); }} className="rounded-lg border border-border px-4 py-2 text-sm font-bold">Recommencer</button>
          </div>
        </div>
      )}
    </div>
  );
}
