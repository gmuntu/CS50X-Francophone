import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import TesteursClient from './_components/testeurs-client';

export default async function AdminTesteursPage() {
  const session = await auth();
  if (!session?.user) redirect('/auth/login');
  if ((session.user as any)?.role !== 'ADMIN') redirect('/admin');
  return <TesteursClient />;
}
