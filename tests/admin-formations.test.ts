import { describe, it, expect, vi, beforeEach } from 'vitest';

const { base, fausseBase } = vi.hoisted(() => {
  const base = { inscription: null as any, comptes: [] as any[], reglages: [] as any[] };
  const fausseBase = {
    inscriptionFormation: {
      findUnique: vi.fn(async () => base.inscription),
      update: vi.fn(async ({ data }: any) => { Object.assign(base.inscription, data); }),
    },
    user: { update: vi.fn(async ({ where, data }: any) => { base.comptes.push({ id: where.id, ...data }); }) },
    reglageFormation: {
      findMany: vi.fn(async () => base.reglages),
      findUnique: vi.fn(async ({ where }: any) => base.reglages.find((r) => r.formation === where.formation) ?? null),
      upsert: vi.fn(async ({ where, create, update }: any) => {
        const r = base.reglages.find((x) => x.formation === where.formation);
        if (r) Object.assign(r, update); else base.reglages.push({ ...create });
      }),
    },
  };
  return { base, fausseBase };
});
vi.mock('@/lib/prisma', () => ({ prisma: fausseBase }));

import { changerInscription } from '@/lib/inscriptions';
import { bourseActive, changerReglage, reglagesFormations } from '@/lib/reglages-formations';

const inscription = (plus: any = {}) => ({
  id: 'i1', formation: 'ia-essentiels', statut: 'EN_ATTENTE', valideeLe: null, paymentStatus: 'PENDING',
  user: { id: 'u1', role: 'STUDENT', status: 'PENDING', _count: { inscriptions: 1 } }, ...plus,
});
beforeEach(() => { base.inscription = inscription(); base.comptes = []; base.reglages = []; });

describe('Validation par formation', () => {
  it('valider la première formation rend le compte actif', async () => {
    expect(await changerInscription('i1', { statut: 'VALIDEE' })).toEqual({ ok: true, compteActive: true });
    expect(base.inscription.statut).toBe('VALIDEE');
    expect(base.inscription.valideeLe).toBeInstanceOf(Date);
    expect(base.comptes).toEqual([{ id: 'u1', status: 'ACTIVE' }]);
  });

  it('refuser ou suspendre une formation ne touche pas au compte', async () => {
    base.inscription = inscription({ statut: 'VALIDEE', user: { id: 'u1', role: 'STUDENT', status: 'ACTIVE', _count: { inscriptions: 2 } } });
    expect(await changerInscription('i1', { statut: 'SUSPENDUE' })).toEqual({ ok: true, compteActive: false });
    expect(base.inscription.valideeLe).toBeNull();
    expect(await changerInscription('i1', { statut: 'REFUSEE' })).toMatchObject({ ok: true });
    expect(base.comptes).toEqual([]);
  });

  it('un compte suspendu n’est pas réactivé par la validation d’une formation', async () => {
    base.inscription = inscription({ user: { id: 'u1', role: 'STUDENT', status: 'SUSPENDED', _count: { inscriptions: 1 } } });
    expect(await changerInscription('i1', { statut: 'VALIDEE' })).toEqual({ ok: true, compteActive: false });
    expect(base.comptes).toEqual([]);
  });

  it('paiement : recopié sur le compte seulement si l’élève n’a qu’une formation', async () => {
    await changerInscription('i1', { paymentStatus: 'PAID' });
    expect(base.comptes).toEqual([{ id: 'u1', paymentStatus: 'PAID' }]);
    base.comptes = []; base.inscription = inscription({ user: { id: 'u1', role: 'STUDENT', status: 'ACTIVE', _count: { inscriptions: 2 } } });
    await changerInscription('i1', { paymentStatus: 'PAID' });
    expect(base.comptes).toEqual([]);
  });

  it('valeurs inconnues, inscription absente ou d’un membre du personnel : refusées', async () => {
    expect(await changerInscription('i1', { statut: 'PAYEE' })).toMatchObject({ ok: false, code: 400 });
    expect(await changerInscription('i1', { paymentStatus: 'GRATUIT' })).toMatchObject({ ok: false, code: 400 });
    expect(await changerInscription('i1', { paymentMethod: 'Bitcoin' })).toMatchObject({ ok: false, code: 400 });
    expect(await changerInscription('i1', { paymentAmount: -5 })).toMatchObject({ ok: false, code: 400 });
    expect(await changerInscription('i1', {})).toMatchObject({ ok: false, code: 400 });
    expect(await changerInscription(undefined, { statut: 'VALIDEE' })).toMatchObject({ ok: false, code: 400 });
    base.inscription = null;
    expect(await changerInscription('i9', { statut: 'VALIDEE' })).toMatchObject({ ok: false, code: 404 });
    base.inscription = inscription({ user: { id: 'u2', role: 'ADMIN', status: 'ACTIVE', _count: { inscriptions: 1 } } });
    expect(await changerInscription('i1', { statut: 'VALIDEE' })).toMatchObject({ ok: false, code: 404 });
  });
});

describe('Bourse universitaire activable par formation', () => {
  it('par défaut : CS50x seulement', async () => {
    expect((await reglagesFormations()).map((r) => [r.formation, r.bourseUniversitaire])).toEqual([['cs50x', true], ['ia-essentiels', false]]);
    expect(await bourseActive('cs50x')).toBe(true);
    expect(await bourseActive('ia-essentiels')).toBe(false);
    expect(await bourseActive('aws')).toBe(false);
  });

  it('l’admin l’active pour L’essentiel de l’IA et la désactive pour CS50x', async () => {
    expect(await changerReglage('ia-essentiels', 'bourseUniversitaire', true)).toBe(true);
    expect(await changerReglage('cs50x', 'bourseUniversitaire', false)).toBe(true);
    expect(await bourseActive('ia-essentiels')).toBe(true);
    expect(await bourseActive('cs50x')).toBe(false);
    expect(await changerReglage('aws', 'bourseUniversitaire', true)).toBe(false);
    expect(await changerReglage({ formation: 'cs50x' }, 'bourseUniversitaire', true)).toBe(false);
  });
});
