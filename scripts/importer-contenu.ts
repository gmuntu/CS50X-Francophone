// SavoirIA LOCAL : récupère le contenu pédagogique du serveur en ligne et le copie
// dans la base de l'ordinateur. Les audios (MP3) sont téléchargés dans public/hors-ligne-audio
// pour être lus sans Internet. Lancé par savoiria-maj (avant la construction du site).
import { PrismaClient } from '@prisma/client';
import { mkdir, writeFile, access } from 'node:fs/promises';
import path from 'node:path';

const prisma = new PrismaClient();
const SERVEUR = process.env.SAVOIRIA_SERVEUR || 'https://www.savoiria.online';
const CLE = process.env.CONTENU_SYNC_CLE || '';
const AUDIO_DIR = path.join(process.cwd(), 'public', 'hors-ligne-audio');

async function telechargerAudio(url: string | null): Promise<string | null> {
  if (!url || url.startsWith('/hors-ligne-audio/')) return url;
  const nom = path.basename(new URL(url).pathname).replace(/[^A-Za-z0-9._-]/g, '_');
  const fichier = path.join(AUDIO_DIR, nom);
  try { await access(fichier); return `/hors-ligne-audio/${nom}`; } catch {}
  try {
    const r = await fetch(url);
    if (!r.ok) return url;
    await writeFile(fichier, Buffer.from(await r.arrayBuffer()));
    console.log('   audio :', nom);
    return `/hors-ligne-audio/${nom}`;
  } catch {
    return url;
  }
}

async function main() {
  if (!CLE) { console.log('CONTENU_SYNC_CLE absente : contenu du serveur non importé.'); return; }
  const r = await fetch(`${SERVEUR}/api/offline/contenu`, { headers: { 'x-savoiria-cle': CLE } });
  if (!r.ok) { console.log(`Serveur : ${r.status} ${await r.text()}`); return; }
  const { lecons } = await r.json();
  await mkdir(AUDIO_DIR, { recursive: true });

  for (const l of lecons) {
    const c = l.course;
    await prisma.course.upsert({
      where: { slug: c.slug },
      update: { title: c.title, description: c.description, imageUrl: c.imageUrl, isPublished: c.isPublished, order: c.order },
      create: { id: c.id, slug: c.slug, title: c.title, description: c.description, imageUrl: c.imageUrl, isPublished: c.isPublished, order: c.order },
    });
    const cours = await prisma.course.findUnique({ where: { slug: c.slug } });
    const donneesLecon = { courseId: cours!.id, title: l.title, description: l.description, videoUrl: l.videoUrl, order: l.order, isPublished: l.isPublished };
    const existante = await prisma.lesson.findUnique({ where: { id: l.id } });
    if (existante) await prisma.lesson.update({ where: { id: l.id }, data: donneesLecon });
    else await prisma.lesson.create({ data: { id: l.id, slug: l.slug, ...donneesLecon } });

    if (l.videoSummary) {
      const v = l.videoSummary;
      const d = { title: v.title, overview: v.overview, keyConcepts: v.keyConcepts, timelineBreakdown: v.timelineBreakdown, codeExamples: v.codeExamples ?? undefined, pedagogicalTakeaway: v.pedagogicalTakeaway, fullMarkdown: v.fullMarkdown };
      await prisma.videoSummary.upsert({ where: { lessonId: l.id }, update: d, create: { lessonId: l.id, ...d } });
    }

    for (const a of l.audioScripts) {
      const audioUrl = await telechargerAudio(a.audioUrl);
      const d = { title: a.title, pedagogicalObjective: a.pedagogicalObjective, targetDurationMinutes: a.targetDurationMinutes, dialogue: a.dialogue, cleanTtsText: a.cleanTtsText, audioUrl };
      await prisma.audioScript.upsert({ where: { lessonId_dayOfWeek: { lessonId: l.id, dayOfWeek: a.dayOfWeek } }, update: d, create: { lessonId: l.id, dayOfWeek: a.dayOfWeek, ...d } });
    }

    for (const q of l.quizzes) {
      const script = await prisma.audioScript.findUnique({ where: { lessonId_dayOfWeek: { lessonId: l.id, dayOfWeek: q.dayOfWeek } } });
      const quiz = await prisma.quiz.upsert({
        where: { lessonId_dayOfWeek: { lessonId: l.id, dayOfWeek: q.dayOfWeek } },
        update: { title: q.title, description: q.description, audioScriptId: script?.id ?? null },
        create: { lessonId: l.id, dayOfWeek: q.dayOfWeek, title: q.title, description: q.description, audioScriptId: script?.id ?? null },
      });
      // Questions : remplacées seulement si elles ont changé (on garde les tentatives des élèves)
      const locales = await prisma.quizQuestion.findMany({ where: { quizId: quiz.id }, orderBy: { order: 'asc' } });
      const signature = (xs: any[]) => JSON.stringify(xs.map((x) => [x.order, x.question, x.correctOption]));
      if (signature(locales) !== signature(q.questions)) {
        await prisma.quizQuestion.deleteMany({ where: { quizId: quiz.id } });
        await prisma.quizQuestion.createMany({
          data: q.questions.map((x: any) => ({ quizId: quiz.id, order: x.order, question: x.question, options: x.options, correctOption: x.correctOption, explanation: x.explanation, conceptTested: x.conceptTested })),
        });
      }
    }

    for (const e of l.exercises) {
      const ex = await prisma.exercise.findFirst({ where: { lessonId: l.id, title: e.title } });
      const d = { description: e.description, instructions: e.instructions, difficulty: e.difficulty, order: e.order };
      if (ex) await prisma.exercise.update({ where: { id: ex.id }, data: d });
      else await prisma.exercise.create({ data: { lessonId: l.id, title: e.title, ...d } });
    }
  }
  console.log(`Contenu importé : ${lecons.length} leçons.`);
}

main().catch((e) => { console.error('Import du contenu :', e.message); }).finally(() => prisma.$disconnect());
