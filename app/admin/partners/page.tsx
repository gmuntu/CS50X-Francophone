import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import PartnersClient from './_components/partners-client';

export default async function AdminPartnersPage() {
  const session = await auth();
  if (!session?.user) redirect('/auth/login');
  if ((session.user as any)?.role !== 'ADMIN') redirect('/admin');
  return <PartnersClient />;
}
