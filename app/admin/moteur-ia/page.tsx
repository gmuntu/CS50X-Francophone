import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import ChoixMoteur from '@/components/moteur-ia/choix-moteur';
import Header from '@/components/header';
import Footer from '@/components/footer';

export default async function AdminMoteurIAPage() {
  const session = await auth();
  if (!session?.user) redirect('/auth/login');
  if ((session.user as any)?.role !== 'ADMIN') redirect('/admin');
  return (
    <div className="min-h-screen bg-background">
    <Header />
    <main className="max-w-xl mx-auto px-4 py-10 space-y-6">
      <Link href="/admin" className="text-sm underline text-muted-foreground">← Administration</Link>
      <h1 className="text-2xl font-bold">Moteur de Socrate</h1>
      <p className="text-sm text-muted-foreground">
        Choisit l’IA qui répond à Socrate (écrit et vocal) dans ce navigateur. Sur un ordinateur SavoirIA d’école,
        Gemini passe par le site en ligne avec la clé du poste ; aucune clé Gemini n’est installée sur l’ordinateur.
      </p>
      <div className="bg-card border border-border rounded-xl p-5">
        <ChoixMoteur />
      </div>
    </main>
    <Footer />
    </div>
  );
}
