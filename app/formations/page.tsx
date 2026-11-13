import Header from '@/components/header';
import Footer from '@/components/footer';
import ReadyCourses from '@/components/home/ready-courses';
import OfflineBanner from '@/components/home/offline-banner';
import Catalogue from '@/components/formations/catalogue';
import { ALL_COURSES } from '@/lib/catalog';

export const metadata = { title: 'Formations · SavoirIA' };

/** Catalogue SavoirIA : toutes les formations, chacune sur sa carte, disponibles ou à venir. */
export default function FormationsPage() {
  const disponibles = ALL_COURSES.filter((c) => c.status === 'disponible').length;
  const aVenir = ALL_COURSES.length - disponibles;
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8 space-y-10">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">Formations</h1>
          <p className="mt-2 text-muted-foreground">
            {disponibles} formations disponibles aujourd&apos;hui, {aVenir} bientôt disponibles. Chaque formation prépare à un certificat officiel.
          </p>
        </div>
        <ReadyCourses title="Disponibles maintenant" subtitle="Vous pouvez les commencer tout de suite, même sans Internet." />
        <OfflineBanner />
        <section>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">Toutes les formations, par parcours</h2>
          <p className="text-muted-foreground mb-6">Choisissez un métier ; pour une formation à venir, demandez à être prévenu de son ouverture.</p>
          <Catalogue niveauTitre="h3" />
        </section>
      </main>
      <Footer />
    </div>
  );
}
