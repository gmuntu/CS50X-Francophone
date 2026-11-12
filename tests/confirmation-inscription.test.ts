import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';

// Fausse base en mémoire : dossiers mis de côté et comptes.
const { base, fausseBase } = vi.hoisted(() => {
  const base = { attentes: [] as any[], comptes: [] as any[], erreurCreation: null as any };
  const fausseBase = {
    inscriptionEnAttente: {
      create: vi.fn(async ({ data }: any) => { const n = { id: `a${Math.random()}`, ...data }; base.attentes.push(n); return n; }),
      findUnique: vi.fn(async ({ where }: any) => base.attentes.find((x) => x.jetonHache === where.jetonHache) ?? null),
      delete: vi.fn(async ({ where }: any) => { base.attentes = base.attentes.filter((x) => x.id !== where.id); }),
      deleteMany: vi.fn(async ({ where }: any) => {
        const avant = base.attentes.length;
        base.attentes = base.attentes.filter((x) => (where.email ? x.email !== where.email : !(x.expireLe < where.expireLe.lt)));
        return { count: avant - base.attentes.length };
      }),
    },
    user: {
      findUnique: vi.fn(async ({ where }: any) => base.comptes.find((u) => (where.email ? u.email === where.email : u.dossierNumber === where.dossierNumber)) ?? null),
      create: vi.fn(async ({ data }: any) => {
        if (base.erreurCreation) throw base.erreurCreation;
        const u = { id: `u${base.comptes.length + 1}`, ...data }; base.comptes.push(u); return u;
      }),
    },
  };
  return { base, fausseBase };
});
vi.mock('@/lib/prisma', () => ({ prisma: fausseBase }));

import { confirmerInscription, courrielDeConfirmation, hacherJeton, menageDossiersExpires, mettreDeCote, DUREE_LIEN_MS, MOT_DE_PASSE_LONGUEUR_MAX, type DossierInscription } from '@/lib/inscription-confirmation';

const MDP = 'MotDePasse-Awa-2026';
const HACHE = bcrypt.hashSync(MDP, 4);
const dossier = (plus: Partial<DossierInscription> = {}): DossierInscription => ({
  email: 'eleve@test.local', password: HACHE, name: 'Awa Test', firstName: 'Awa', lastName: 'Test',
  institutionId: null, courseSessionId: null, birthDate: '2000-01-01T00:00:00.000Z', countryCode: 'CD', dialCode: '+243',
  phone: '+243 812345678', dossierNumber: '243-26-10001', studentType: 'LIBRE', university: null,
  paymentStatus: 'PENDING', paymentMethod: 'A_CONVENIR', paymentAmount: 500, ...plus,
});

beforeEach(() => { base.attentes = []; base.comptes = []; base.erreurCreation = null; });

