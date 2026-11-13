import { describe, it, expect, vi, beforeEach } from 'vitest';

const { base, fausseBase } = vi.hoisted(() => {
  const base = { inscriptions: [] as any[], compte: null as any, erreur: null as any };
  const fausseBase = {
    inscriptionFormation: {
      findMany: vi.fn(async ({ where }: any) => base.inscriptions.filter((i) => i.userId === where.userId)),
      create: vi.fn(async ({ data }: any) => { if (base.erreur) throw base.erreur; base.inscriptions.push({ id: `i${base.inscriptions.length + 1}`, ...data }); }),
      update: vi.fn(async ({ where, data }: any) => { Object.assign(base.inscriptions.find((i) => i.id === where.id), data); }),
    },
    user: { findUnique: vi.fn(async () => (base.compte ? { ...base.compte, inscriptions: base.inscriptions.map((i) => ({ id: i.id, valideeLe: i.valideeLe ?? null })) } : null)) },
  };
  return { base, fausseBase };
});
vi.mock('@/lib/prisma', () => ({ prisma: fausseBase }));

import { conventionPossible, FORMATIONS_OUVERTES, formationOuverte, libellePrix, prixInscription, statutDepuisCompte, statutInscriptionFr, titreFormation } from '@/lib/formations';
import { ajouterFormation, DEMANDES_EN_ATTENTE_MAX, premiereInscription, refleterCompteSurInscription } from '@/lib/inscriptions';
import { compteDepuisDossier, type DossierInscription } from '@/lib/inscription-confirmation';

beforeEach(() => { base.inscriptions = []; base.compte = null; base.erreur = null; });

describe('Formations ouvertes et prix', () => {
  it('CS50x et L’essentiel de l’IA sont deux formations distinctes, chacune avec son prix', () => {
    expect(FORMATIONS_OUVERTES.map((f) => f.id)).toEqual(['cs50x', 'ia-essentiels']);
    expect(formationOuverte('cs50x')?.prixUsd).toBe(500);
    expect(formationOuverte('ia-essentiels')).toMatchObject({ titre: "L'essentiel de l'IA", certificat: 'Google AI Essentials', prixUsd: 50 });
    expect(titreFormation('ia-essentiels')).toBe("L'essentiel de l'IA");
  });

  it('une formation à venir, inconnue ou mal formée n’est pas ouverte aux inscriptions', () => {
    for (const v of ['google-it-support', 'aws', 'n-importe-quoi', '', null, undefined, 42, { id: 'cs50x' }]) expect(formationOuverte(v)).toBeNull();
  });

  it('le prix est celui de la formation ; 0 sous convention ; bourse activée par formation (CS50x seulement pour l’instant)', () => {
    const cs50x = formationOuverte('cs50x')!, ia = formationOuverte('ia-essentiels')!;
    expect(prixInscription(cs50x, 'LIBRE')).toBe(500);
    expect(prixInscription(ia, 'LIBRE')).toBe(50);
    expect(prixInscription(cs50x, 'UNIVERSITAIRE')).toBe(0);
    // Le réglage COURSE_PRICE_USD ne concerne que CS50x.
    expect(prixInscription(cs50x, 'LIBRE', '450')).toBe(450);
    expect(prixInscription(ia, 'LIBRE', '450')).toBe(50);
    expect(prixInscription(cs50x, 'LIBRE', 'abc')).toBe(500);
    expect(conventionPossible('cs50x')).toBe(true);
    expect(conventionPossible('ia-essentiels')).toBe(false);
    expect(conventionPossible('aws')).toBe(false);
    expect(FORMATIONS_OUVERTES.filter((f) => f.bourseUniversitaire).map((f) => f.id)).toEqual(['cs50x']);
    expect(libellePrix(50)).toBe('50 USD');
    expect(libellePrix(null)).toBe('Prix à convenir');
  });

  it('statuts en français', () => {
    expect(statutDepuisCompte('ACTIVE')).toBe('VALIDEE');
    expect(statutDepuisCompte('PENDING')).toBe('EN_ATTENTE');
    expect(statutDepuisCompte('SUSPENDED')).toBe('SUSPENDUE');
    expect(statutInscriptionFr('EN_ATTENTE')).toBe('En attente de validation');
    expect(statutInscriptionFr('TRUC')).toBe('Non renseigné');
  });
});

