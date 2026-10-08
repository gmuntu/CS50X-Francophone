import Link from 'next/link';
import { ALL_COURSES } from '@/lib/catalog';

// « Mes formations » : la formation en cours et l'accès au catalogue SavoirIA.
export default function MyTrainingsCard() {
  const upcoming = ALL_COURSES.filter((c) => c.status === 'bientot').length;
  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex-1">
        <p className="text-xs font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400">Mes formations</p>
        <p className="mt-1 font-bold text-foreground">CS50x Francophone <span className="ml-1 rounded-full bg-green-100 px-2 py-0.5 text-[11px] text-green-700 dark:bg-green-900/40 dark:text-green-300">En cours</span></p>
        <p className="text-sm text-muted-foreground">{upcoming} autres formations arrivent bientôt sur SavoirIA.</p>
      </div>
      <div className="flex gap-2">
        <Link href="/courses" className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700">Continuer</Link>
        <Link href="/#formations" className="rounded-lg border border-border px-4 py-2 text-xs font-bold text-blue-700 dark:text-blue-300 hover:bg-muted">Voir le catalogue</Link>
      </div>
    </div>
  );
}
