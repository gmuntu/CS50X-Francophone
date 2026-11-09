export const dynamic = 'force-dynamic';

import { auth } from '@/auth';
import { systemeTuteur } from '@/lib/tuteur-contexte';

/**
 * Ordinateur d'école seulement : dès qu'un élève ouvre une page de leçon (ou le Tuteur vocal),
 * Gemma lit le contexte du tuteur en arrière-plan. Il le garde en mémoire : la première question
 * démarre alors en 1 à 2 secondes au lieu d'environ 30.
 * En ligne, cette route ne fait rien (elle coûterait un appel Gemini à chaque page ouverte).
 */
export async function POST(request: Request) {
  if (process.env.SAVOIRIA_LOCAL !== '1') return new Response(null, { status: 204 });
  const session = await auth();
  if (!session?.user) return new Response(null, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const systeme = await systemeTuteur({
    moduleId: body?.moduleId, course: body?.course, week: body?.week, voix: body?.voix === true,
  });

  const G = globalThis as any;
  // Déjà lu, ou Gemma répond à quelqu'un : on ne le retarde pas.
  if (G.__savoiriaDernierPrechauffage === systeme || (G.__savoiriaGemmaActives ?? 0) > 0) {
    return new Response(null, { status: 204 });
  }
  G.__savoiriaDernierPrechauffage = systeme;

  // Détourné vers Gemma par lib/local-ai.ts (aucun appel à Google) ; réponse d'un mot, ignorée.
  fetch('https://generativelanguage.googleapis.com/v1beta/models/gemma:generateContent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prechauffage: true,
      systemInstruction: { parts: [{ text: systeme }] },
      contents: [{ role: 'user', parts: [{ text: 'Bonjour Socrate' }] }],
      generationConfig: { maxOutputTokens: 1 },
    }),
  }).catch(() => { G.__savoiriaDernierPrechauffage = undefined; });

  return new Response(null, { status: 202 });
}
