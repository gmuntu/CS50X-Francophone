import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import AdminDashboardClient from './_components/admin-dashboard-client';

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user) redirect('/auth/login');
  const role = (session.user as any)?.role;
  if (role !== 'ADMIN' && role !== 'INSTRUCTOR') redirect('/dashboard');

  let stats = { usersCount: 0, coursesCount: 0, submissionsCount: 0, quizAttemptsCount: 0 };
  let recentSubmissions: any[] = [];

  try {
    const [usersCount, coursesCount, submissionsCount, quizAttemptsCount] = await Promise.all([
      prisma.user.count(),
      prisma.course.count(),
      prisma.submission.count(),
      prisma.quizAttempt.count(),
    ]);

    stats = { usersCount, coursesCount, submissionsCount, quizAttemptsCount };

    recentSubmissions = await prisma.submission.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true, email: true } }, exercise: { select: { title: true } } },
    });
  } catch (error) {
    console.error('Erreur de chargement des statistiques admin:', error);
  }

  return (
    <AdminDashboardClient
      stats={stats}
      recentSubmissions={JSON.parse(JSON.stringify(recentSubmissions))}
      role={role}
    />
  );
}
