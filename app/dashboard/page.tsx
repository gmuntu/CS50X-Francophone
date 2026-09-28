import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import DashboardClient from './_components/dashboard-client';

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth/login');

  let dbUser = null;
  try {
    dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        firstName: true,
        lastName: true,
        email: true,
        image: true,
        photoUrl: true,
        dossierNumber: true,
        studentType: true,
        university: true,
        facialVerificationStatus: true,
        role: true,
      },
    });
  } catch (e) {
    console.error('[Dashboard] Erreur récupération utilisateur DB:', e);
  }

  const mergedUser = {
    ...session.user,
    ...(dbUser || {}),
  };

  return <DashboardClient user={mergedUser} />;
}
