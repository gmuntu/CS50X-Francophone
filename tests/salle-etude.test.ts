// Salle d'étude : chaque notion préparée se dessine au tableau ; lecture des fichiers Word, PowerPoint, texte.
import { describe, expect, it } from 'vitest';
import { deflateRawSync } from 'node:zlib';
import { CS50_MODULES } from '@/config/course-modules';
import { contenuSemaine } from '@/lib/approfondir/contenus';
import { vueTableau } from '@/lib/approfondir/tableau';
import { texteDocument } from '@/lib/approfondir/document';

/** Petit fichier ZIP (méthode « deflate ») pour simuler un .docx ou un .pptx. */
function zip(fichiers: Record<string, string>): Buffer {
  const locaux: Buffer[] = [];
  const central: Buffer[] = [];
  let decalage = 0;
  for (const [nom, texte] of Object.entries(fichiers)) {
    const donnees = deflateRawSync(Buffer.from(texte));
    const n = Buffer.from(nom);
    const l = Buffer.alloc(30); l.writeUInt32LE(0x04034b50, 0); l.writeUInt16LE(8, 8); l.writeUInt32LE(donnees.length, 18); l.writeUInt16LE(n.length, 26);
    const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(8, 10); c.writeUInt32LE(donnees.length, 20); c.writeUInt16LE(n.length, 28); c.writeUInt32LE(decalage, 42);
    locaux.push(l, n, donnees); central.push(c, n);
    decalage += 30 + n.length + donnees.length;
  }
  const cd = Buffer.concat(central);
  const fin = Buffer.alloc(22); fin.writeUInt32LE(0x06054b50, 0); fin.writeUInt16LE(Object.keys(fichiers).length, 10); fin.writeUInt32LE(cd.length, 12); fin.writeUInt32LE(decalage, 16);
  return Buffer.concat([...locaux, cd, fin]);
}

describe('Tableau de la Salle d’étude', () => {
  it('chaque notion préparée des 13 leçons se dessine (au moins une bulle ou une ligne)', () => {
    for (const m of CS50_MODULES) {
      const c = contenuSemaine(m.id);
      expect(c, `leçon ${m.id}`).not.toBeNull();
      for (const n of c!.notions) {
        const v = vueTableau(n);
        expect(v.etapes.length, `${m.id} : ${n.id}`).toBeGreaterThan(0);
        if (v.type === 'comparaison') expect(v.colonnes!.length).toBeGreaterThanOrEqual(2);
      }
    }
  });
});

describe('Envoyer un document : PDF, Word, PowerPoint ou texte', () => {
  it('texte (.txt)', () => {
    expect(texteDocument('cours.txt', Buffer.from('Le binaire, 0 et 1.'))).toBe('Le binaire, 0 et 1.');
  });
  it('Word (.docx) : le texte des paragraphes', () => {
    const docx = zip({ 'word/document.xml': '<w:document><w:body><w:p><w:r><w:t>Le bit vaut 0 ou 1</w:t></w:r></w:p><w:p><w:r><w:t>Un octet &amp; 8 bits</w:t></w:r></w:p></w:body></w:document>' });
    expect(texteDocument('cours.docx', docx)).toBe('Le bit vaut 0 ou 1\nUn octet & 8 bits');
  });
  it('PowerPoint (.pptx) : chaque diapositive repérée pour garder la page d’origine', () => {
    const pptx = zip({
      'ppt/slides/slide2.xml': '<p:sld><a:p><a:r><a:t>Deuxième</a:t></a:r></a:p></p:sld>',
      'ppt/slides/slide1.xml': '<p:sld><a:p><a:r><a:t>Première</a:t></a:r></a:p></p:sld>',
    });
    expect(texteDocument('cours.pptx', pptx)).toBe('[DIAPO 1]\nPremière\n\n[DIAPO 2]\nDeuxième');
  });
  it('ancien format ou faux fichier : refusé', () => {
    expect(texteDocument('cours.doc', Buffer.from('xxxx'))).toBeNull();
    expect(texteDocument('cours.docx', Buffer.from('pas un zip'))).toBeNull();
  });
});
