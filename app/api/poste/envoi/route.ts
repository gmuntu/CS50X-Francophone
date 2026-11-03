import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { datePlausible, elevesDeLEcole, MAX_LIGNES, noter, posteDeLaRequete } from '@/lib/poste-ecole';
import { IA_PASS_SCORE } from '@/lib/courses/ia-essentiels';

export const dynamic = 'force-dynamic';

const JOURS = new Set(['MONDAY', 'WEDNESDAY', 'FRIDAY']);
const ID_OK = /^[a-z0-9]{10,40}$/i;
const SLUG_OK = /^[a-z0-9-]{1,60}$/;

/**
 * Un ordinateur d'école envoie ce que ses élèves ont fait sans Internet :
 * - les quiz CS50x (la note est RECALCULÉE ici, avec les bonnes réponses du site central) ;
 * - les semaines des formations SavoirIA (meilleur score, date de réussite).
 * Seuls les élèves de l'école du poste sont acceptés. Envoi idempotent : renvoyer la même chose ne double rien.
 */
export async function POST(req: Request) {
  const poste = await posteDeLaRequete(req);
  if (!poste) return NextResponse.json({ error: 'Poste inconnu ou désactivé' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const quiz: any[] = Array.isArray(body?.quizAttempts) ? body.quizAttempts : [];
  const semaines: any[] = Array.isArray(body?.courseProgress) ? body.courseProgress : [];
  if (quiz.length > MAX_LIGNES || semaines.length > MAX_LIGNES) {
    return NextResponse.json({ error: `Au plus ${MAX_LIGNES} lignes par envoi` }, { status: 413 });
  }

  const eleves = new Set((await elevesDeLEcole(poste.institutionId)).map((u) => u.id));
  let refuses = 0;

  // --- Quiz CS50x ---
  const quizCentral = new Map<string, { id: string; questions: { id: string; order: number; correctOption: string }[] }>();
  const aCreer: { id: string; quizId: string; userId: string; answers: Record<string, string>; score: number; total: number; passed: boolean; createdAt: Date }[] = [];
  for (const a of quiz) {
    const lessonId = Number(a?.lessonId);
    const createdAt = datePlausible(a?.createdAt);
    if (!ID_OK.test(String(a?.id ?? '')) || !eleves.has(a?.userId) || !Number.isInteger(lessonId) || !JOURS.has(a?.dayOfWeek) || !createdAt || typeof a?.reponses !== 'object' || !a.reponses) {
      refuses++;
      continue;
    }
    const cle = `${lessonId}|${a.dayOfWeek}`;
    if (!quizCentral.has(cle)) {
      const q = await prisma.quiz.findUnique({
        where: { lessonId_dayOfWeek: { lessonId, dayOfWeek: a.dayOfWeek } },
        select: { id: true, questions: { orderBy: { order: 'asc' }, select: { id: true, order: true, correctOption: true } } },
      });
      if (q) quizCentral.set(cle, q);
    }
    const q = quizCentral.get(cle);
    if (!q) { refuses++; continue; }
    const reponses: Record<string, unknown> = a.reponses;
    const note = noter(q.questions, reponses);
    // Réponses rangées comme sur le site central (par identifiant de question)
    const answers: Record<string, string> = {};
    for (const x of q.questions) {
      const r = String(reponses[String(x.order)] ?? '').trim().toUpperCase().slice(0, 4);
      if (r) answers[x.id] = r;
    }
    aCreer.push({ id: a.id, quizId: q.id, userId: a.userId, answers, ...note, createdAt });
  }
  const quizAjoutes = aCreer.length ? (await prisma.quizAttempt.createMany({ data: aCreer, skipDuplicates: true })).count : 0;

  // --- Semaines des formations SavoirIA ---
  let semainesMaj = 0;
  for (const s of semaines) {
    const week = Number(s?.week);
    const bestScore = Number(s?.bestScore);
    if (!eleves.has(s?.userId) || !SLUG_OK.test(String(s?.courseSlug ?? '')) || !Number.isInteger(week) || week < 0 || week > 60 || !(bestScore >= 0 && bestScore <= 1)) {
      refuses++;
      continue;
    }
    // Une date de réussite n'est acceptée que si le score atteint le seuil
    const passedAt = bestScore >= IA_PASS_SCORE ? datePlausible(s?.passedAt) : null;
    const where = { userId_courseSlug_week: { userId: s.userId, courseSlug: s.courseSlug, week } };
    const avant = await prisma.courseProgress.findUnique({ where });
    const garde = avant?.passedAt && (!passedAt || avant.passedAt <= passedAt) ? avant.passedAt : passedAt;
    await prisma.courseProgress.upsert({
      where,
      update: { bestScore: Math.max(avant?.bestScore ?? 0, bestScore), passedAt: garde },
      create: { userId: s.userId, courseSlug: s.courseSlug, week, bestScore, passedAt },
    });
    semainesMaj++;
  }

  await prisma.posteEcole.update({ where: { id: poste.id }, data: { derniereSynchro: new Date() } });
  return NextResponse.json({ quizAjoutes, quizRecus: aCreer.length, semainesMaj, refuses });
}
