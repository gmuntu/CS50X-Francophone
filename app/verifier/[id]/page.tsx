import Header from '@/components/header';
import Footer from '@/components/footer';
import { getAttestation } from '@/lib/attestation';

export const dynamic = 'force-dynamic';

// Page publique : un employeur vérifie qu'une attestation est authentique.
export default async function VerifierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = await getAttestation(id);
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-xl mx-auto px-4 py-16">
        {a ? (
          <div className="rounded-2xl border-2 border-blue-600 bg-card p-6 space-y-2">
            <p className="text-lg font-extrabold text-blue-700 dark:text-blue-300">✓ Attestation authentique</p>
            <p><b>{a.name}</b> a réussi la formation <b>{a.course}</b>.</p>
            {a.projectTitle && <p className="text-sm text-muted-foreground">Projet final : {a.projectTitle}</p>}
            <p className="text-sm text-muted-foreground">Délivrée le {a.date} · code {a.code}</p>
          </div>
        ) : (
          <div className="rounded-2xl border-2 border-red-300 bg-card p-6">
            <p className="text-lg font-extrabold text-red-700">✗ Attestation introuvable</p>
            <p className="text-sm text-muted-foreground">Ce lien ne correspond à aucune attestation SavoirIA valide.</p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
