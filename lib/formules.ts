/**
 * Rend lisibles les petites formules écrites « à la LaTeX » dans les résumés de cours et les réponses du tuteur
 * ($O(n^2)$, $\log_2(n)$, $$\text{Entrée} \rightarrow \text{Sortie}$$…), sans bibliothèque mathématique :
 * le résultat est du texte ordinaire (O(n²), log₂(n), Entrée → Sortie), qui marche aussi hors ligne.
 * Les blocs et extraits de code ne sont jamais touchés.
 */
const SYMBOLES: Record<string, string> = {
  rightarrow: '→', to: '→', Rightarrow: '⇒', leftarrow: '←', leftrightarrow: '↔',
  times: '×', cdot: '·', div: '÷', pm: '±', leq: '≤', le: '≤', geq: '≥', ge: '≥', neq: '≠', ne: '≠', approx: '≈',
  infty: '∞', dots: '…', ldots: '…', cdots: '…',
  Theta: 'Θ', Omega: 'Ω', theta: 'θ', omega: 'ω', alpha: 'α', beta: 'β', pi: 'π', Sigma: 'Σ', sum: 'Σ',
  log: 'log', lg: 'lg', ln: 'ln', min: 'min', max: 'max',
};
const EXPOSANTS: Record<string, string> = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', n: 'ⁿ', k: 'ᵏ', i: 'ⁱ', '+': '⁺', '-': '⁻' };
const INDICES: Record<string, string> = { '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉', n: 'ₙ', k: 'ₖ', i: 'ᵢ' };

/** Remplace « ^2 », « ^{10} », « _2 »… par les petits caractères quand ils existent tous ; sinon garde l'écriture d'origine. */
function petitsCaracteres(texte: string, marque: '^' | '_', table: Record<string, string>): string {
  const motif = marque === '^' ? /\^(?:\{([^{}]+)\}|([A-Za-z0-9]))/g : /_(?:\{([^{}]+)\}|([A-Za-z0-9]))/g;
  return texte.replace(motif, (tout, groupe: string | undefined, seul: string | undefined) => {
    const contenu = groupe ?? seul ?? '';
    const lettres = [...contenu];
    if (lettres.every((c) => table[c])) return lettres.map((c) => table[c]).join('');
    return groupe !== undefined ? `${marque}(${contenu})` : tout;
  });
}

function formuleEnTexte(formule: string): string {
  let t = formule.trim();
  t = t.replace(/\\(?:text|mathrm|mathbf|textbf|mathit|operatorname)\{([^{}]*)\}/g, '$1');
  t = t.replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '$1/$2');
  t = t.replace(/\\sqrt\{([^{}]*)\}/g, '√($1)');
  t = t.replace(/\\([A-Za-z]+)/g, (tout, nom: string) => SYMBOLES[nom] ?? nom);
  t = t.replace(/\\([,;:! ])/g, ' ');
  t = petitsCaracteres(t, '^', EXPOSANTS);
  t = petitsCaracteres(t, '_', INDICES);
  return t.replace(/\s+/g, ' ').trim();
}

function horsCode(texte: string): string {
  // Formule isolée $$…$$ puis formule dans la phrase $…$ (sans espace collé aux dollars, pour ne pas toucher aux prix « 5 $ »).
  return texte
    .replace(/\$\$([^$]{1,400}?)\$\$/g, (_t, f: string) => formuleEnTexte(f))
    .replace(/\$(?!\s)([^$\n]{1,120}?)(?<!\s)\$(?!\d)/g, (_t, f: string) => formuleEnTexte(f));
}

export function formulesLisibles(markdown: string | null | undefined): string {
  if (!markdown) return '';
  if (!markdown.includes('$')) return markdown;
  // On découpe sur les blocs ``` … ``` et les extraits `…` : les morceaux de code (indices impairs) restent tels quels.
  return markdown
    .split(/(```[\s\S]*?```|`[^`\n]*`)/g)
    .map((morceau, i) => (i % 2 === 1 ? morceau : horsCode(morceau)))
    .join('');
}
