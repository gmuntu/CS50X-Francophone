import Link from 'next/link';
import Header from '@/components/header';
import Footer from '@/components/footer';
import OfflineBanner from '@/components/home/offline-banner';
import ReadyCourses from '@/components/home/ready-courses';
import Catalogue from '@/components/formations/catalogue';

export default function SavoirIAHome() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <section className="bg-gradient-to-b from-blue-50 to-transparent dark:from-blue-950/30 px-4 py-16 sm:py-20">
        <div className="max-w-7xl mx-auto">
          <div>
            <span className="inline-block rounded-full bg-blue-100 dark:bg-blue-900/50 px-3 py-1 text-xs font-bold text-blue-800 dark:text-blue-200">
              Formations en ligne intelligentes · en français
            </span>
            <h1 className="mt-5 text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight text-foreground">
              Préparez les certifications du numérique,{' '}
              <span className="text-blue-600 dark:text-blue-400">avec un tuteur IA qui vous parle en français.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-base sm:text-lg text-muted-foreground">
              Un seul compte SavoirIA pour suivre plusieurs parcours vers des certificats reconnus par les employeurs :
              Harvard CS50, Google, Microsoft, AWS, CompTIA. Même avec une connexion lente ou hors ligne.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/cs50x" className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700">
                Commencer avec CS50x
              </Link>
              <Link href="#formations" className="rounded-xl border border-border bg-background px-5 py-3 text-sm font-bold text-blue-700 dark:text-blue-300 hover:bg-muted">
                Voir les formations
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 space-y-10">
        <OfflineBanner />
        <ReadyCourses />
      </section>

      <section id="formations" className="max-w-7xl mx-auto px-4 py-14 scroll-mt-20">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">Toutes les formations, par parcours</h2>
        <p className="text-muted-foreground">Choisissez un métier ; chaque formation vous prépare à un certificat officiel.</p>

        <div className="mt-9">
          <Catalogue niveauTitre="h3" />
        </div>
      </section>

      <Footer />
    </div>
  );
}
