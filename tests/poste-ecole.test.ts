// Ordinateurs d'école : ce qu'un poste envoie au site central (quiz faits sans Internet, semaines réussies)
// et ce qu'il reçoit (comptes de SES élèves). Aucune vraie base : tout passe par une fausse base en mémoire.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';

const { fausseBase } = vi.hoisted(() => ({
  fausseBase: {
    posteEcole: { findUnique: vi.fn(), update: vi.fn() },
    user: { findMany: vi.fn() },
    // Inscriptions : aucune (comptes d'avant les formations multiples, rattachés à CS50x).
    inscriptionFormation: { findMany: vi.fn(async () => []) },
    quiz: { findUnique: vi.fn() },
    quizAttempt: { createMany: vi.fn(), findMany: vi.fn() },
    courseProgress: { findUnique: vi.fn(), upsert: vi.fn(), findMany: vi.fn() },
  },
}));
vi.mock('@/lib/prisma', () => ({ prisma: fausseBase }));

import { POST as envoi } from '@/app/api/poste/envoi/route';
import { GET as eleves } from '@/app/api/poste/eleves/route';
import { datePlausible } from '@/lib/poste-ecole';

const CLE = 'poste_cle-de-test-0123456789';
const EMPREINTE = createHash('sha256').update(CLE).digest('hex');
const POSTE = { id: 'poste-1', cleHash: EMPREINTE, active: true, institutionId: 'ecole-1', institution: { id: 'ecole-1', name: 'École Test', acronym: 'ET', country: 'CA', type: 'ECOLE', active: true } };
const QUIZ = { id: 'quiz-central', questions: [ { id: 'c1', order: 0, correctOption: 'B' }, { id: 'c2', order: 1, correctOption: 'A' }, { id: 'c3', order: 2, correctOption: 'D' } ] };
const ELEVE = { id: 'eleve-de-l-ecole', email: 'eleve@test.local', password: '$2a$12$empreinte' };

const tentative = (extra: Record<string, unknown> = {}) => ({
  id: 'tentativeposte0001', userId: ELEVE.id, lessonId: 0, dayOfWeek: 'MONDAY',
  reponses: { '0': 'B', '1': 'A', '2': 'D' }, createdAt: new Date(Date.now() - 3600_000).toISOString(), ...extra,
});

const appelEnvoi = (corps: unknown, cle: string | null = CLE) =>
  envoi(new Request('http://localhost/api/poste/envoi', {
    method: 'POST', body: JSON.stringify(corps), headers: cle ? { 'x-savoiria-poste': cle } : {},
  }));

beforeEach(() => {
  vi.clearAllMocks();
  fausseBase.posteEcole.findUnique.mockImplementation(async ({ where }: any) => (where.cleHash === EMPREINTE ? POSTE : null));
  fausseBase.user.findMany.mockResolvedValue([ELEVE]);
  fausseBase.quiz.findUnique.mockResolvedValue(QUIZ);
  fausseBase.quizAttempt.createMany.mockImplementation(async ({ data }: any) => ({ count: data.length }));
  fausseBase.quizAttempt.findMany.mockResolvedValue([]);
  fausseBase.courseProgress.findUnique.mockResolvedValue(null);
  fausseBase.courseProgress.findMany.mockResolvedValue([]);
});

