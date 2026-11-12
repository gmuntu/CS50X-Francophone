import { describe, it, expect, vi, beforeEach } from 'vitest';

// Fausse base en mémoire : dossiers mis de côté et comptes.
const { base, fausseBase } = vi.hoisted(() => {
  const base = { attentes: [] as any[], comptes: [] as any[] };
  const fausseBase = {
    inscriptionEnAttente: {
      upsert: vi.fn(async ({ where, create, update }: any) => {
        const a = base.attentes.find((x) => x.email === where.email);
        if (a) { Object.assign(a, update); return a; }
        const n = { id: `a${base.attentes.length + 1}`, ...create }; base.attentes.push(n); return n;
      }),
      findUnique: vi.fn(async ({ where }: any) => base.attentes.find((x) => x.jetonHache === where.jetonHache) ?? null),
      delete: vi.fn(async ({ where }: any) => { base.attentes = base.attentes.filter((x) => x.id !== where.id); }),
      deleteMany: vi.fn(async () => ({ count: 0 })),
    },
    user: {
      findUnique: vi.fn(async ({ where }: any) => base.comptes.find((u) => (where.email ? u.email === where.email : u.dossierNumber === where.dossierNumber)) ?? null),
      create: vi.fn(async ({ data }: any) => { const u = { id: `u${base.comptes.length + 1}`, ...data }; base.comptes.push(u); return u; }),
    },
  };
  return { base, fausseBase };
});
vi.mock('@/lib/prisma', () => ({ prisma: fausseBase }));

import { confirmerInscription, courrielDeConfirmation, hacherJeton, mettreDeCote, DUREE_LIEN_MS, type DossierInscription } from '@/lib/inscription-confirmation';

const dossier = (plus: Partial<DossierInscription> = {}): DossierInscription => ({
  email: 'eleve@test.local', password: 'hache', name: 'Awa Test', firstName: 'Awa', lastName: 'Test',
  institutionId: null, courseSessionId: null, birthDate: '2000-01-01T00:00:00.000Z', countryCode: 'CD', dialCode: '+243',
  phone: '+243 812345678', dossierNumber: '243-26-10001', studentType: 'LIBRE', university: null,
  paymentStatus: 'PENDING', paymentMethod: 'A_CONVENIR', paymentAmount: 500, ...plus,
});

beforeEach(() => { base.attentes = []; base.comptes = []; });

describe('Confirmation de l’adresse à l’inscription', () => {
  it('mise de côté : aucun compte créé, le jeton n’est pas stocké en clair', async () => {
    const jeton = await mettreDeCote(dossier());
    expect(base.comptes).toHaveLength(0);
    expect(base.attentes).toHaveLength(1);
    expect(JSON.stringify(base.attentes[0])).not.toContain(jeton);
    expect(base.attentes[0].jetonHache).toBe(hacherJeton(jeton));
  });

  it('bon lien : le compte est créé « en attente », et le lien ne sert qu’une fois', async () => {
    const jeton = await mettreDeCote(dossier());
    expect(await confirmerInscription(jeton)).toBe('ok');
    expect(base.comptes).toHaveLength(1);
    expect(base.comptes[0]).toMatchObject({ email: 'eleve@test.local', status: 'PENDING', role: 'STUDENT', paymentAmount: 500 });
    expect(base.comptes[0].birthDate.toISOString()).toBe('2000-01-01T00:00:00.000Z');
    expect(base.attentes).toHaveLength(0);
    expect(await confirmerInscription(jeton)).toBe('invalide');
    expect(base.comptes).toHaveLength(1);
  });

  it('lien encore bon juste avant 24 h, expiré juste après', async () => {
    const depart = new Date('2026-11-11T10:00:00Z');
    const jeton = await mettreDeCote(dossier(), depart);
    expect(await confirmerInscription(jeton, new Date(depart.getTime() + DUREE_LIEN_MS + 1000))).toBe('expire');
    expect(base.comptes).toHaveLength(0);
    expect(base.attentes).toHaveLength(0); // le dossier expiré est effacé

    const jeton2 = await mettreDeCote(dossier(), depart);
    expect(await confirmerInscription(jeton2, new Date(depart.getTime() + DUREE_LIEN_MS - 1000))).toBe('ok');
  });

  it('jeton inconnu, vide ou démesuré : refusé sans rien créer', async () => {
    await mettreDeCote(dossier());
    expect(await confirmerInscription('x'.repeat(43))).toBe('invalide');
    expect(await confirmerInscription('')).toBe('invalide');
    expect(await confirmerInscription('x'.repeat(5000))).toBe('invalide');
    expect(base.comptes).toHaveLength(0);
  });

  it('nouvelle inscription avec la même adresse : seul le dernier lien marche', async () => {
    const ancien = await mettreDeCote(dossier({ password: 'ancien' }));
    const recent = await mettreDeCote(dossier({ password: 'recent' }));
    expect(base.attentes).toHaveLength(1);
    expect(await confirmerInscription(ancien)).toBe('invalide');
    expect(await confirmerInscription(recent)).toBe('ok');
    expect(base.comptes[0].password).toBe('recent');
  });

  it('un compte existe déjà avec cette adresse : rien n’est créé ni modifié', async () => {
    const jeton = await mettreDeCote(dossier());
    base.comptes.push({ id: 'u0', email: 'eleve@test.local', password: 'vrai', dossierNumber: '243-26-99999' });
    expect(await confirmerInscription(jeton)).toBe('ok');
    expect(base.comptes).toHaveLength(1);
    expect(base.comptes[0].password).toBe('vrai');
  });

  it('numéro de dossier pris entre-temps : un nouveau numéro est attribué', async () => {
    const jeton = await mettreDeCote(dossier());
    base.comptes.push({ id: 'u0', email: 'autre@test.local', dossierNumber: '243-26-10001' });
    expect(await confirmerInscription(jeton)).toBe('ok');
    expect(base.comptes[1].dossierNumber).not.toBe('243-26-10001');
    expect(base.comptes[1].dossierNumber).toMatch(/^243-\d\d-\d{5}$/);
  });

  it('le lien de l’email vient de la configuration du site', () => {
    const avant = { ...process.env };
    process.env.SITE_URL = 'https://www.savoiria.online/';
    const c = courrielDeConfirmation('abc_DEF-123');
    expect(c.text).toContain('https://www.savoiria.online/auth/confirmer?jeton=abc_DEF-123');
    expect(c.html).toContain('https://www.savoiria.online/auth/confirmer?jeton=abc_DEF-123');
    process.env = avant;
  });
});
