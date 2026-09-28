import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import ProfileClient from './_components/profile-client';

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect('/auth/login');
  return <ProfileClient user={{ id: session.user.id ?? '', name: session.user.name ?? '', email: session.user.email ?? '', image: session.user.image ?? null, role: (session.user as any)?.role ?? 'STUDENT' }} />;
}
