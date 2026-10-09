import Link from 'next/link';
import Header from '@/components/header';
import Footer from '@/components/footer';
import ReadyCourses from '@/components/home/ready-courses';
import OfflineBanner from '@/components/home/offline-banner';

export const metadata = { title: 'Mes formations · SavoirIA' };

export default function MesFormationsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <ReadyCourses title="Mes formations" subtitle="Reprenez là où vous vous êtes arrêté, ou commencez une nouvelle formation." />
        <OfflineBanner />
        <p className="text-sm text-muted-foreground">
          D'autres formations arrivent : <Link href="/#formations" className="font-semibold text-blue-700 dark:text-blue-300 underline">voir tout le catalogue</Link>.
        </p>
      </main>
      <Footer />
    </div>
  );
}
