import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import SubmissionsClient from './_components/submissions-client';

export default async function AdminSubmissionsPage() {
  const session = await auth();
  if (!session?.user) redirect('/auth/login');
  const role = (session.user as any)?.role;
  if (role !== 'ADMIN' && role !== 'INSTRUCTOR') redirect('/dashboard');

  const submissions = await prisma.submission.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      user: { select: { name: true, email: true } },
      exercise: { select: { title: true, lessonId: true } },
    },
  });

  return <SubmissionsClient submissions={JSON.parse(JSON.stringify(submissions))} reviewerId={session.user.id ?? ''} />;
}
