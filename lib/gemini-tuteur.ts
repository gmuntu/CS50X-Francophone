// Appel de Gemini pour Socrate (réponse en flux), partagé par /api/tutor et par /api/poste/tuteur
// (ordinateur d'école relayé par le site en ligne). Sur un ordinateur d'école (SAVOIRIA_LOCAL=1),
// lib/local-ai.ts détourne ces mêmes appels vers Gemma : le code ne change pas.

/** Moteurs que l'élève (ou l'admin) peut choisir. */
export const MOTEURS = ['auto', 'gemini', 'gemma'] as const;
export type Moteur = (typeof MOTEURS)[number];
export const moteurValide = (m: unknown): m is Moteur => typeof m === 'string' && (MOTEURS as readonly string[]).includes(m);

/** En-tête de réponse qui dit au navigateur quel moteur a vraiment répondu ('gemini', 'gemma4:e2b'…). */
export const ENTETE_MOTEUR = 'X-Savoiria-Moteur';

/** Modèle Gemma chargé sur l'ordinateur d'école (un seul à la fois ; par défaut e2b). */
export const modeleGemma = () => process.env.MODELE || 'gemma4:e2b';

/** Réponse vocale sur Gemma : 2 à 3 phrases, donc peu de jetons (lecture plus rapide sur un petit ordinateur). */
export const JETONS_VOIX_GEMMA = 160;

export const ENTETES_FLUX = {
  'Content-Type': 'text/plain; charset=utf-8',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
} as const;

export type MessageTuteur = { role?: string; content?: unknown };

/** Messages de la conversation au format Gemini (rôles alternés, commence par l'élève). */
function versContenus(messages: MessageTuteur[]) {
  const rawContents: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];
  for (const m of Array.isArray(messages) ? messages : []) {
    const text = String(m?.content ?? '').trim();
    if (!text) continue;
    const role: 'user' | 'model' = (m?.role === 'assistant' || m?.role === 'model') ? 'model' : 'user';
    if (rawContents.length > 0 && rawContents[rawContents.length - 1].role === role) {
      rawContents[rawContents.length - 1].parts[0].text += `\n${text}`;
    } else {
      rawContents.push({ role, parts: [{ text }] });
    }
  }
  if (rawContents.length === 0 || rawContents[0].role !== 'user') {
    rawContents.unshift({ role: 'user', parts: [{ text: 'Bonjour Socrate' }] });
  }
  return rawContents;
}

/**
 * Pose la question à Gemini (flux SSE) et renvoie au navigateur un flux au format OpenAI :
 * `data: {choices:[{delta:{content}}]}` puis `data: [DONE]`.
 * Si le flux est refusé, un second essai sans flux est fait ; si lui aussi échoue, une erreur est levée.
 */
export async function fluxGemini({ systeme, messages, modele, cle, maxTokens = 2048, entetes = {} }: {
  systeme: string; messages: MessageTuteur[]; modele: string; cle: string; maxTokens?: number; entetes?: Record<string, string>;
}): Promise<Response> {
  const geminiPayload = {
    systemInstruction: { parts: [{ text: systeme }] },
    contents: versContenus(messages),
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: maxTokens,
      // Réflexion courte : Socrate commence à répondre beaucoup plus vite.
      thinkingConfig: { thinkingLevel: 'low' },
    } as Record<string, unknown>,
  };
  const headers = { ...ENTETES_FLUX, ...entetes };

  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modele}:streamGenerateContent?alt=sse`;
  const geminiRes = await fetch(geminiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': cle },
    body: JSON.stringify(geminiPayload),
  });

  if (!geminiRes.ok) {
    const errText = await geminiRes.text();
    console.error('Gemini streaming error:', geminiRes.status, errText);

    // Repli sans flux avec generateContent (sans réglage de réflexion, au cas où il serait refusé)
    delete (geminiPayload.generationConfig as Record<string, unknown>).thinkingConfig;
    const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modele}:generateContent`;
    const fallbackRes = await fetch(fallbackUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': cle },
      body: JSON.stringify(geminiPayload),
    });

    if (fallbackRes.ok) {
      const fallbackData = await fallbackRes.json();
      const answerText = fallbackData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const stream = new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder();
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: answerText } }] })}\n\n`));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        },
      });
      return new Response(stream, { headers });
    }
    throw new Error(`Erreur du service Gemini (${geminiRes.status})`);
  }

  // Flux SSE Gemini -> format universel attendu par le navigateur
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const reader = geminiRes.body?.getReader();

  const clientStream = new ReadableStream({
    async start(controller) {
      if (!reader) {
        controller.close();
        return;
      }
      let buffer = '';
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const jsonStr = line.slice(6).trim();
            if (!jsonStr) continue;
            try {
              const parsed = JSON.parse(jsonStr);
              const delta = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
              if (delta) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: delta } }] })}\n\n`));
              }
            } catch {}
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      } catch (streamErr) {
        console.error('Error forwarding Gemini stream:', streamErr);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(clientStream, { headers });
}
