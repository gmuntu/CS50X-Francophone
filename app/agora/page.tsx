import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import BetaClient from './_components/beta-client';

export const dynamic = 'force-dynamic';

/** Agora — salle de classe vocale avec Socrate. */
export default async function AgoraPage() {
  const session = await auth();
  if (!session?.user) redirect('/auth/login');
  return <BetaClient />;
}
