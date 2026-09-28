import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import CoursesAdminClient from './_components/courses-admin-client';

export default async function AdminCoursesPage() {
  const session = await auth();
  if (!session?.user) redirect('/auth/login');
  const role = (session.user as any)?.role;
  if (role !== 'ADMIN' && role !== 'INSTRUCTOR') redirect('/dashboard');

  const courses = await prisma.course.findMany({
    orderBy: { order: 'asc' },
    include: {
      lessons: {
        select: { id: true, title: true, isPublished: true, order: true },
        orderBy: { order: 'asc' },
      },
      _count: { select: { lessons: true } },
    },
  });

  return <CoursesAdminClient courses={JSON.parse(JSON.stringify(courses))} />;
}
