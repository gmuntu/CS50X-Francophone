// SavoirIA LOCAL — synchronisation d'un ordinateur d'école avec le site central.
// Lancé sur le poste (savoiria-synchro, toutes les 15 min) quand Internet est là :
//   1. ENVOI : quiz et semaines réussies des élèves de l'école, faits sur ce poste ;
//   2. RÉCEPTION : comptes des élèves de l'école (mot de passe chiffré) et leur progression en ligne.
// Les identifiants des quiz diffèrent entre le poste et le site : on les repère par leçon + jour,
// et les réponses par numéro de question.
import { PrismaClient } from '@prisma/client';
import { readFile, writeFile } from 'node:fs/promises';

const prisma = new PrismaClient();
const SERVEUR = process.env.SAVOIRIA_SERVEUR || 'https://www.savoiria.online';
const CLE = (process.env.POSTE_CLE || '').trim();
const ETAT = process.env.SYNCHRO_ETAT || '/var/lib/savoiria/synchro-ecole.json';
const PAQUET = 1000;
const MARGE_MS = 2 * 86_400_000; // on renvoie 2 jours de plus : le site ignore les doublons

type Etat = { derniereSynchro?: string; institutionId?: string };

async function lireEtat(): Promise<Etat> {
  try { return JSON.parse(await readFile(ETAT, 'utf8')); } catch { return {}; }
}

