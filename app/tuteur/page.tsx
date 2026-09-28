import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import TuteurClient from './_components/tuteur-client';

export const dynamic = 'force-dynamic';

export default async function TuteurPage() {
  const session = await auth();
  if (!session?.user) redirect('/auth/login');

  // Charge le contenu pédagogique de tous les modules (leçons)
  let lessons: any[] = [];
  try {
    lessons = await prisma.lesson.findMany({
      include: {
        videoSummary: true,
        audioScripts: { orderBy: { dayOfWeek: 'asc' } },
        quizzes: { include: { questions: { orderBy: { order: 'asc' } } }, orderBy: { dayOfWeek: 'asc' } },
      },
      orderBy: { id: 'asc' },
    });
  } catch (e) {
    console.error('Tuteur lessons fetch error:', e);
  }

  // Indexe par id de module pour un accès rapide côté client
  const contentByModule: Record<number, any> = {};
  for (const l of lessons ?? []) {
    contentByModule[l.id] = {
      videoSummary: l.videoSummary ?? null,
      audioScripts: l.audioScripts ?? [],
      quizzes: l.quizzes ?? [],
    };
  }

  return (
    <TuteurClient
      user={{ id: session.user.id ?? '', name: session.user.name, email: session.user.email }}
      role={(session.user as any)?.role ?? 'STUDENT'}
      contentByModule={contentByModule}
    />
  );
}
