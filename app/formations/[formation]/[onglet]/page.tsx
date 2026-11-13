import PageOnglet from '@/components/formations/page-onglet';

export const dynamic = 'force-dynamic';

/** Onglet d'une formation sans page propre (CS50x et formations à venir) : voir PageOnglet. */
export default async function OngletFormation({ params }: { params: Promise<{ formation: string; onglet: string }> }) {
  const { formation, onglet } = await params;
  return <PageOnglet formation={formation} onglet={onglet} />;
}
