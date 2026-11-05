import Header from '@/components/header';
import Footer from '@/components/footer';
import { VersionTestContenu } from '@/components/version-test';

export const metadata = { title: 'Version de test · SavoirIA' };

/** Ce que les testeurs peuvent essayer aujourd'hui, et ce qui viendra plus tard. */
export default function VersionTestPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-10">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground mb-6">
          🧪 Version de test : ce que vous pouvez essayer aujourd’hui
        </h1>
        <VersionTestContenu />
      </main>
      <Footer />
    </div>
  );
}
