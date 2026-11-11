// Texte d'un document Word (.docx), PowerPoint (.pptx) ou texte (.txt, .md), sans bibliothèque :
// un .docx / .pptx est un fichier ZIP de fichiers XML. On lit seulement les parties utiles,
// avec une taille décompressée plafonnée (protection contre les « bombes ZIP »).
import { inflateRawSync } from 'node:zlib';

const XML_MAX = 8 * 1024 * 1024; // par fichier XML décompressé
const TOTAL_MAX = 20 * 1024 * 1024; // pour tout le document (contre les « bombes ZIP »)
const TEXTE_MAX = 60_000;

type EntreeZip = { nom: string; methode: number; taille: number; decalage: number };

/** Liste des fichiers d'un ZIP (répertoire central). null si ce n'est pas un ZIP lisible. */
function entreesZip(z: Buffer): EntreeZip[] | null {
  // Fin du répertoire central : signature 0x06054b50, cherchée dans les 64 derniers Ko.
  let fin = -1;
  for (let i = z.length - 22; i >= Math.max(0, z.length - 65_557); i--) {
    if (z.readUInt32LE(i) === 0x06054b50) { fin = i; break; }
  }
  if (fin < 0) return null;
  const nombre = z.readUInt16LE(fin + 10);
  let p = z.readUInt32LE(fin + 16);
  const entrees: EntreeZip[] = [];
  for (let k = 0; k < nombre && k < 5000; k++) {
    if (p + 46 > z.length || z.readUInt32LE(p) !== 0x02014b50) return null;
    const methode = z.readUInt16LE(p + 10);
    const taille = z.readUInt32LE(p + 20);
    const lgNom = z.readUInt16LE(p + 28);
    const lgExtra = z.readUInt16LE(p + 30);
    const lgCom = z.readUInt16LE(p + 32);
    const decalage = z.readUInt32LE(p + 42);
    entrees.push({ nom: z.subarray(p + 46, p + 46 + lgNom).toString('utf8'), methode, taille, decalage });
    p += 46 + lgNom + lgExtra + lgCom;
  }
  return entrees;
}

function lireEntree(z: Buffer, e: EntreeZip, budget: { reste: number; vus: Set<number> }): string | null {
  const p = e.decalage;
  // Deux entrées qui pointent vers les mêmes données : piège, on ne lit qu'une fois.
  if (budget.vus.has(p) || budget.reste <= 0) return null;
  budget.vus.add(p);
  if (p + 30 > z.length || z.readUInt32LE(p) !== 0x04034b50) return null;
  const debut = p + 30 + z.readUInt16LE(p + 26) + z.readUInt16LE(p + 28);
  const donnees = z.subarray(debut, debut + e.taille);
  try {
    const max = Math.min(XML_MAX, budget.reste);
    const brut = e.methode === 0 ? donnees.subarray(0, max) : e.methode === 8 ? inflateRawSync(donnees, { maxOutputLength: max }) : null;
    if (!brut) return null;
    budget.reste -= brut.length;
    return brut.toString('utf8');
  } catch {}
  return null;
}

const ENTITES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
function texteXml(xml: string, finParagraphe: RegExp): string {
  return xml
    .replace(finParagraphe, '\n')
    .replace(/<[^<>]*>/g, '')
    .replace(/[<>]/g, ' ')
    .replace(/&(amp|lt|gt|quot|apos);/g, (_, n) => ENTITES[n])
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Math.min(Number(n), 0x10ffff)))
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
}

/**
 * Texte d'un document. Renvoie null si le format n'est pas pris en charge ou illisible.
 * Les diapositives sont repérées « [DIAPO n] » pour que chaque notion garde sa page d'origine.
 */
export function texteDocument(nom: string, octets: Buffer): string | null {
  // Fichier abîmé ou piégé : jamais d'erreur qui ferait planter la route, simplement « non pris en charge ».
  try { return lireTexte(nom, octets); } catch { return null; }
}

function lireTexte(nom: string, octets: Buffer): string | null {
  const ext = nom.toLowerCase().split('.').pop() ?? '';
  if (ext === 'txt' || ext === 'md') return octets.toString('utf8').slice(0, TEXTE_MAX);
  if (ext !== 'docx' && ext !== 'pptx') return null;
  if (octets.length < 22 || octets.readUInt32LE(0) !== 0x04034b50) return null; // signature ZIP « PK »
  const entrees = entreesZip(octets);
  if (!entrees) return null;
  const budget = { reste: TOTAL_MAX, vus: new Set<number>() };

  if (ext === 'docx') {
    const e = entrees.find((x) => x.nom === 'word/document.xml');
    const xml = e && lireEntree(octets, e, budget);
    return xml ? texteXml(xml, /<\/w:p>/g).slice(0, TEXTE_MAX) : null;
  }
  const diapos = entrees
    .map((e) => ({ e, n: Number(e.nom.match(/^ppt\/slides\/slide(\d+)\.xml$/)?.[1]) }))
    .filter((x) => x.n > 0)
    .sort((a, b) => a.n - b.n)
    .slice(0, 200);
  let texte = '';
  for (const { e, n } of diapos) {
    if (budget.reste <= 0) break;
    const xml = lireEntree(octets, e, budget);
    if (xml) texte += `[DIAPO ${n}]\n${texteXml(xml, /<\/a:p>/g)}\n\n`;
    if (texte.length > TEXTE_MAX) break;
  }
  return texte.trim() ? texte.trim().slice(0, TEXTE_MAX) : null;
}
