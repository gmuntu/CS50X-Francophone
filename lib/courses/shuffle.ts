// Mélange déterministe : le même élève revoit le même ordre pour une semaine donnée,
// mais deux élèves n'ont pas le même ordre (questions et réponses).
function seedFrom(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function rng(seed: number) {
  return () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export function shuffled<T>(items: T[], key: string): T[] {
  const r = rng(seedFrom(key)); const a = [...items];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

export type ShuffledQuestion = { qi: number; q: string; options: { oi: number; text: string }[] };

/** Questions mélangées pour un élève ; si la banque contient plus de `count` questions, on en tire `count`. */
export function quizFor<Q extends { q: string; options: string[] }>(bank: Q[], key: string, count = 5): ShuffledQuestion[] {
  return shuffled(bank.map((q, qi) => ({ q, qi })), `${key}:q`).slice(0, count).map(({ q, qi }) => ({
    qi,
    q: q.q,
    options: shuffled(q.options.map((text, oi) => ({ oi, text })), `${key}:o${qi}`),
  }));
}
