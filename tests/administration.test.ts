// Droits d'administration et clés des tâches automatiques (lib/securite.ts).
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fausseBase, session } = vi.hoisted(() => ({
  fausseBase: { user: { findUnique: vi.fn() }, identityProfile: { update: vi.fn() } },
  session: { valeur: null as null | { user: { id: string; role?: string } } },
}));
vi.mock('@/lib/prisma', () => ({ prisma: fausseBase }));
vi.mock('@/auth', () => ({ auth: async () => session.valeur }));

import { adresseIP, cleEgale, cronAutorise, roleActuel } from '@/lib/securite';
import { PATCH as autoriserNouvelleEmpreinte } from '@/app/api/admin/identite/route';

const enBase = (role: string, status = 'ACTIVE') => fausseBase.user.findUnique.mockResolvedValue({ role, status });

beforeEach(() => {
  vi.clearAllMocks();
  fausseBase.identityProfile.update.mockResolvedValue({});
});

describe('Rôle de la personne connectée', () => {
  it('pas connecté : aucun rôle', async () => {
    session.valeur = null;
    expect(await roleActuel()).toBeNull();
  });

  it('le rôle vient de la base, pas de la session', async () => {
    session.valeur = { user: { id: 'u1', role: 'ADMIN' } }; // ancienne session d'administrateur…
    enBase('STUDENT'); // … mais rétrogradé depuis
    expect(await roleActuel()).toBe('STUDENT');
  });

  it('compte suspendu : aucun rôle', async () => {
    session.valeur = { user: { id: 'u1' } };
    enBase('ADMIN', 'SUSPENDED');
    expect(await roleActuel()).toBeNull();
  });
});

describe('Une action d’administration (autoriser une nouvelle empreinte)', () => {
  const appel = () =>
    autoriserNouvelleEmpreinte(new Request('http://localhost/api/admin/identite', { method: 'PATCH', body: JSON.stringify({ userId: 'eleve-9' }) }));

  it('un élève est refusé (403) et rien ne change', async () => {
    session.valeur = { user: { id: 'u1' } };
    enBase('STUDENT');
    expect((await appel()).status).toBe(403);
    expect(fausseBase.identityProfile.update).not.toHaveBeenCalled();
  });

  it('un administrateur rétrogradé est refusé, même avec son ancienne session', async () => {
    session.valeur = { user: { id: 'u1', role: 'ADMIN' } };
    enBase('INSTRUCTOR');
    expect((await appel()).status).toBe(403);
  });

  it('un visiteur non connecté est refusé', async () => {
    session.valeur = null;
    expect((await appel()).status).toBe(403);
  });

  it('un vrai administrateur peut le faire', async () => {
    session.valeur = { user: { id: 'u1' } };
    enBase('ADMIN');
    expect((await appel()).status).toBe(200);
    expect(fausseBase.identityProfile.update).toHaveBeenCalledOnce();
  });
});

describe('Clés secrètes', () => {
  it('cleEgale : seule la clé exacte passe', () => {
    expect(cleEgale('abc123', 'abc123')).toBe(true);
    expect(cleEgale('abc124', 'abc123')).toBe(false);
    expect(cleEgale('abc', 'abc123')).toBe(false);
    expect(cleEgale('', 'abc123')).toBe(false);
    expect(cleEgale(null, 'abc123')).toBe(false);
    expect(cleEgale('abc123', '')).toBe(false);
  });

  it('tâches automatiques : il faut « Bearer » + le bon secret', () => {
    const avec = (v?: string) => new Request('http://localhost/api/cron', { headers: v ? { authorization: v } : {} });
    expect(cronAutorise(avec('Bearer secret-de-test'))).toBe(true);
    expect(cronAutorise(avec('Bearer autre-chose'))).toBe(false);
    expect(cronAutorise(avec('secret-de-test'))).toBe(false);
    expect(cronAutorise(avec())).toBe(false);
  });

  it('adresse IP : la première de la liste transmise par Vercel', () => {
    const r = new Request('http://localhost/', { headers: { 'x-forwarded-for': '203.0.113.7, 10.0.0.1' } });
    expect(adresseIP(r)).toBe('203.0.113.7');
    expect(adresseIP(new Request('http://localhost/'))).toBe('inconnue');
  });
});