async function appel(chemin: string, init: RequestInit = {}) {
  const r = await fetch(`${SERVEUR}${chemin}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', 'x-savoiria-poste': CLE, ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(60_000),
  });
  if (!r.ok) throw new Error(`${chemin} : ${r.status} ${(await r.text()).slice(0, 200)}`);
  return r.json();
}

/** Quiz du poste : identifiant local <-> (leçon, jour) et questions par numéro. */
async function cartesQuiz() {
  const quiz = await prisma.quiz.findMany({ select: { id: true, lessonId: true, dayOfWeek: true, questions: { select: { id: true, order: true } } } });
  const parId = new Map(quiz.map((q) => [q.id, q]));
  const parCle = new Map(quiz.map((q) => [`${q.lessonId}|${q.dayOfWeek}`, q]));
  return { parId, parCle };
}

async function envoyer(etat: Etat) {
  if (!etat.institutionId) return; // première fois : on reçoit d'abord les comptes
  const eleves = (await prisma.user.findMany({ where: { institutionId: etat.institutionId, role: 'STUDENT' }, select: { id: true } })).map((u) => u.id);
  if (!eleves.length) return;
  const depuis = etat.derniereSynchro ? new Date(new Date(etat.derniereSynchro).getTime() - MARGE_MS) : new Date(0);
  const { parId } = await cartesQuiz();

  const tentatives = await prisma.quizAttempt.findMany({
    where: { userId: { in: eleves }, createdAt: { gt: depuis } },
    select: { id: true, userId: true, quizId: true, answers: true, createdAt: true },
  });
  const quizAttempts = tentatives.flatMap((t) => {
    const q = parId.get(t.quizId);
    if (!q) return [];
    const reponses: Record<string, string> = {};
    const a = (t.answers ?? {}) as Record<string, unknown>;
    for (const x of q.questions) if (a[x.id] != null) reponses[String(x.order)] = String(a[x.id]);
    return [{ id: t.id, userId: t.userId, lessonId: q.lessonId, dayOfWeek: q.dayOfWeek, reponses, createdAt: t.createdAt }];
  });
  const courseProgress = await prisma.courseProgress.findMany({
    where: { userId: { in: eleves }, updatedAt: { gt: depuis } },
    select: { userId: true, courseSlug: true, week: true, bestScore: true, passedAt: true },
  });

  const n = Math.max(quizAttempts.length, courseProgress.length);
  for (let i = 0; i < n; i += PAQUET) {
    const r = await appel('/api/poste/envoi', {
      method: 'POST',
      body: JSON.stringify({ quizAttempts: quizAttempts.slice(i, i + PAQUET), courseProgress: courseProgress.slice(i, i + PAQUET) }),
    });
    console.log(`   envoi : ${r.quizAjoutes} quiz ajoutés, ${r.semainesMaj} semaines, ${r.refuses} refusés`);
  }
}

async function recevoir(): Promise<string> {
  const d = await appel('/api/poste/eleves');
  const inst = d.institution;
  const dejaInst = await prisma.institution.findUnique({ where: { id: inst.id } });
  const infosInst = { name: inst.name, acronym: inst.acronym, country: inst.country, type: inst.type };
  if (dejaInst) await prisma.institution.update({ where: { id: inst.id }, data: infosInst });
  else await prisma.institution.create({ data: { id: inst.id, ...infosInst } });

  // Comptes : le site central fait foi (mot de passe, statut, date de fin d'accès)
  const recus = new Set<string>();
  for (const u of d.eleves as any[]) {
    const autre = await prisma.user.findUnique({ where: { email: u.email }, select: { id: true } });
    if (autre && autre.id !== u.id) { console.log(`   compte ignoré (adresse déjà utilisée sur ce poste) : ${u.email}`); continue; }
    const infos = {
      email: u.email, name: u.name, firstName: u.firstName, lastName: u.lastName, password: u.password,
      role: 'STUDENT' as const, status: 'ACTIVE' as const, institutionId: inst.id,
      studentType: u.studentType, university: u.university, paymentStatus: u.paymentStatus,
      accessExpiresAt: u.accessExpiresAt ? new Date(u.accessExpiresAt) : null,
    };
    await prisma.user.upsert({ where: { id: u.id }, update: infos, create: { id: u.id, ...infos } });
    recus.add(u.id);
  }
  // Élèves retirés de l'école, suspendus ou arrivés en fin d'accès : plus de connexion sur ce poste
  const suspendus = await prisma.user.updateMany({
    where: { institutionId: inst.id, role: 'STUDENT', id: { notIn: [...recus] }, status: { not: 'SUSPENDED' } },
    data: { status: 'SUSPENDED' },
  });

  // Progression en ligne -> poste
  const { parCle } = await cartesQuiz();
  const tentatives = (d.quizAttempts as any[]).flatMap((t) => {
    const q = parCle.get(`${t.lessonId}|${t.dayOfWeek}`);
    if (!q || !recus.has(t.userId)) return [];
    const answers: Record<string, string> = {};
    for (const x of q.questions) if (t.reponses?.[String(x.order)] != null) answers[x.id] = String(t.reponses[String(x.order)]);
    return [{ id: t.id, quizId: q.id, userId: t.userId, answers, score: t.score, total: t.total, passed: t.passed, createdAt: new Date(t.createdAt) }];
  });
  const ajoutes = tentatives.length ? (await prisma.quizAttempt.createMany({ data: tentatives, skipDuplicates: true })).count : 0;

  for (const s of d.courseProgress as any[]) {
    if (!recus.has(s.userId)) continue;
    const where = { userId_courseSlug_week: { userId: s.userId, courseSlug: s.courseSlug, week: s.week } };
    const avant = await prisma.courseProgress.findUnique({ where });
    const passedAt = s.passedAt ? new Date(s.passedAt) : null;
    const garde = avant?.passedAt && (!passedAt || avant.passedAt <= passedAt) ? avant.passedAt : passedAt;
    await prisma.courseProgress.upsert({
      where,
      update: { bestScore: Math.max(avant?.bestScore ?? 0, s.bestScore), passedAt: garde },
      create: { userId: s.userId, courseSlug: s.courseSlug, week: s.week, bestScore: s.bestScore, passedAt },
    });
  }
  console.log(`   réception : ${recus.size} élève(s) de « ${inst.name} », ${suspendus.count} suspendu(s), ${ajoutes} quiz du site`);
  return inst.id;
}

async function main() {
  if (!CLE) { console.log("Pas de clé de poste d'école : synchronisation des élèves ignorée."); return; }
  const debut = new Date().toISOString();
  const etat = await lireEtat();
  await envoyer(etat); // d'abord l'envoi : rien de ce qui a été fait ici ne se perd
  const institutionId = await recevoir();
  await writeFile(ETAT, JSON.stringify({ derniereSynchro: debut, institutionId }), { mode: 0o600 });
  console.log('Synchronisation de l’école terminée.');
}

main()
  .catch((e) => { console.error('Synchronisation de l’école :', e.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
