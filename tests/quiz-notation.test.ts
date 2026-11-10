// Notation des quiz : la note est toujours calculée par le serveur, avec les bonnes réponses de la base.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fausseBase, session } = vi.hoisted(() => ({
  fausseBase: {
    quiz: { findUnique: vi.fn() },
    quizAttempt: { findFirst: vi.fn(), create: vi.fn() },
  },
  session: { valeur: null as null | { user: { id: string } } },
}));
vi.mock('@/lib/prisma', () => ({ prisma: fausseBase }));
vi.mock('@/auth', () => ({ auth: async () => session.valeur }));

import { POST } from '@/app/api/quiz/submit/route';
import { noter } from '@/lib/poste-ecole';

// Quiz de 3 questions : bonnes réponses B, A, D
const QUIZ = {
  id: 'quiz-semaine-0',
  questions: [
    { id: 'q1', order: 0, correctOption: 'B' },
    { id: 'q2', order: 1, correctOption: 'A' },
    { id: 'q3', order: 2, correctOption: 'D' },
  ],
};

const envoyer = (corps: unknown) =>
  POST(new Request('http://localhost/api/quiz/submit', { method: 'POST', body: JSON.stringify(corps) }) as any);

beforeEach(() => {
  vi.clearAllMocks();
  session.valeur = { user: { id: 'eleve-1' } };
  fausseBase.quiz.findUnique.mockResolvedValue(QUIZ);
  fausseBase.quizAttempt.findFirst.mockResolvedValue(null);
  fausseBase.quizAttempt.create.mockImplementation(async ({ data }: any) => ({ id: 'tentative-1', ...data }));
});

describe('Quiz fait sur le site', () => {
  it('3 bonnes réponses sur 3 : 3/3, réussi', async () => {
    const r = await (await envoyer({ quizId: QUIZ.id, answers: { q1: 'B', q2: 'A', q3: 'D' } })).json();
    expect(r).toMatchObject({ score: 3, total: 3, passed: true });
  });

  it('2 sur 3 (67 %) : échoué, il faut 70 %', async () => {
    const r = await (await envoyer({ quizId: QUIZ.id, answers: { q1: 'B', q2: 'A', q3: 'C' } })).json();
    expect(r).toMatchObject({ score: 2, total: 3, passed: false });
  });

  it('accepte les minuscules et les espaces autour de la lettre', async () => {
    const r = await (await envoyer({ quizId: QUIZ.id, answers: { q1: ' b ', q2: 'a', q3: 'd' } })).json();
    expect(r.score).toBe(3);
  });

  it('ignore une note envoyée par le navigateur : seule la base décide', async () => {
    const r = await (await envoyer({ quizId: QUIZ.id, answers: { q1: 'C' }, score: 3, passed: true })).json();
    expect(r).toMatchObject({ score: 0, passed: false });
    expect(fausseBase.quizAttempt.create.mock.calls[0][0].data.score).toBe(0);
  });

  it('sans connexion : donne la note mais n’enregistre rien', async () => {
    session.valeur = null;
    const r = await (await envoyer({ quizId: QUIZ.id, answers: { q1: 'B' } })).json();
    expect(r.score).toBe(1);
    expect(fausseBase.quizAttempt.create).not.toHaveBeenCalled();
  });

  it('quiz introuvable : erreur 404', async () => {
    fausseBase.quiz.findUnique.mockResolvedValue(null);
    expect((await envoyer({ quizId: 'inconnu', answers: {} })).status).toBe(404);
  });
});

describe('Quiz fait hors ligne puis envoyé', () => {
  it('résultat d’un autre élève sur un appareil partagé : refusé (409)', async () => {
    const r = await envoyer({ quizId: QUIZ.id, answers: {}, queued: true, eleve: 'eleve-2' });
    expect(r.status).toBe(409);
    expect(fausseBase.quizAttempt.create).not.toHaveBeenCalled();
  });

  it('session expirée : refusé (401)', async () => {
    session.valeur = null;
    expect((await envoyer({ quizId: QUIZ.id, answers: {}, queued: true })).status).toBe(401);
  });

  it('renvoyé deux fois (réseau instable) : pas de doublon', async () => {
    const takenAt = new Date(Date.now() - 3600_000).toISOString();
    fausseBase.quizAttempt.findFirst.mockResolvedValue({ id: 'deja-la', score: 3, total: 3, passed: true });
    const r = await (await envoyer({ quizId: QUIZ.id, answers: {}, takenAt, queued: true })).json();
    expect(r.id).toBe('deja-la');
    expect(fausseBase.quizAttempt.create).not.toHaveBeenCalled();
  });
});

describe('Note d’un quiz venu d’un ordinateur d’école (réponses par numéro de question)', () => {
  it('compte les bonnes réponses et applique le seuil de 70 %', () => {
    expect(noter(QUIZ.questions, { '0': 'B', '1': 'A', '2': 'D' })).toEqual({ score: 3, total: 3, passed: true });
    expect(noter(QUIZ.questions, { '0': 'B', '1': 'A' })).toEqual({ score: 2, total: 3, passed: false });
  });

  it('un quiz sans question n’est jamais réussi', () => {
    expect(noter([], {})).toEqual({ score: 0, total: 0, passed: false });
  });
});
