import { describe, it, expect, vi, beforeEach } from 'vitest';

const { base } = vi.hoisted(() => ({ base: { user: null as any } }));
vi.mock('@/lib/prisma', () => ({ prisma: { user: { findUnique: vi.fn(async () => base.user) } } }));
vi.mock('@/auth', () => ({ auth: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));

import { formationDuChemin, lienOnglet, menuFormation, ONGLETS, ongletDuChemin } from '@/lib/menu-formation';
import { accesFormation } from '@/lib/acces-formation';
import { formationDeLaLecon, formationsAInstaller, formationsDuPoste } from '@/lib/formations-poste';

const eleve = (plus: any = {}) => ({ role: 'STUDENT', status: 'ACTIVE', accessExpiresAt: null, inscriptions: [], ...plus });
beforeEach(() => { base.user = null; });

describe('Menu identique pour toutes les formations', () => {
  const attendu = ['📖 Le programme', '🎓 Salle de cours', '🙋🏿 Demande au prof', '📚 Salle d’étude', '💬 Prof WhatsApp', '🧩 Problèmes'];

  it('même onglets, même ordre, titre = nom de la formation', () => {
    for (const id of ['cs50x', 'ia-essentiels']) {
      const m = menuFormation(id)!;
      expect(m.onglets.map((o) => o.libelle)).toEqual(attendu);
    }
    expect(menuFormation('cs50x')!.titre).toBe('CS50x Francophone');
    expect(menuFormation('ia-essentiels')!.titre).toBe("L'essentiel de l'IA");
    expect(menuFormation('aws')).toBeNull();
  });

  it('chaque onglet mène au contenu de la formation, ou à « Bientôt disponible »', () => {
    const cs = menuFormation('cs50x')!, ia = menuFormation('ia-essentiels')!;
    expect(cs.onglets.map((o) => o.href)).toEqual(['/cs50x', '/tuteur', '/agora', '/salle-etude', '/formations/cs50x/prof-whatsapp', '/courses/cs50x/problemes']);
    expect(ia.onglets.find((o) => o.id === 'salle-etude')).toMatchObject({ href: '/formations/ia-essentiels/salle-etude', bientot: true });
    expect(ia.onglets.find((o) => o.id === 'problemes')!.bientot).toBe(true);
    expect(ia.onglets.find((o) => o.id === 'demande-au-prof')!.bientot).toBe(false);
  });

  it('Prof WhatsApp : « Bientôt » tant que l’admin ne l’a pas allumé', () => {
    expect(menuFormation('cs50x')!.onglets.find((o) => o.id === 'prof-whatsapp')!.bientot).toBe(true);
    expect(menuFormation('cs50x', true)!.onglets.find((o) => o.id === 'prof-whatsapp')!.bientot).toBe(false);
    expect(ONGLETS.map((o) => o.id).indexOf('prof-whatsapp')).toBe(ONGLETS.map((o) => o.id).indexOf('salle-etude') + 1);
  });

  it('la formation et l’onglet sont reconnus d’après l’adresse', () => {
    expect(formationDuChemin('/tuteur')).toBe('cs50x');
    expect(formationDuChemin('/courses/cs50x/lessons/3')).toBe('cs50x');
    expect(formationDuChemin('/formations/ia-essentiels/semaine/2')).toBe('ia-essentiels');
    expect(formationDuChemin('/formations/cs50x/prof-whatsapp')).toBe('cs50x');
    expect(formationDuChemin('/formations')).toBeNull();
    expect(formationDuChemin('/dashboard')).toBeNull();
    expect(ongletDuChemin('ia-essentiels', '/formations/ia-essentiels/demande-au-prof')).toBe('demande-au-prof');
    expect(ongletDuChemin('ia-essentiels', '/formations/ia-essentiels')).toBe('programme');
    expect(ongletDuChemin('cs50x', '/courses/cs50x/problemes/3')).toBe('problemes');
    expect(lienOnglet('nouvelle-formation', 'salle-etude')).toBe('/formations/nouvelle-formation/salle-etude');
  });
});

describe('Accès à une formation selon les inscriptions', () => {
  it('inscription validée : ouvert ; en attente, refusée, absente : fermé', async () => {
    base.user = eleve({ inscriptions: [{ formation: 'ia-essentiels', statut: 'VALIDEE' }, { formation: 'cs50x', statut: 'EN_ATTENTE' }] });
    expect(await accesFormation('u1', 'ia-essentiels')).toBe('ok');
    expect(await accesFormation('u1', 'cs50x')).toBe('attente');
    base.user = eleve({ inscriptions: [{ formation: 'cs50x', statut: 'REFUSEE' }] });
    expect(await accesFormation('u1', 'cs50x')).toBe('refuse');
    expect(await accesFormation('u1', 'ia-essentiels')).toBe('aucune');
  });

  it('une inscription à 50 USD n’ouvre plus CS50x', async () => {
    base.user = eleve({ inscriptions: [{ formation: 'ia-essentiels', statut: 'VALIDEE' }] });
    expect(await accesFormation('u1', 'cs50x')).toBe('aucune');
  });

  it('compte ancien sans inscription : CS50x seulement ; compte suspendu ou testeur expiré : fermé', async () => {
    base.user = eleve();
    expect(await accesFormation('u1', 'cs50x')).toBe('ok');
    expect(await accesFormation('u1', 'ia-essentiels')).toBe('aucune');
    base.user = eleve({ status: 'SUSPENDED', inscriptions: [{ formation: 'cs50x', statut: 'VALIDEE' }] });
    expect(await accesFormation('u1', 'cs50x')).toBe('refuse');
    base.user = eleve({ accessExpiresAt: new Date(Date.now() - 1000), inscriptions: [{ formation: 'cs50x', statut: 'VALIDEE' }] });
    expect(await accesFormation('u1', 'cs50x')).toBe('refuse');
  });

  it('personnel : toutes les formations ; formation inconnue ou pas connecté : fermé', async () => {
    base.user = eleve({ role: 'INSTRUCTOR' });
    expect(await accesFormation('u1', 'ia-essentiels')).toBe('ok');
    expect(await accesFormation('u1', 'aws')).toBe('aucune');
    expect(await accesFormation(undefined, 'cs50x')).toBe('aucune');
  });
});

describe('Formations d’un poste et d’un appareil', () => {
  it('le poste garde de 1 à 3 formations ouvertes, sans doublon', () => {
    expect(formationsDuPoste(['ia-essentiels', 'cs50x'])).toEqual(['cs50x', 'ia-essentiels']);
    for (const v of [[], ['aws'], ['cs50x', 'cs50x'], ['cs50x', 'x', 'y', 'z'], 'cs50x', null]) expect(formationsDuPoste(v)).toBeNull();
  });

  it('l’élève reçoit ses formations validées parmi celles du poste, 3 au plus', () => {
    const i = [{ formation: 'cs50x', statut: 'VALIDEE' }, { formation: 'ia-essentiels', statut: 'VALIDEE' }];
    expect(formationsAInstaller(i, ['cs50x'])).toEqual(['cs50x']);
    expect(formationsAInstaller(i)).toEqual(['cs50x', 'ia-essentiels']);
    expect(formationsAInstaller([{ formation: 'cs50x', statut: 'EN_ATTENTE' }], ['cs50x'])).toEqual([]);
    expect(formationsAInstaller([], ['cs50x', 'ia-essentiels'])).toEqual(['cs50x']);
    expect(formationsAInstaller([], ['ia-essentiels'])).toEqual([]);
  });

  it('une leçon enregistrée est rattachée à sa formation', () => {
    expect(formationDeLaLecon(3)).toBe('cs50x');
    expect(formationDeLaLecon(1002)).toBe('ia-essentiels');
    expect(formationDeLaLecon(3101)).toBe('cs50x');
  });
});
