import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { elevesDeLEcole, posteDeLaRequete } from '@/lib/poste-ecole';
import { formationsAInstaller, formationsDuPoste } from '@/lib/formations-poste';

export const dynamic = 'force-dynamic';

/**
 * Un ordinateur d'école reçoit les comptes de SES élèves (et seulement eux), pour qu'ils
 * puissent se connecter sans Internet avec leur propre mot de passe, et leur progression en ligne.
 * Les mots de passe ne sont transmis que sous forme chiffrée (bcrypt), jamais en clair.
 * Comptes formateurs et administrateurs : jamais transmis.
 */
export async function GET(req: Request) {
  const poste = await posteDeLaRequete(req);
  if (!poste) return NextResponse.json({ error: 'Poste inconnu ou désactivé' }, { status: 401 });

  // Formations du poste (3 au plus, décidées dans l'admin) ; un élève n'y reçoit que ses formations validées parmi elles.
  const formations = formationsDuPoste(poste.formations) ?? ['cs50x'];
  const tous = await elevesDeLEcole(poste.institutionId);
  const inscriptions = tous.length
    ? await prisma.inscriptionFormation.findMany({ where: { userId: { in: tous.map((u) => u.id) } }, select: { userId: true, formation: true, statut: true, studentType: true, paymentStatus: true } })
    : [];
  const eleves = tous.flatMap((u) => {
    const siennes = inscriptions.filter((i) => i.userId === u.id);
    const aInstaller = formationsAInstaller(siennes, formations);
    if (!aInstaller.length) return []; // aucune formation de ce poste n'est ouverte pour cet élève
    return [{
      ...u,
      inscriptions: aInstaller.map((f) => {
        const i = siennes.find((x) => x.formation === f);
        return { formation: f, statut: 'VALIDEE', studentType: i?.studentType ?? u.studentType, paymentStatus: i?.paymentStatus ?? u.paymentStatus };
      }),
    }];
  });
  const ids = eleves.map((u) => u.id);
  const depuisUnAn = new Date(Date.now() - 365 * 86_400_000);

  const [tentatives, semaines] = await Promise.all([
    ids.length
      ? prisma.quizAttempt.findMany({
          where: { userId: { in: ids }, createdAt: { gt: depuisUnAn } },
          select: {
            id: true, userId: true, answers: true, score: true, total: true, passed: true, createdAt: true,
            quiz: { select: { lessonId: true, dayOfWeek: true, questions: { select: { id: true, order: true } } } },
          },
        })
      : [],
    ids.length
      ? prisma.courseProgress.findMany({
          where: { userId: { in: ids } },
          select: { userId: true, courseSlug: true, week: true, bestScore: true, passedAt: true },
        })
      : [],
  ]);

  // Réponses rangées par numéro de question : les identifiants des questions diffèrent sur le poste.
  const quizAttempts = tentatives.map((t) => {
    const parId = (t.answers ?? {}) as Record<string, unknown>;
    const reponses: Record<string, string> = {};
    for (const q of t.quiz.questions) if (parId[q.id] != null) reponses[String(q.order)] = String(parId[q.id]);
    return {
      id: t.id, userId: t.userId, lessonId: t.quiz.lessonId, dayOfWeek: t.quiz.dayOfWeek,
      reponses, score: t.score, total: t.total, passed: t.passed, createdAt: t.createdAt,
    };
  });

  await prisma.posteEcole.update({ where: { id: poste.id }, data: { derniereSynchro: new Date() } });
  return NextResponse.json({
    institution: {
      id: poste.institution.id, name: poste.institution.name, acronym: poste.institution.acronym,
      country: poste.institution.country, type: poste.institution.type,
    },
    formations,
    eleves,
    quizAttempts,
    courseProgress: semaines,
  });
}
