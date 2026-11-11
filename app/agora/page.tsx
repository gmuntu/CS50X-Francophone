import type { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import BetaClient from './_components/beta-client';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Demande au prof · SavoirIA' };

/** « Demande au prof » (adresse /agora conservée) — salle de classe vocale avec Socrate. */
export default async function AgoraPage() {
  const session = await auth();
  if (!session?.user) redirect('/auth/login');
  return <BetaClient />;
}
