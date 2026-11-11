import type { Metadata } from 'next';
import { Suspense } from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { CS50_MODULES, numeroModule } from '@/config/course-modules';
import { contenuSemaine } from '@/lib/approfondir/contenus';
import SalleEtudeClient, { type SemaineEtude } from './_components/salle-etude-client';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Salle d’étude · SavoirIA' };

/**
 * « 📚 Salle d'étude · Approfondir le sujet » : une page pour toutes les semaines.
 * Tous les cours préparés sont envoyés d'un coup : une fois la page enregistrée hors ligne,
 * chaque semaine s'ouvre sans Internet (le choix de la semaine ne recharge pas la page).
 */
export default async function SalleEtudePage() {
  const session = await auth();
  if (!session?.user) redirect('/auth/login');

  const semaines: SemaineEtude[] = CS50_MODULES.map((m) => {
    const numero = numeroModule(m);
    return {
      id: m.id,
      libelle: numero ? `Semaine ${numero}` : 'Bonus',
      titre: m.title.replace(/^(Semaine [^:]+|Bonus)\s*:\s*/, ''),
      contenu: contenuSemaine(m.id),
    };
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <Suspense fallback={null}>
          <SalleEtudeClient semaines={semaines} />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
