import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import ProfileClient from './_components/profile-client';
import { prisma } from '@/lib/prisma';

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect('/auth/login');
  const extra = await prisma.user
    .findUnique({ where: { id: session.user.id ?? '' }, select: { phone: true, dialCode: true } })
    .catch(() => null);
  return <ProfileClient phone={extra?.phone ?? ''} dialCode={extra?.dialCode ?? ''} user={{ id: session.user.id ?? '', name: session.user.name ?? '', email: session.user.email ?? '', image: session.user.image ?? null, role: (session.user as any)?.role ?? 'STUDENT' }} />;
}
