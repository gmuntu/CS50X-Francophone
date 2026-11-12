import { describe, it, expect } from 'vitest';
import { formulesLisibles } from '@/lib/formules';
import { erreurDateNaissance, erreurTelephone, lireDateNaissance, telephonePropre } from '@/lib/controle-inscription';

describe('Formules lisibles dans les résumés', () => {
  it('formule isolée : flèches et \\text', () => {
    expect(formulesLisibles('$$\\text{Entrée (Input)} \\rightarrow \\text{Algorithme} \\rightarrow \\text{Sortie (Output)}$$'))
      .toBe('Entrée (Input) → Algorithme → Sortie (Output)');
  });
  it('puissances, indices et lettres grecques', () => {
    expect(formulesLisibles('En $O(n^2)$, $O(\\log n)$, $\\log_2(n)$, $2^8 = 256$, $\\Omega(n \\log n)$ et $\\pm 2$.'))
      .toBe('En O(n²), O(log n), log₂(n), 2⁸ = 256, Ω(n log n) et ± 2.');
  });
  it('tableau de calcul binaire', () => {
    expect(formulesLisibles('| 011 | $0+2+1$ | 3 |')).toBe('| 011 | 0+2+1 | 3 |');
  });
  it('le code n’est jamais modifié', () => {
    const md = 'Texte $n$ et `echo $HOME $PATH` puis\n```bash\necho $A $B\n```';
    expect(formulesLisibles(md)).toBe('Texte n et `echo $HOME $PATH` puis\n```bash\necho $A $B\n```');
  });
  it('les prix ne sont pas pris pour des formules', () => {
    expect(formulesLisibles('Le cours coûte 500 $ et le livre 20 $.')).toBe('Le cours coûte 500 $ et le livre 20 $.');
    expect(formulesLisibles('Entre $5 et $10 par mois.')).toBe('Entre $5 et $10 par mois.');
  });
  it('texte sans dollar ou vide : inchangé', () => {
    expect(formulesLisibles('Bonjour')).toBe('Bonjour');
    expect(formulesLisibles(null)).toBe('');
  });
});

describe('Contrôles de l’inscription', () => {
  const aujourdhui = new Date('2026-11-11T12:00:00Z');
  it('date de naissance : futur, trop jeune, trop ancienne, invalide', () => {
    expect(erreurDateNaissance('2031-01-01', aujourdhui)).toMatch(/futur/);
    expect(erreurDateNaissance('2020-01-01', aujourdhui)).toMatch(/au moins/);
    expect(erreurDateNaissance('1850-01-01', aujourdhui)).toMatch(/invalide/);
    expect(erreurDateNaissance('pas-une-date', aujourdhui)).toMatch(/invalide/);
  });
  it('date de naissance plausible : acceptée', () => {
    expect(erreurDateNaissance('2000-01-01', aujourdhui)).toBeNull();
    expect(erreurDateNaissance('2012-11-11', aujourdhui)).toBeNull();
  });
  it('âge minimum : 14 ans en ligne, 10 ans sur un poste d’école', () => {
    // 14 ans pile le jour même : accepté ; un jour de moins : refusé.
    expect(erreurDateNaissance('2012-11-11', aujourdhui)).toBeNull();
    expect(erreurDateNaissance('2012-11-12', aujourdhui)).toMatch(/au moins 14 ans.*école/);
    expect(erreurDateNaissance('2016-11-11', aujourdhui)).toMatch(/au moins 14 ans/);
    // Poste d'école hors ligne : 10 ans.
    expect(erreurDateNaissance('2016-11-11', aujourdhui, 10)).toBeNull();
    expect(erreurDateNaissance('2016-11-12', aujourdhui, 10)).toMatch(/au moins 10 ans/);
  });
  it('date de naissance : obligatoire, format strict, jour qui existe', () => {
    expect(erreurDateNaissance('', aujourdhui)).toMatch(/obligatoire/);
    expect(erreurDateNaissance(undefined, aujourdhui)).toMatch(/obligatoire/);
    expect(erreurDateNaissance(2015, aujourdhui)).toMatch(/invalide/);
    expect(erreurDateNaissance('12', aujourdhui)).toMatch(/invalide/);
    expect(erreurDateNaissance('2000-02-31', aujourdhui)).toMatch(/invalide/);
    expect(lireDateNaissance('2000-01-01')?.toISOString()).toBe('2000-01-01T00:00:00.000Z');
  });
  it('téléphone : lettres, trop court, trop long', () => {
    expect(erreurTelephone('abc')).toMatch(/chiffres/);
    expect(erreurTelephone('+243 abc')).toMatch(/chiffres/);
    expect(erreurTelephone('123')).toMatch(/court/);
    expect(erreurTelephone('+243 1234567890123456')).toMatch(/long/);
  });
  it('téléphone correct : accepté', () => {
    expect(erreurTelephone('812 345 678')).toBeNull();
    expect(erreurTelephone('+243 812-345-678')).toBeNull();
    expect(erreurTelephone('(514) 123.4567')).toBeNull();
    expect(erreurTelephone('0812/345 678')).toBeNull();
    expect(erreurTelephone('+243\u00a0812\u202f345\u00a0678')).toBeNull();
    expect(telephonePropre(' +243\u00a0812   345\u202f678 ')).toBe('+243 812 345 678');
  });
  it('téléphone : obligatoire, texte seulement, longueur totale limitée', () => {
    expect(erreurTelephone('')).toMatch(/obligatoire/);
    expect(erreurTelephone(undefined)).toMatch(/obligatoire/);
    expect(erreurTelephone(812345678)).toMatch(/invalide/);
    expect(erreurTelephone('8 1 2 3 4 5 6 7 8' + ' '.repeat(40) + '9')).toMatch(/long/);
  });
});
