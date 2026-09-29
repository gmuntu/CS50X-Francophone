/**
 * Génération automatique du contenu hebdomadaire (résumé, 3 séances socratiques, 3 quiz).
 * Appelée chaque nuit par la tâche programmée Vercel (/api/cron/weekly-content).
 * Chaque exécution produit autant d'éléments manquants que possible dans le temps imparti,
 * en commençant par la semaine en cours et la suivante.
 */
import { prisma } from '@/lib/prisma';
import { CS50_MODULES } from '@/config/course-modules';
import {
  generateModuleContent,
  generateAudioScript,
  type DayOfWeekType,
} from '@/lib/content-generator';

const DAYS: DayOfWeekType[] = ['MONDAY', 'WEDNESDAY', 'FRIDAY'];
const DAY_FR: Record<DayOfWeekType, string> = { MONDAY: 'Lundi', WEDNESDAY: 'Mercredi', FRIDAY: 'Vendredi' };
const LAST_WEEK = 10;

type Unit =
  | { kind: 'summary'; week: number }
  | { kind: 'script'; week: number; day: DayOfWeekType }
  | { kind: 'quiz'; week: number; day: DayOfWeekType };

/* ------------------------------------------------------------------ */
/*  Gemini : appel JSON                                                */
/* ------------------------------------------------------------------ */
async function geminiJson(prompt: string): Promise<any> {
  const key = process.env.GEMINI_API_KEY || process.env.EMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY absente');
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.4, maxOutputTokens: 3000 },
      }),
    },
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const data = await res.json();
  const raw = String(data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '')
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/, '')
    .trim();
  return JSON.parse(raw);
}

/* ------------------------------------------------------------------ */
/*  Quiz du jour, construit à partir de la séance socratique           */
/* ------------------------------------------------------------------ */
async function generateDayQuiz(week: number, day: DayOfWeekType, sessionText: string) {
  const mod = CS50_MODULES.find((m) => m.id === week);
  const prompt = `Tu es concepteur pédagogique pour un accompagnement en français du cours CS50x.
Crée un quiz de 5 questions à choix multiples pour la séance du ${DAY_FR[day]} de la ${mod?.title ?? `semaine ${week}`}.
Base-toi sur ce contenu de séance :
"""
${sessionText.slice(0, 6000)}
"""
Réponds UNIQUEMENT avec un objet JSON :
{ "title": "titre court",
  "questions": [ { "question": "...", "options": ["...", "...", "...", "..."], "correctOption": "A|B|C|D",
                   "explanation": "explication pédagogique de la bonne réponse", "conceptTested": "concept" } ] }
Contraintes : exactement 5 questions, 4 options chacune, une seule bonne réponse, tout en français, niveau débutant progressif.`;
  const out = await geminiJson(prompt);
  const questions = (Array.isArray(out?.questions) ? out.questions : [])
    .filter((q: any) => q?.question && Array.isArray(q?.options) && q.options.length === 4)
    .slice(0, 5)
    .map((q: any, i: number) => ({
      order: i,
      question: String(q.question),
      options: q.options.map(String),
      correctOption: ['A', 'B', 'C', 'D'].includes(String(q.correctOption).toUpperCase())
        ? String(q.correctOption).toUpperCase()
        : 'A',
      explanation: String(q.explanation ?? ''),
      conceptTested: String(q.conceptTested ?? mod?.title ?? ''),
    }));
  if (questions.length < 3) throw new Error('Quiz généré incomplet');
  return { title: String(out?.title || `Quiz du ${DAY_FR[day]}`), questions };
}

/* ------------------------------------------------------------------ */
/*  Base de données                                                    */
/* ------------------------------------------------------------------ */
async function ensureLesson(week: number) {
  const mod = CS50_MODULES.find((m) => m.id === week);
  if (!mod) throw new Error(`Module ${week} introuvable`);
  let course = await prisma.course.findFirst({ orderBy: { order: 'asc' } });
  if (!course) {
    course = await prisma.course.create({
      data: { title: 'CS50X Francophone', slug: 'cs50x-francophone', isPublished: true },
    });
  }
  await prisma.lesson.upsert({
    where: { id: week },
    update: {},
    create: {
      id: week,
      courseId: course.id,
      title: mod.title,
      slug: mod.slug,
      description: mod.description,
      videoUrl: mod.videoUrl,
      order: week,
      isPublished: true,
    },
  });
}

