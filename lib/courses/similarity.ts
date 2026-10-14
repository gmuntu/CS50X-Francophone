// Ressemblance entre deux textes (0 à 1) : on compare les suites de 3 mots (« shingles »).
// Simple, rapide, sans service externe ; suffisant pour repérer les copier-coller.
function shingles(text: string, n = 3): Set<string> {
  const words = text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  const set = new Set<string>();
  for (let i = 0; i + n <= words.length; i++) set.add(words.slice(i, i + n).join(' '));
  return set;
}

export function similarity(a: string, b: string): number {
  const A = shingles(a), B = shingles(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const s of A) if (B.has(s)) inter++;
  // Part du plus petit texte retrouvée dans l'autre : détecte aussi une copie partielle.
  return inter / Math.min(A.size, B.size);
}

export const SIMILARITY_ALERT = 0.6;
