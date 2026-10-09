import Link from 'next/link';
import { ALL_COURSES } from '@/lib/catalog';

// Formations ouvertes aujourd'hui, côte à côte.
export default function ReadyCourses({ title = 'Prêtes à commencer', subtitle = "Les formations ouvertes aujourd'hui, côte à côte." }: { title?: string; subtitle?: string }) {
  const ready = ALL_COURSES.filter((c) => c.status === 'disponible' && c.href);
  const blurb: Record<string, string> = {
    cs50x: 'Programmation et informatique',
    'google-ai-essentials': "Utiliser l'IA au travail",
  };
  return (
    <div>
      <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">{title}</h2>
      <p className="text-muted-foreground mb-4">{subtitle}</p>
      <div className="grid gap-4 md:grid-cols-2">
        {ready.map((c) => (
          <div key={c.slug} className="rounded-2xl border-2 border-blue-600 bg-card p-5 shadow-md shadow-blue-600/10">
            <div className="flex flex-wrap gap-1.5">
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-bold text-green-700 dark:bg-green-900/40 dark:text-green-300">Disponible</span>
              <span className="rounded-full border border-sky-300 bg-sky-50 px-2 py-0.5 text-[11px] font-bold text-sky-700 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300">📥 Hors ligne</span>
            </div>
            <p className="mt-2 text-xl font-extrabold text-foreground">{c.title}</p>
            <p className="text-sm text-muted-foreground">{blurb[c.slug] ? `${blurb[c.slug]} · ` : ''}prépare au certificat {c.certificate}</p>
            <p className="text-xs text-muted-foreground/70 mt-1 mb-4">{c.note}</p>
            <div className="flex flex-wrap gap-2">
              <Link href={c.href!} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">Commencer</Link>
              <a href="/hors-ligne" className="rounded-lg border border-sky-300 bg-sky-50 px-4 py-2 text-sm font-bold text-sky-700 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300">📥 Hors ligne</a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
