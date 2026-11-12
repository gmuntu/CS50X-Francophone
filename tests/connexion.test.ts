// Connexion par e-mail et mot de passe : la vraie fonction de vérification de auth.ts,
// avec une fausse base en mémoire (NextAuth lui-même est remplacé pour récupérer cette fonction).
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import bcrypt from 'bcryptjs';

const { fausseBase, config } = vi.hoisted(() => ({
  fausseBase: { user: { findFirst: vi.fn() }, compteur: { upsert: vi.fn(), deleteMany: vi.fn() } },
  config: { valeur: null as any },
}));
vi.mock('@/lib/prisma', () => ({ prisma: fausseBase }));
vi.mock('@auth/prisma-adapter', () => ({ PrismaAdapter: () => ({}) }));
vi.mock('next-auth/providers/credentials', () => ({ default: (options: any) => options }));
vi.mock('next-auth/providers/google', () => ({ default: () => ({}) }));
vi.mock('next-auth/providers/github', () => ({ default: () => ({}) }));
vi.mock('next-auth', () => ({
  default: (c: any) => { config.valeur = c; return { handlers: {}, auth: vi.fn(), signIn: vi.fn(), signOut: vi.fn() }; },
  CredentialsSignin: class extends Error {},
}));

await import('@/auth');
const verifier = (email: string, password: string) =>
  config.valeur.providers.find((p: any) => p.id === 'credentials').authorize({ email, password });

let empreinte = '';
beforeAll(async () => { empreinte = await bcrypt.hash('BonMotDePasse-2026', 4); });

const compte = (extra: Record<string, unknown> = {}) => ({
  id: 'eleve-1', email: 'eleve@test.local', name: 'Élève Test', password: empreinte,
  role: 'STUDENT', status: 'ACTIVE', accessExpiresAt: null, image: null, ...extra,
});

let essais = 0;
beforeEach(() => {
  vi.clearAllMocks();
  essais = 0;
  fausseBase.compteur.upsert.mockImplementation(async () => ({ nombre: ++essais }));
  fausseBase.compteur.deleteMany.mockResolvedValue({ count: 0 });
  fausseBase.user.findFirst.mockResolvedValue(compte());
});

describe('Connexion', () => {
  it('bon mot de passe : connecté', async () => {
    expect(await verifier('eleve@test.local', 'BonMotDePasse-2026')).toMatchObject({ id: 'eleve-1', role: 'STUDENT' });
  });

  it('l’adresse est acceptée en majuscules et avec des espaces', async () => {
    expect(await verifier('  ELEVE@test.local ', 'BonMotDePasse-2026')).toMatchObject({ id: 'eleve-1' });
    expect(fausseBase.user.findFirst.mock.calls[0][0].where.email.in).toEqual(['eleve@test.local']);
  });

  it('mauvais mot de passe : refusé', async () => {
    expect(await verifier('eleve@test.local', 'MauvaisEssai')).toBeNull();
  });

  it('mot de passe vide : refusé', async () => {
    expect(await verifier('eleve@test.local', '')).toBeNull();
  });

  it('compte inconnu : refusé', async () => {
    fausseBase.user.findFirst.mockResolvedValue(null);
    expect(await verifier('personne@test.local', 'BonMotDePasse-2026')).toBeNull();
  });

  it('compte suspendu (ex. poste désactivé) : refusé même avec le bon mot de passe', async () => {
    fausseBase.user.findFirst.mockResolvedValue(compte({ status: 'SUSPENDED' }));
    expect(await verifier('eleve@test.local', 'BonMotDePasse-2026')).toBeNull();
  });

  it('compte sans mot de passe (effacé sur un poste désactivé) : refusé', async () => {
    fausseBase.user.findFirst.mockResolvedValue(compte({ password: null }));
    expect(await verifier('eleve@test.local', 'BonMotDePasse-2026')).toBeNull();
  });

  it('candidat libre en attente de paiement : refusé, avec un message dédié', async () => {
    fausseBase.user.findFirst.mockResolvedValue(compte({ status: 'PENDING' }));
    await expect(verifier('eleve@test.local', 'BonMotDePasse-2026')).rejects.toMatchObject({ code: 'en_attente' });
  });

  it('compte en attente et mauvais mot de passe : refus ordinaire, rien n’est révélé', async () => {
    fausseBase.user.findFirst.mockResolvedValue(compte({ status: 'PENDING' }));
    expect(await verifier('eleve@test.local', 'MauvaisMotDePasse')).toBeNull();
  });

  it('accès testeur expiré : message dédié', async () => {
    fausseBase.user.findFirst.mockResolvedValue(compte({ accessExpiresAt: new Date(Date.now() - 1000) }));
    await expect(verifier('eleve@test.local', 'BonMotDePasse-2026')).rejects.toBeInstanceOf(Error);
  });

  it('après 10 essais dans l’heure : bloqué, même avec le bon mot de passe', async () => {
    essais = 10;
    expect(await verifier('eleve@test.local', 'BonMotDePasse-2026')).toBeNull();
    expect(fausseBase.user.findFirst).not.toHaveBeenCalled();
  });

  it('ne met jamais une photo de webcam dans la session', async () => {
    fausseBase.user.findFirst.mockResolvedValue(compte({ image: 'data:image/jpeg;base64,AAAA' }));
    expect((await verifier('eleve@test.local', 'BonMotDePasse-2026')).image).toBeNull();
  });
});
