import Link from 'next/link';
import Header from '@/components/header';
import Footer from '@/components/footer';

export const metadata = { title: 'Page introuvable · SavoirIA' };

/** Page affichée quand l'adresse demandée n'existe pas : en français, avec le menu et un retour simple. */
export default function PageIntrouvable() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-md text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-primary">Erreur 404</p>
          <h1 className="mt-2 text-3xl font-extrabold text-foreground tracking-tight">Cette page est introuvable</h1>
          <p className="mt-3 text-muted-foreground">
            L&apos;adresse est peut-être mal écrite, ou la page a été déplacée.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/" className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition">
              Retour à l&apos;accueil
            </Link>
            <Link href="/cs50x" className="px-6 py-3 rounded-xl bg-card border border-border font-bold text-foreground hover:bg-muted transition">
              Voir le programme
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
