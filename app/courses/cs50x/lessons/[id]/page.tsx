import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import LessonClient from './_components/lesson-client';
import { CS50_MODULES } from '@/config/course-modules';

export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect('/auth/login');

  const { id } = await params;
  const lessonId = parseInt(id, 10);
  const moduleConfig = CS50_MODULES?.find?.((m: any) => m?.id === lessonId);
  if (!moduleConfig) redirect('/courses');

  // Try to load lesson data from DB
  let lesson: any = null;
  try {
    lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        videoSummary: true,
        audioScripts: { orderBy: { dayOfWeek: 'asc' } },
        quizzes: { include: { questions: { orderBy: { order: 'asc' } } }, orderBy: { dayOfWeek: 'asc' } },
        exercises: { orderBy: { order: 'asc' } },
      },
    });
  } catch (e) {
    console.error('Lesson fetch error:', e);
  }

  return <LessonClient moduleConfig={moduleConfig} lesson={lesson} userId={session.user.id} />;
}
