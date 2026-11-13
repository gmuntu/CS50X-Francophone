import type { Metadata } from 'next';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { exigerFormation } from '@/lib/acces-formation';
import { IA_TITLE, IA_WEEKS, iaWeekContext } from '@/lib/courses/ia-essentiels';
import DemandeAuProfIa from './_components/demande-au-prof-ia';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: `Demande au prof · ${IA_TITLE} · SavoirIA` };

/** « Demande au prof » de L'essentiel de l'IA : conversation à voix haute avec Socrate, semaine par semaine. */
export default async function DemandeAuProfIaPage() {
  await exigerFormation('ia-essentiels');
  const semaines = IA_WEEKS.filter((w) => w.ready).map((w) => ({ n: w.n, titre: w.title, contexte: iaWeekContext(w.n) }));
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-8 space-y-5">
        <div>
          <h1 className="text-2xl font-extrabold">🙋🏿 Demande au prof</h1>
          <p className="text-sm text-muted-foreground">Discutez de vive voix avec Socrate, sur la semaine de votre choix.</p>
        </div>
        <DemandeAuProfIa semaines={semaines} />
      </main>
      <Footer />
    </div>
  );
}
