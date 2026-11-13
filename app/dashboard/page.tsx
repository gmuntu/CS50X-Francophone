import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import DashboardClient from './_components/dashboard-client';
import { accesFormation } from '@/lib/acces-formation';
import { FORMATIONS_OUVERTES } from '@/lib/formations';

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
        dossierNumber: true,
        studentType: true,
        university: true,
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

  // Formations ouvertes pour l'élève (inscription validée) : le tableau de bord s'adapte.
  const formations: { id: string; titre: string }[] = [];
  for (const f of FORMATIONS_OUVERTES) {
    if ((await accesFormation(session.user.id, f.id)) === 'ok') formations.push({ id: f.id, titre: f.titre });
  }

  return <DashboardClient user={mergedUser} formations={formations} />;
}
