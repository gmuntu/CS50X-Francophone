import Header from '@/components/header';
import Footer from '@/components/footer';

export default function LegalPage({ title, summary, updated, children }: { title: string; summary: string; updated: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
        <p className="text-xs text-muted-foreground mt-1">Dernière mise à jour : {updated}</p>
        <div className="mt-5 rounded-2xl border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/30 p-4 text-sm leading-relaxed">
          <b className="text-blue-900 dark:text-blue-200">En bref : </b>{summary}
        </div>
        <div className="mt-6 space-y-3 text-sm leading-relaxed text-foreground/90 [&_h2]:mt-7 [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-blue-900 dark:[&_h2]:text-blue-200 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:my-1 [&_table]:w-full [&_table]:text-xs [&_td]:border [&_th]:border [&_td]:border-border [&_th]:border-border [&_td]:p-2 [&_th]:p-2 [&_th]:bg-muted [&_th]:text-left [&_td]:align-top">
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
}