describe('Inscription à une formation', () => {
  const dossier = (plus: Partial<DossierInscription> = {}): DossierInscription => ({
    email: 'eleve@test.local', password: 'hache', name: 'Awa Test', firstName: 'Awa', lastName: 'Test',
    institutionId: null, courseSessionId: null, birthDate: '2000-01-01T00:00:00.000Z', countryCode: 'CD', dialCode: '+243',
    phone: '+243 812345678', dossierNumber: '243-26-10001', studentType: 'LIBRE', university: null,
    paymentStatus: 'PENDING', paymentMethod: 'A_CONVENIR', paymentAmount: 50, formation: 'ia-essentiels', ...plus,
  });

  it('le compte créé à la confirmation porte l’inscription à la formation choisie, en attente', () => {
    const compte = compteDepuisDossier(dossier());
    expect(compte.status).toBe('PENDING');
    expect(compte.inscriptions.create).toMatchObject({ formation: 'ia-essentiels', statut: 'EN_ATTENTE', studentType: 'LIBRE', paymentStatus: 'PENDING', paymentAmount: 50, valideeLe: null });
  });

  it('un dossier déposé avant les formations multiples (sans formation) est inscrit à CS50x', () => {
    const ancien = dossier({ paymentAmount: 500 }); delete ancien.formation;
    expect(compteDepuisDossier(ancien).inscriptions.create.formation).toBe('cs50x');
    expect(premiereInscription({ formation: 'inconnue', statutCompte: 'ACTIVE', studentType: 'LIBRE', paymentStatus: 'PAID' })).toMatchObject({ formation: 'cs50x', statut: 'VALIDEE' });
  });

  it('ajouter une formation : en attente, au prix fixé par le serveur', async () => {
    base.inscriptions = [{ id: 'i0', userId: 'u1', formation: 'cs50x', statut: 'VALIDEE' }];
    expect(await ajouterFormation('u1', 'ia-essentiels')).toBe('ok');
    expect(base.inscriptions[1]).toMatchObject({ userId: 'u1', formation: 'ia-essentiels', statut: 'EN_ATTENTE', studentType: 'LIBRE', paymentStatus: 'PENDING', paymentAmount: 50 });
  });

  it('ajouter une formation : refus si déjà inscrit, formation fermée, ou trop de demandes en attente', async () => {
    base.inscriptions = [{ id: 'i0', userId: 'u1', formation: 'cs50x', statut: 'VALIDEE' }];
    expect(await ajouterFormation('u1', 'cs50x')).toBe('deja');
    expect(await ajouterFormation('u1', 'aws')).toBe('inconnue');
    expect(await ajouterFormation('u1', undefined)).toBe('inconnue');
    base.inscriptions = Array.from({ length: DEMANDES_EN_ATTENTE_MAX }, (_, k) => ({ id: `a${k}`, userId: 'u1', formation: `autre-${k}`, statut: 'EN_ATTENTE' }));
    expect(await ajouterFormation('u1', 'ia-essentiels')).toBe('trop');
    // Deux demandes au même instant : la seconde est refusée proprement.
    base.inscriptions = []; base.erreur = { code: 'P2002' };
    expect(await ajouterFormation('u1', 'ia-essentiels')).toBe('deja');
    expect(base.inscriptions).toHaveLength(0);
  });

  it('transition : l’inscription unique suit le compte validé par l’admin ; avec deux inscriptions, rien ne bouge', async () => {
    base.compte = { role: 'STUDENT', status: 'ACTIVE', studentType: 'LIBRE', university: null, paymentStatus: 'PAID', paymentMethod: 'MPESA', paymentAmount: 50, courseSessionId: null };
    base.inscriptions = [{ id: 'i1', userId: 'u1', formation: 'ia-essentiels', statut: 'EN_ATTENTE', paymentStatus: 'PENDING' }];
    await refleterCompteSurInscription('u1');
    expect(base.inscriptions[0]).toMatchObject({ statut: 'VALIDEE', paymentStatus: 'PAID' });
    expect(base.inscriptions[0].valideeLe).toBeInstanceOf(Date);

    base.inscriptions = [
      { id: 'i1', userId: 'u1', formation: 'cs50x', statut: 'VALIDEE', paymentStatus: 'PAID' },
      { id: 'i2', userId: 'u1', formation: 'ia-essentiels', statut: 'EN_ATTENTE', paymentStatus: 'PENDING' },
    ];
    base.compte.status = 'SUSPENDED';
    await refleterCompteSurInscription('u1');
    expect(base.inscriptions.map((i) => i.statut)).toEqual(['VALIDEE', 'EN_ATTENTE']);
  });
});
