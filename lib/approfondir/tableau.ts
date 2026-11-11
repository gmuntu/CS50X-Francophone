// Ce que le tableau dessine pour une notion : bulles numérotées, flèches et étiquettes, ou colonnes côte à côte.
import type { Notion } from './types';

export type TypeTableau = 'cycle' | 'etapes' | 'comparaison' | 'relations';
export type EtapeTableau = { label: string; detail: string; valeurs?: string[]; lien?: string };
export type VueTableau = { type: TypeTableau; etapes: EtapeTableau[]; centre?: string; colonnes?: string[] };

export const LIBELLE_TYPE: Record<TypeTableau, string> = { cycle: 'Cycle', etapes: 'Étapes', comparaison: 'Comparaison', relations: 'Relations' };

export function vueTableau(n: Notion): VueTableau {
  const s = n.schema;
  if (s.type === 'comparaison') {
    const cols = (s.colonnes ?? []).filter((c) => c.points.length);
    if (cols.length >= 2) {
      const lignes = Math.max(...cols.map((c) => c.points.length));
      return {
        type: 'comparaison',
        colonnes: cols.map((c) => c.titre),
        etapes: Array.from({ length: lignes }, (_, i) => ({
          label: '',
          valeurs: cols.map((c) => c.points[i] ?? ''),
          detail: cols.map((c) => `${c.titre} : ${c.points[i] ?? '—'}`).join(' · '),
        })),
      };
    }
    if (n.differences) {
      return {
        type: 'comparaison',
        colonnes: [...n.differences.titres],
        etapes: n.differences.lignes.map((l) => ({
          label: l.critere, valeurs: [l.a, l.b], detail: `${n.differences!.titres[0]} : ${l.a} · ${n.differences!.titres[1]} : ${l.b}`,
        })),
      };
    }
  }
  if (s.type === 'relations' && s.liens?.length) {
    const memeDepart = s.liens.every((l) => l.de === s.liens![0].de);
    // Toutes les flèches partent de la même idée : elle va au centre, les flèches portent leur étiquette.
    if (memeDepart) {
      return {
        type: 'relations', centre: s.liens[0].de,
        etapes: s.liens.map((l) => ({ label: l.vers, lien: l.label, detail: `${l.de} ${l.label ?? '→'} ${l.vers}` })),
      };
    }
    // Sinon : la notion au centre, chaque idée autour, le lien expliqué dans le résumé de l'étape.
    return {
      type: 'relations', centre: n.titre,
      etapes: s.liens.map((l) => ({ label: l.de, detail: `${l.de} ${l.label ? `(${l.label}) ` : ''}→ ${l.vers}` })),
    };
  }
  return {
    type: s.type === 'cycle' ? 'cycle' : 'etapes',
    etapes: (s.etapes ?? []).map((e) => ({ label: e.titre, detail: e.texte })),
  };
}

/** Texte de la notion affichée, envoyé au tuteur vocal quand on change de notion. */
export function texteNotion(n: Notion): string {
  const v = vueTableau(n);
  return [
    `Notion : ${n.titre} (${n.page || 'page inconnue'})`,
    `Résumé : ${n.resume}`,
    `Schéma au tableau (${LIBELLE_TYPE[v.type]}) :`,
    ...v.etapes.map((e, i) => `${i + 1}. ${e.label ? `${e.label} : ` : ''}${e.detail}`),
  ].join('\n').slice(0, 3000);
}
