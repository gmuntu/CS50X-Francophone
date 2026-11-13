import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import InscriptionsClient from './_components/inscriptions-client';

export const metadata = { title: 'Inscriptions par formation · Admin SavoirIA' };

export default async function AdminInscriptionsPage() {
  const session = await auth();
  if (!session?.user) redirect('/auth/login');
  if ((session.user as any)?.role !== 'ADMIN') redirect('/admin');
  return <InscriptionsClient />;
}
