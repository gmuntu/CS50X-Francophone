import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({ prisma: {} }));

import { prenomPourCourriel, salutationCourriel } from '@/lib/controle-inscription';
import { courrielDeConfirmation } from '@/lib/inscription-confirmation';

describe('prénom repris dans les courriels', () => {
  it('accepte lettres, accents, espaces, traits d’union et apostrophes', () => {
    for (const p of ['Awa', 'Jean-Pierre', 'Marie Claire', "N'Golo", 'Éloïse', 'Aïcha', 'Björn', '  Awa  ']) {
      expect(prenomPourCourriel(p)).toBe(p.trim());
    }
  });

  it('refuse chiffres, liens, symboles, balises, retours à la ligne et prénoms trop longs', () => {
    const refuses = ['', '   ', 'Awa2', 'evil.com', 'http://evil.com', 'Awa <b>', '<script>', 'Awa\nCliquez', 'a@b', 'Awa!', 'Awa,', '-Awa', "'Awa", 'A'.repeat(41), 42, null, undefined];
    for (const p of refuses) expect(prenomPourCourriel(p)).toBeNull();
    expect(prenomPourCourriel('A'.repeat(40))).not.toBeNull();
  });

  it('écrit « Bonjour Prénom, » ou garde « Bonjour, »', () => {
    expect(salutationCourriel('Awa')).toEqual({ texte: 'Bonjour Awa,', html: 'Bonjour Awa,' });
    expect(salutationCourriel("N'Golo")).toEqual({ texte: "Bonjour N'Golo,", html: 'Bonjour N&#39;Golo,' });
    expect(salutationCourriel('http://evil.com')).toEqual({ texte: 'Bonjour,', html: 'Bonjour,' });
  });

  it('le courriel de confirmation reprend le prénom valide et ignore le reste', () => {
    const bon = courrielDeConfirmation('jeton', 'Awa');
    expect(bon.text.startsWith('Bonjour Awa,\n')).toBe(true);
    expect(bon.html.startsWith('<p>Bonjour Awa,</p>')).toBe(true);
    const mauvais = courrielDeConfirmation('jeton', '<a href="http://evil.com">ici</a>');
    expect(mauvais.text.startsWith('Bonjour,\n')).toBe(true);
    expect(mauvais.html.startsWith('<p>Bonjour,</p>')).toBe(true);
    expect(mauvais.html).not.toContain('evil');
    expect(courrielDeConfirmation('jeton').text.startsWith('Bonjour,\n')).toBe(true);
  });
});