describe('Le poste envoie un quiz fait sans Internet', () => {
  it('le site recalcule la note avec SES bonnes réponses', async () => {
    const r = await (await appelEnvoi({ quizAttempts: [tentative()] })).json();
    expect(r).toMatchObject({ quizAjoutes: 1, refuses: 0 });
    const ligne = fausseBase.quizAttempt.createMany.mock.calls[0][0].data[0];
    expect(ligne).toMatchObject({ quizId: QUIZ.id, userId: ELEVE.id, score: 3, total: 3, passed: true });
    // Réponses rangées par identifiant de question du site central
    expect(ligne.answers).toEqual({ c1: 'B', c2: 'A', c3: 'D' });
  });

  it('une note envoyée par le poste est ignorée', async () => {
    await appelEnvoi({ quizAttempts: [tentative({ reponses: { '0': 'C' }, score: 3, passed: true })] });
    expect(fausseBase.quizAttempt.createMany.mock.calls[0][0].data[0]).toMatchObject({ score: 0, passed: false });
  });

  it('renvoyer le même quiz ne crée pas de doublon (skipDuplicates)', async () => {
    await appelEnvoi({ quizAttempts: [tentative()] });
    expect(fausseBase.quizAttempt.createMany.mock.calls[0][0].skipDuplicates).toBe(true);
  });

  it('refuse le quiz d’un élève qui n’est pas de cette école', async () => {
    const r = await (await appelEnvoi({ quizAttempts: [tentative({ userId: 'eleve-d-une-autre-ecole' })] })).json();
    expect(r).toMatchObject({ quizAjoutes: 0, refuses: 1 });
  });

  it('refuse une date dans le futur (horloge du poste fausse)', async () => {
    const futur = new Date(Date.now() + 3 * 86_400_000).toISOString();
    const r = await (await appelEnvoi({ quizAttempts: [tentative({ createdAt: futur })] })).json();
    expect(r.refuses).toBe(1);
  });

  it('refuse un quiz qui n’existe pas sur le site', async () => {
    fausseBase.quiz.findUnique.mockResolvedValue(null);
    expect((await (await appelEnvoi({ quizAttempts: [tentative()] })).json()).refuses).toBe(1);
  });

  it('refuse un envoi trop gros (plus de 500 lignes)', async () => {
    const lignes = Array.from({ length: 501 }, () => tentative());
    expect((await appelEnvoi({ quizAttempts: lignes })).status).toBe(413);
  });
});

describe('Clé du poste', () => {
  it('sans clé : refusé (401)', async () => {
    expect((await appelEnvoi({ quizAttempts: [] }, null)).status).toBe(401);
  });

  it('mauvaise clé : refusé (401)', async () => {
    expect((await appelEnvoi({ quizAttempts: [] }, 'poste_mauvaise-cle')).status).toBe(401);
  });

  it('poste désactivé dans l’administration : refusé (401)', async () => {
    fausseBase.posteEcole.findUnique.mockResolvedValue({ ...POSTE, active: false });
    expect((await appelEnvoi({ quizAttempts: [] })).status).toBe(401);
    expect(fausseBase.quizAttempt.createMany).not.toHaveBeenCalled();
  });

  it('école désactivée : refusé (401)', async () => {
    fausseBase.posteEcole.findUnique.mockResolvedValue({ ...POSTE, institution: { ...POSTE.institution, active: false } });
    expect((await eleves(new Request('http://localhost/api/poste/eleves', { headers: { 'x-savoiria-poste': CLE } }))).status).toBe(401);
  });
});

describe('Le poste reçoit les comptes de son école', () => {
  it('ne demande que les élèves actifs de SON école (jamais le personnel)', async () => {
    const r = await (await eleves(new Request('http://localhost/api/poste/eleves', { headers: { 'x-savoiria-poste': CLE } }))).json();
    expect(r.eleves).toHaveLength(1);
    const filtre = fausseBase.user.findMany.mock.calls[0][0].where;
    expect(filtre).toMatchObject({ institutionId: 'ecole-1', role: 'STUDENT', status: 'ACTIVE' });
  });
});

describe('Date reçue d’un poste', () => {
  it('accepte une date récente, refuse le futur, l’an passé et le texte', () => {
    expect(datePlausible(new Date(Date.now() - 86_400_000).toISOString())).toBeInstanceOf(Date);
    expect(datePlausible(new Date(Date.now() + 86_400_000).toISOString())).toBeNull();
    expect(datePlausible(new Date(Date.now() - 400 * 86_400_000).toISOString())).toBeNull();
    expect(datePlausible('pas une date')).toBeNull();
    expect(datePlausible(null)).toBeNull();
  });
});