async function missingUnits(week: number): Promise<Unit[]> {
  const [summary, scripts, quizzes] = await Promise.all([
    prisma.videoSummary.findUnique({ where: { lessonId: week }, select: { id: true } }),
    prisma.audioScript.findMany({ where: { lessonId: week }, select: { dayOfWeek: true } }),
    prisma.quiz.findMany({ where: { lessonId: week }, select: { dayOfWeek: true } }),
  ]);
  const units: Unit[] = [];
  if (!summary) units.push({ kind: 'summary', week });
  for (const day of DAYS) {
    if (!scripts.some((s) => s.dayOfWeek === day)) units.push({ kind: 'script', week, day });
  }
  for (const day of DAYS) {
    // Le quiz dépend de la séance : il vient après elle
    if (!quizzes.some((q) => q.dayOfWeek === day)) units.push({ kind: 'quiz', week, day });
  }
  return units;
}

/** Semaines prioritaires : semaine en cours et suivante de la session active, puis le reste du catalogue. */
async function weekOrder(now = new Date()): Promise<number[]> {
  const DAY = 86_400_000;
  const priority: number[] = [];
  const session = await prisma.courseSession.findFirst({
    where: { startDate: { lte: new Date(now.getTime() + 7 * DAY) }, endDate: { gte: now } },
    orderBy: { startDate: 'asc' },
  });
  if (session) {
    // Anticipation de 3 jours : à partir du vendredi, on prépare la semaine suivante
    const w = Math.floor((now.getTime() + 3 * DAY - session.startDate.getTime()) / (7 * DAY));
    for (const x of [w, w + 1]) if (x >= 0 && x <= LAST_WEEK && !priority.includes(x)) priority.push(x);
  }
  const all = Array.from({ length: LAST_WEEK + 1 }, (_, i) => i);
  return [...priority, ...all.filter((w) => !priority.includes(w))];
}

async function runUnit(u: Unit): Promise<string> {
  await ensureLesson(u.week);
  if (u.kind === 'summary') {
    const g = await generateModuleContent(u.week);
    const data = {
      title: g.title,
      overview: g.overview,
      keyConcepts: g.keyConcepts as any,
      timelineBreakdown: g.timelineBreakdown as any,
      codeExamples: g.codeExamples as any,
      pedagogicalTakeaway: g.pedagogicalTakeaway,
      fullMarkdown: g.fullMarkdown,
    };
    await prisma.videoSummary.upsert({ where: { lessonId: u.week }, update: data, create: { lessonId: u.week, ...data } });
    return `semaine ${u.week} : résumé`;
  }
  if (u.kind === 'script') {
    const s = await generateAudioScript(u.week, u.day);
    const data = {
      title: s.title,
      pedagogicalObjective: s.pedagogicalObjective,
      targetDurationMinutes: s.targetDurationMinutes,
      dialogue: s.dialogue as any,
      cleanTtsText: s.cleanTtsText,
    };
    await prisma.audioScript.upsert({
      where: { lessonId_dayOfWeek: { lessonId: u.week, dayOfWeek: u.day } },
      update: data,
      create: { lessonId: u.week, dayOfWeek: u.day, ...data },
    });
    return `semaine ${u.week} : séance du ${DAY_FR[u.day]}`;
  }
  // Quiz : nécessite la séance du même jour
  const script = await prisma.audioScript.findUnique({
    where: { lessonId_dayOfWeek: { lessonId: u.week, dayOfWeek: u.day } },
  });
  if (!script) throw new Error('séance du jour pas encore rédigée');
  const q = await generateDayQuiz(u.week, u.day, script.cleanTtsText);
  await prisma.quiz.create({
    data: {
      lessonId: u.week,
      dayOfWeek: u.day,
      audioScriptId: script.id,
      title: q.title,
      questions: { create: q.questions },
    },
  });
  return `semaine ${u.week} : quiz du ${DAY_FR[u.day]}`;
}

/** Produit un maximum d'éléments manquants en `budgetMs` millisecondes. */
export async function runWeeklyContent(budgetMs = 45_000) {
  const start = Date.now();
  const done: string[] = [];
  const errors: string[] = [];
  const blocked = new Set<number>(); // semaine en erreur : on passe à la suivante

  for (const week of await weekOrder()) {
    if (Date.now() - start > budgetMs) break;
    for (const u of await missingUnits(week)) {
      if (blocked.has(week)) break;
      if (Date.now() - start > budgetMs) break;
      try {
        done.push(await runUnit(u));
      } catch (e: any) {
        errors.push(`semaine ${week} (${u.kind}) : ${e?.message ?? 'erreur'}`);
        blocked.add(week);
      }
    }
  }
  return { done, errors, seconds: Math.round((Date.now() - start) / 1000) };
}
