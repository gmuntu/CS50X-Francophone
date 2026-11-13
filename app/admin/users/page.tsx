import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import UsersClient from './_components/users-client';

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session?.user) redirect('/auth/login');
  const role = (session.user as any)?.role;
  if (role !== 'ADMIN') redirect('/dashboard');

  let users: any[] = [];
  try {
    users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true,
        name: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        status: true,
        phone: true,
        countryCode: true,
        dialCode: true,
        dossierNumber: true,
        birthDate: true,
        studentType: true,
        university: true,
        paymentStatus: true,
        paymentMethod: true,
        paymentAmount: true,
        createdAt: true,
        // Formations demandées par l'élève (une ligne par formation, avec son statut et son montant)
        inscriptions: { orderBy: { createdAt: 'asc' }, select: { formation: true, statut: true, paymentAmount: true } },
      },
    });
  } catch (err: any) {
    console.error('Error fetching full user list, attempting fallback query:', err);
    try {
      users = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 200,
      });
    } catch (fallbackErr: any) {
      console.error('Fallback user fetch error:', fallbackErr);
      users = [];
    }
  }

  return <UsersClient users={JSON.parse(JSON.stringify(users))} />;
}