describe('Confirmation de l’adresse à l’inscription', () => {
  it('mise de côté : aucun compte créé, le jeton n’est pas stocké en clair', async () => {
    const jeton = await mettreDeCote(dossier());
    expect(base.comptes).toHaveLength(0);
    expect(base.attentes).toHaveLength(1);
    expect(JSON.stringify(base.attentes[0])).not.toContain(jeton);
    expect(base.attentes[0].jetonHache).toBe(hacherJeton(jeton));
  });

  it('bon lien et bon mot de passe : le compte est créé « en attente », et le lien ne sert qu’une fois', async () => {
    const jeton = await mettreDeCote(dossier());
    expect(await confirmerInscription(jeton, MDP)).toBe('ok');
    expect(base.comptes).toHaveLength(1);
    expect(base.comptes[0]).toMatchObject({ email: 'eleve@test.local', status: 'PENDING', role: 'STUDENT', paymentAmount: 500 });
    expect(base.comptes[0].birthDate.toISOString()).toBe('2000-01-01T00:00:00.000Z');
    expect(base.attentes).toHaveLength(0);
    expect(await confirmerInscription(jeton, MDP)).toBe('invalide');
    expect(base.comptes).toHaveLength(1);
  });

  it('bon lien mais mauvais mot de passe ou mot de passe absent : rien n’est créé, le lien reste utilisable', async () => {
    const jeton = await mettreDeCote(dossier());
    expect(await confirmerInscription(jeton, 'un-autre-mot-de-passe')).toBe('motdepasse');
    expect(await confirmerInscription(jeton, '')).toBe('motdepasse');
    expect(base.comptes).toHaveLength(0);
    expect(base.attentes).toHaveLength(1);
    expect(await confirmerInscription(jeton, MDP)).toBe('ok');
  });

  it('un tiers se réinscrit avec l’adresse de l’élève : l’élève ne peut pas confirmer le dossier du tiers, et son propre lien marche toujours', async () => {
    const lienEleve = await mettreDeCote(dossier());
    const lienTiers = await mettreDeCote(dossier({ password: bcrypt.hashSync('mot-de-passe-du-tiers', 4), name: 'Tiers', phone: '+243 999999999' }));
    expect(base.attentes).toHaveLength(2); // le dossier de l'élève n'a pas été écrasé
    // L'élève clique sur le courriel le plus récent (celui du tiers) et saisit SON mot de passe : refusé.
    expect(await confirmerInscription(lienTiers, MDP)).toBe('motdepasse');
    expect(base.comptes).toHaveLength(0);
    // Avec son propre lien : compte créé avec SES données, et le dossier du tiers est effacé.
    expect(await confirmerInscription(lienEleve, MDP)).toBe('ok');
    expect(base.comptes[0]).toMatchObject({ name: 'Awa Test', password: HACHE, phone: '+243 812345678' });
    expect(base.attentes).toHaveLength(0);
    expect(await confirmerInscription(lienTiers, 'mot-de-passe-du-tiers')).toBe('invalide');
    expect(base.comptes).toHaveLength(1);
  });

  it('lien encore bon juste avant 24 h, expiré juste après', async () => {
    const depart = new Date('2026-11-11T10:00:00Z');
    const jeton = await mettreDeCote(dossier(), depart);
    expect(await confirmerInscription(jeton, MDP, new Date(depart.getTime() + DUREE_LIEN_MS + 1000))).toBe('expire');
    expect(base.comptes).toHaveLength(0);
    expect(base.attentes).toHaveLength(0); // le dossier expiré est effacé

    const jeton2 = await mettreDeCote(dossier(), depart);
    expect(await confirmerInscription(jeton2, MDP, new Date(depart.getTime() + DUREE_LIEN_MS - 1000))).toBe('ok');
  });

  it('jeton inconnu, vide ou démesuré : refusé sans rien créer', async () => {
    await mettreDeCote(dossier());
    expect(await confirmerInscription('x'.repeat(43), MDP)).toBe('invalide');
    expect(await confirmerInscription('', MDP)).toBe('invalide');
    expect(await confirmerInscription('x'.repeat(5000), MDP)).toBe('invalide');
    expect(base.comptes).toHaveLength(0);
  });

  it('un compte existe déjà avec cette adresse : rien n’est créé ni modifié', async () => {
    const jeton = await mettreDeCote(dossier());
    base.comptes.push({ id: 'u0', email: 'eleve@test.local', password: 'vrai', dossierNumber: '243-26-99999' });
    expect(await confirmerInscription(jeton, MDP)).toBe('ok');
    expect(base.comptes).toHaveLength(1);
    expect(base.comptes[0].password).toBe('vrai');
  });

  it('deux clics en même temps : le second ne provoque pas d’erreur', async () => {
    const jeton = await mettreDeCote(dossier());
    // Le premier clic crée le compte juste avant que le second n'essaie : erreur « déjà pris » sur l'adresse.
    fausseBase.user.create.mockImplementationOnce(async ({ data }: any) => {
      base.comptes.push({ id: 'u-premier-clic', ...data });
      throw Object.assign(new Error('unique'), { code: 'P2002' });
    });
    expect(await confirmerInscription(jeton, MDP)).toBe('ok');
    expect(base.comptes).toHaveLength(1);
  });

  it('numéro de dossier pris au même instant par un autre élève : nouveau numéro, le compte est bien créé', async () => {
    const jeton = await mettreDeCote(dossier());
    fausseBase.user.create.mockImplementationOnce(async () => { throw Object.assign(new Error('unique'), { code: 'P2002' }); });
    expect(await confirmerInscription(jeton, MDP)).toBe('ok');
    expect(base.comptes).toHaveLength(1);
    expect(base.comptes[0].email).toBe('eleve@test.local');
    expect(base.comptes[0].dossierNumber).not.toBe('243-26-10001');
  });

  it('mot de passe démesuré : refusé sans calcul', async () => {
    const jeton = await mettreDeCote(dossier());
    expect(await confirmerInscription(jeton, 'x'.repeat(MOT_DE_PASSE_LONGUEUR_MAX + 1))).toBe('motdepasse');
  });

  it('numéro de dossier pris entre-temps : un nouveau numéro est attribué', async () => {
    const jeton = await mettreDeCote(dossier());
    base.comptes.push({ id: 'u0', email: 'autre@test.local', dossierNumber: '243-26-10001' });
    expect(await confirmerInscription(jeton, MDP)).toBe('ok');
    expect(base.comptes[1].dossierNumber).not.toBe('243-26-10001');
    expect(base.comptes[1].dossierNumber).toMatch(/^243-\d\d-\d{5}$/);
  });

  it('ménage : seuls les dossiers expirés sont effacés', async () => {
    const depart = new Date('2026-11-11T10:00:00Z');
    await mettreDeCote(dossier({ email: 'vieux@test.local' }), new Date(depart.getTime() - 2 * DUREE_LIEN_MS));
    await mettreDeCote(dossier({ email: 'recent@test.local' }), depart);
    await menageDossiersExpires(depart);
    expect(base.attentes.map((a) => a.email)).toEqual(['recent@test.local']);
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
