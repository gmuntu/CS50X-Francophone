import type { Metadata } from 'next';
import { Suspense } from 'react';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { CS50_MODULES, numeroModule } from '@/config/course-modules';
import { contenuSemaine } from '@/lib/approfondir/contenus';
import SalleEtudeClient, { type SemaineEtude } from './_components/salle-etude-client';
import { exigerFormation } from '@/lib/acces-formation';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Salle d’étude · SavoirIA' };

/**
 * « 📚 Salle d'étude · Approfondir le sujet » : une page pour toutes les semaines.
 * Tous les cours préparés sont envoyés d'un coup : une fois la page enregistrée hors ligne,
 * chaque semaine s'ouvre sans Internet (le choix de la semaine ne recharge pas la page).
 */
export default async function SalleEtudePage() {
  await exigerFormation('cs50x');

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
      <main className="flex-1 w-full max-w-[1600px] mx-auto px-4 py-4">
        <Suspense fallback={null}>
          <SalleEtudeClient semaines={semaines} />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
