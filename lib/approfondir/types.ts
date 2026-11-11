// « Approfondir le sujet » : format des cours préparés (content/approfondir/semaine-N.json)
// et des documents analysés à la volée (PDF ou notes de l'élève).
// Le même format sert en ligne et hors ligne : rien n'est écrit en dur dans les composants.

export type DocumentSource = {
  id: string;
  titre: string;
  url: string;
  auteur: string;
  /** Ex. « CC BY-SA 4.0 », « CC BY 4.0 », « Domaine public ». */
  licence: string;
  licenceUrl?: string;
};

export type Etape = { titre: string; texte: string };

export type Schema = {
  /** cycle : étapes qui reviennent au début ; etapes : suite ordonnée ; comparaison : colonnes ; relations : liens entre idées. */
  type: 'cycle' | 'etapes' | 'comparaison' | 'relations';
  etapes?: Etape[];
  colonnes?: { titre: string; points: string[] }[];
  liens?: { de: string; vers: string; label?: string }[];
};

export type Differences = {
  titres: [string, string];
  lignes: { critere: string; a: string; b: string }[];
};

export type Passage = { texte: string; documentId: string; page: string };

export type Infographie = { titre: string; points: { icone: string; texte: string }[] };

export type Notion = {
  id: string;
  titre: string;
  /** Une seule phrase. */
  resume: string;
  /** Page (PDF) ou section (page web) d'origine. */
  page: string;
  documentId: string;
  schema: Schema;
  differences?: Differences;
  passages?: Passage[];
  infographie?: Infographie;
};

export type ContenuApprofondir = {
  /** Numéro de leçon (adresse /courses/cs50x/lessons/<id>). Absent pour un document de l'élève. */
  semaine?: number;
  sujet: string;
  resume: string;
  documents: DocumentSource[];
  notions: Notion[];
};

// ---------- Vérification (fichiers préparés et réponses du modèle) ----------

const txt = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const liste = <T>(v: unknown, max: number, f: (x: any) => T | null): T[] =>
  (Array.isArray(v) ? v : []).slice(0, max).map(f).filter((x): x is T => x !== null);
const TYPES = ['cycle', 'etapes', 'comparaison', 'relations'] as const;

function schemaValide(s: any): Schema {
  const type = TYPES.includes(s?.type) ? s.type : 'etapes';
  return {
    type,
    etapes: liste(s?.etapes, 8, (e) => (txt(e?.titre, 80) ? { titre: txt(e.titre, 80), texte: txt(e?.texte, 300) } : null)),
    colonnes: liste(s?.colonnes, 3, (c) => (txt(c?.titre, 60)
      ? { titre: txt(c.titre, 60), points: liste(c?.points, 6, (p) => txt(p, 200) || null) } : null)),
    liens: liste(s?.liens, 10, (l) => (txt(l?.de, 60) && txt(l?.vers, 60)
      ? { de: txt(l.de, 60), vers: txt(l.vers, 60), label: txt(l?.label, 60) || undefined } : null)),
  };
}

/** Nettoie un contenu (fichier préparé ou réponse de Gemini). Renvoie null s'il est inutilisable. */
export function validerContenu(brut: any): ContenuApprofondir | null {
  const documents = liste(brut?.documents, 10, (d): DocumentSource | null => {
    const url = txt(d?.url, 500);
    if (!txt(d?.id, 40) || !txt(d?.titre, 200)) return null;
    // Seuls les liens http(s) sont gardés (jamais « javascript: »).
    const sur = /^https?:\/\//i.test(url) ? url : '';
    return {
      id: txt(d.id, 40), titre: txt(d.titre, 200), url: sur, auteur: txt(d?.auteur, 200),
      licence: txt(d?.licence, 60), licenceUrl: /^https?:\/\//i.test(txt(d?.licenceUrl, 300)) ? txt(d.licenceUrl, 300) : undefined,
    };
  });
  const notions = liste(brut?.notions, 20, (n): Notion | null => {
    if (!txt(n?.titre, 120)) return null;
    const diff = n?.differences;
    const differences: Differences | undefined = Array.isArray(diff?.titres) && diff.titres.length === 2 && Array.isArray(diff?.lignes)
      ? {
          titres: [txt(diff.titres[0], 60), txt(diff.titres[1], 60)],
          lignes: liste(diff.lignes, 8, (l) => (txt(l?.critere, 80) ? { critere: txt(l.critere, 80), a: txt(l?.a, 200), b: txt(l?.b, 200) } : null)),
        }
      : undefined;
    const info = n?.infographie;
    return {
      id: txt(n?.id, 40) || txt(n.titre, 40).toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      titre: txt(n.titre, 120),
      resume: txt(n?.resume, 400),
      page: txt(n?.page, 60),
      documentId: txt(n?.documentId, 40),
      schema: schemaValide(n?.schema),
      differences: differences?.lignes.length ? differences : undefined,
      passages: liste(n?.passages, 6, (p) => (txt(p?.texte, 1200)
        ? { texte: txt(p.texte, 1200), documentId: txt(p?.documentId, 40), page: txt(p?.page, 60) } : null)),
      infographie: txt(info?.titre, 120)
        ? { titre: txt(info.titre, 120), points: liste(info?.points, 6, (p) => (txt(p?.texte, 160) ? { icone: txt(p?.icone, 4) || '•', texte: txt(p.texte, 160) } : null)) }
        : undefined,
    };
  });
  if (!notions.length) return null;
  return {
    semaine: Number.isInteger(brut?.semaine) ? brut.semaine : undefined,
    sujet: txt(brut?.sujet, 160) || notions[0].titre,
    resume: txt(brut?.resume, 1200),
    documents,
    notions,
  };
}

/** Ce que le tuteur reçoit : seulement le résumé du document et la notion affichée (jamais tout le document). */
export function contexteTuteur(c: Pick<ContenuApprofondir, 'sujet' | 'resume'>, n: Notion | undefined): string {
  const lignes = [`Sujet : ${c.sujet}`, `Résumé du document : ${c.resume}`];
  if (n) {
    lignes.push(`Notion affichée : ${n.titre} (${n.page || 'page inconnue'})`, `En une phrase : ${n.resume}`);
    for (const e of n.schema.etapes ?? []) lignes.push(`- ${e.titre} : ${e.texte}`);
    for (const p of n.passages ?? []) lignes.push(`Extrait (${p.page}) : ${p.texte}`);
  }
  return lignes.join('\n').slice(0, 6000);
}
