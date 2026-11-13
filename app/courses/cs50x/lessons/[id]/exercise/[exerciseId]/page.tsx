import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import ExerciseClient from './_components/exercise-client';
import { exigerFormation } from '@/lib/acces-formation';

export default async function ExercisePage({ params }: { params: Promise<{ id: string; exerciseId: string }> }) {
  const session = await exigerFormation('cs50x');

  const { id, exerciseId } = await params;

  const exercise = await prisma.exercise.findUnique({
    where: { id: exerciseId },
    include: {
      lesson: { select: { id: true, title: true } },
      submissions: {
        where: { userId: session.user.id ?? '' },
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
    },
  });

  if (!exercise) redirect('/courses');

  return <ExerciseClient exercise={JSON.parse(JSON.stringify(exercise))} lessonId={Number(id)} userId={session.user.id ?? ''} />;
}
