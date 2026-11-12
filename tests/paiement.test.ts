import { describe, it, expect } from 'vitest';
import { moyenPaiementFr, resumePaiement, statutPaiementFr } from '@/lib/paiement';

describe('paiement affiché dans l’admin', () => {
  it('traduit tous les statuts en français', () => {
    expect(statutPaiementFr('PAID')).toBe('Payé');
    expect(statutPaiementFr('PENDING')).toBe('En attente');
    expect(statutPaiementFr('EXEMPTED')).toBe('Exempté');
    expect(statutPaiementFr('FAILED')).toBe('Échoué');
    expect(statutPaiementFr(null)).toBe('Non renseigné');
    expect(statutPaiementFr('TRUC')).toBe('Non renseigné');
  });

  it('traduit les moyens de paiement', () => {
    expect(moyenPaiementFr('A_CONVENIR')).toBe('À convenir');
    expect(moyenPaiementFr('PERSONNEL')).toBe('Personnel');
    expect(moyenPaiementFr(null)).toBe('Non renseigné');
  });

  it('ne montre jamais de mot anglais ni « 500 USD » pour un élève exempté', () => {
    const r = resumePaiement({ role: 'STUDENT', studentType: 'LIBRE', paymentStatus: 'EXEMPTED', paymentAmount: 500 });
    expect(r.texte).toBe('Exempté');
  });

  it('résume chaque situation', () => {
    expect(resumePaiement({ studentType: 'LIBRE', paymentStatus: 'PENDING', paymentAmount: 500 }).texte).toBe('En attente (500 USD)');
    expect(resumePaiement({ studentType: 'LIBRE', paymentStatus: 'PAID', paymentAmount: 300 }).texte).toBe('Payé (300 USD)');
    expect(resumePaiement({ studentType: 'LIBRE', paymentStatus: 'FAILED' }).texte).toBe('Échoué (500 USD)');
    expect(resumePaiement({ studentType: 'UNIVERSITAIRE', paymentStatus: 'EXEMPTED' }).texte).toBe('Exempté (0 USD, convention)');
    expect(resumePaiement({ role: 'ADMIN', paymentStatus: 'PENDING' }).texte).toBe('Personnel (0 USD)');
    expect(resumePaiement({ studentType: 'LIBRE', paymentStatus: 'TRUC' }).texte).toBe('Non renseigné');
  });
});
