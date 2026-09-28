export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { generateModuleContent, generateWeeklyAudioScripts } from '@/lib/content-generator';
import { CS50_MODULES } from '@/config/course-modules';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 });
    }
    const role = (session.user as any)?.role;
    if (role !== 'ADMIN' && role !== 'INSTRUCTOR') {
      return NextResponse.json(
        { success: false, error: "Seuls les enseignants et administrateurs peuvent générer les contenus." },
        { status: 403 },
      );
    }

    const body = await request.json();
    const moduleId = Number(body?.moduleId);
    if (Number.isNaN(moduleId)) {
      return NextResponse.json({ success: false, error: 'moduleId invalide' }, { status: 400 });
    }

    const mod = CS50_MODULES?.find?.((m) => m?.id === moduleId);
    if (!mod) {
      return NextResponse.json({ success: false, error: 'Module introuvable' }, { status: 404 });
    }

    // S'assurer que la leçon existe (id = numéro de semaine)
    const course = await prisma.course.findFirst();
    await prisma.lesson.upsert({
      where: { id: moduleId },
      update: {},
      create: {
        id: moduleId,
        courseId: course?.id ?? (await prisma.course.create({ data: { title: 'CS50X Francophone', slug: 'cs50x-francophone' } })).id,
        title: mod.title,
        slug: mod.slug,
        description: mod.description,
        videoUrl: mod.videoUrl,
        order: moduleId,
      },
    });

    const generated = await generateModuleContent(moduleId);

    const saved = await prisma.videoSummary.upsert({
      where: { lessonId: moduleId },
      update: {
        title: generated.title,
        overview: generated.overview,
        keyConcepts: generated.keyConcepts as any,
        timelineBreakdown: generated.timelineBreakdown as any,
        codeExamples: generated.codeExamples as any,
        pedagogicalTakeaway: generated.pedagogicalTakeaway,
        fullMarkdown: generated.fullMarkdown,
      },
      create: {
        lessonId: moduleId,
        title: generated.title,
        overview: generated.overview,
        keyConcepts: generated.keyConcepts as any,
        timelineBreakdown: generated.timelineBreakdown as any,
        codeExamples: generated.codeExamples as any,
        pedagogicalTakeaway: generated.pedagogicalTakeaway,
        fullMarkdown: generated.fullMarkdown,
      },
    });

    // Génère et enregistre les 3 audios socratiques de la semaine (Lundi/Mercredi/Vendredi)
    let audioCount = 0;
    try {
      const scripts = await generateWeeklyAudioScripts(moduleId);
      for (const s of scripts) {
        await prisma.audioScript.upsert({
          where: { lessonId_dayOfWeek: { lessonId: moduleId, dayOfWeek: s.dayOfWeek as any } },
          update: {
            title: s.title,
            pedagogicalObjective: s.pedagogicalObjective,
            targetDurationMinutes: s.targetDurationMinutes,
            dialogue: s.dialogue as any,
            cleanTtsText: s.cleanTtsText,
          },
          create: {
            lessonId: moduleId,
            dayOfWeek: s.dayOfWeek as any,
            title: s.title,
            pedagogicalObjective: s.pedagogicalObjective,
            targetDurationMinutes: s.targetDurationMinutes,
            dialogue: s.dialogue as any,
            cleanTtsText: s.cleanTtsText,
          },
        });
        audioCount++;
      }
    } catch (audioErr) {
      console.error('audio-scripts generation error:', audioErr);
    }

    return NextResponse.json({ success: true, data: { videoSummary: saved, audioScriptsCount: audioCount } });
  } catch (error: any) {
    console.error('content/generate error:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Erreur interne' }, { status: 500 });
  }
}
