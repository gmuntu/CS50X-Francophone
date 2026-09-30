import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import BetaClient from './_components/beta-client';

export const dynamic = 'force-dynamic';

/** BÊTA — page d'essai du tuteur vocal. La page /tuteur n'est pas modifiée. */
export default async function TuteurBetaPage() {
  const session = await auth();
  if (!session?.user) redirect('/auth/login');
  return <BetaClient />;
}
