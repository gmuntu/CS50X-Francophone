import PageOnglet from '@/components/formations/page-onglet';

export const dynamic = 'force-dynamic';

/** Onglets de « L'essentiel de l'IA » sans page propre (le dossier ia-essentiels passe avant /formations/[formation]). */
export default async function OngletIa({ params }: { params: Promise<{ onglet: string }> }) {
  const { onglet } = await params;
  return <PageOnglet formation="ia-essentiels" onglet={onglet} />;
}
