import type { Metadata } from 'next';
import BetaClient from './_components/beta-client';
import { exigerFormation } from '@/lib/acces-formation';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Demande au prof · SavoirIA' };

/** « Demande au prof » (adresse /agora conservée) — salle de classe vocale avec Socrate. */
export default async function AgoraPage() {
  await exigerFormation('cs50x');
  return <BetaClient />;
}
