export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { CS50_MODULES } from '@/config/course-modules';
import { prisma } from '@/lib/prisma';
import { readCourseSource } from '@/lib/content-generator';
import { IA_SLUG, IA_SYSTEM_PROMPT, iaWeekContext } from '@/lib/courses/ia-essentiels';

const SYSTEM_PROMPT = `Tu es Socrate, un tuteur socratique expert en informatique et programmation, spécialisé dans le cours CS50 de Harvard pour les étudiants francophones.
Ton rôle est de guider les étudiants vers la compréhension profonde par des questions socratiques stimulantes, sans donner directement les réponses toutes faites.

Règles :
- Réponds TOUJOURS en français
- Utilise la méthode socratique : pose des questions qui invitent au raisonnement logique et à l'expérimentation
- Encourage, sois bienveillant et empathique, ne décourage jamais
- Si l'étudiant pose une question d'intuition ("Pourquoi ce concept a-t-il été inventé ?"), donne d'abord une analogie concrète du monde réel puis pose-lui une question guidée
- Quand tu montres ou décris du code, explique l'intuition de chaque instruction
- Adapte ton niveau au contexte de la question et du module actuel`;

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new Response(JSON.stringify({ error: 'Non authentifié. Veuillez vous connecter.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const { messages, moduleId, course, week } = body ?? {};
    const isIa = course === IA_SLUG;

    const mod = CS50_MODULES?.find?.((m: any) => m?.id === moduleId);
    let moduleContext = mod
      ? `\nModule actuel : ${mod.title}\nSujets : ${mod.topics?.join?.(', ')}\nDescription : ${mod.description}`
      : '';

    if (isIa) moduleContext = `\n\n--- COURS DE LA SEMAINE ---\n${iaWeekContext(Number(week) || 1).slice(0, 12000)}`;

    // Intégration du matériel pédagogique du module
    try {
      if (!isIa && typeof moduleId === 'number' && !Number.isNaN(moduleId)) {
        const summary = await prisma.videoSummary.findUnique({ where: { lessonId: moduleId } });
        if (summary) {
          const concepts = Array.isArray(summary.keyConcepts) ? (summary.keyConcepts as any[]) : [];
          const conceptsText = concepts
            .map((c: any) => `- ${c?.term} : ${c?.definition}`)
            .join('\n');
          moduleContext += `\n\n--- MATÉRIEL PÉDAGOGIQUE DU MODULE (référence) ---\nRésumé : ${summary.overview}\n${conceptsText ? `Concepts clés :\n${conceptsText}\n` : ''}À retenir : ${summary.pedagogicalTakeaway}`;
        }
        const source = readCourseSource(moduleId);
        if (source) {
          moduleContext += `\n\n--- NOTES DE COURS SOURCE ---\n${source.slice(0, 6000)}`;
        }
        moduleContext += `\n\nAppuie tes relances socratiques sur ce matériel pédagogique.`;
      }
    } catch (e) {
      console.error('Tutor context enrichment error:', e);
    }

    const geminiKey = process.env.GEMINI_API_KEY || process.env.EMINI_API_KEY;
    const abacusKey = process.env.ABACUSAI_API_KEY;

    // 1. PRIORITÉ : GOOGLE GEMINI (avec clé API active)
    if (geminiKey) {
      const rawContents: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];
      const inputList = Array.isArray(messages) ? messages : [];

      for (const m of inputList) {
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

      const geminiPayload = {
        systemInstruction: {
          parts: [{ text: (isIa ? IA_SYSTEM_PROMPT : SYSTEM_PROMPT) + moduleContext }],
        },
        contents: rawContents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
          // Réflexion courte : Socrate commence à répondre beaucoup plus vite.
          thinkingConfig: { thinkingLevel: 'low' },
        } as Record<string, unknown>,
      };

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:streamGenerateContent?alt=sse&key=${geminiKey}`;

      const geminiRes = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiPayload),
      });

      if (!geminiRes.ok) {
        const errText = await geminiRes.text();
        console.error('Gemini streaming error:', geminiRes.status, errText);

        // Fallback non-streaming avec generateContent (sans réglage de réflexion, au cas où il serait refusé)
        delete (geminiPayload.generationConfig as Record<string, unknown>).thinkingConfig;
        const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${geminiKey}`;
        const fallbackRes = await fetch(fallbackUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(geminiPayload),
        });

        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          const answerText = fallbackData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          const stream = new ReadableStream({
            start(controller) {
              const encoder = new TextEncoder();
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ choices: [{ delta: { content: answerText } }] })}\n\n`
                )
              );
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              controller.close();
            },
          });
          return new Response(stream, {
            headers: {
              'Content-Type': 'text/plain; charset=utf-8',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive',
            },
          });
        }
        throw new Error(`Erreur du service Gemini (${geminiRes.status})`);
      }

      // Proxy du flux SSE Gemini vers le client au format universel attendu
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
                if (line.startsWith('data: ')) {
                  const jsonStr = line.slice(6).trim();
                  if (!jsonStr) continue;
                  try {
                    const parsed = JSON.parse(jsonStr);
                    const delta = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (delta) {
                      controller.enqueue(
                        encoder.encode(
                          `data: ${JSON.stringify({ choices: [{ delta: { content: delta } }] })}\n\n`
                        )
                      );
                    }
                  } catch {}
                }
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

      return new Response(clientStream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // 2. ALTERNATIVE : ABACUS.AI (si configuré)
    if (abacusKey && !abacusKey.startsWith('AQ.')) {
      const apiMessages = [
        { role: 'system', content: (isIa ? IA_SYSTEM_PROMPT : SYSTEM_PROMPT) + moduleContext },
        ...((messages ?? [])?.map?.((m: any) => ({ role: m?.role ?? 'user', content: m?.content ?? '' })) ?? []),
      ];

      const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${abacusKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-5.4-mini',
          messages: apiMessages,
          stream: true,
          max_tokens: 2000,
          temperature: 0.7,
        }),
      });

      if (!response?.ok) {
        const errText = await response?.text?.();
        console.error('LLM API error:', errText);
        return new Response(JSON.stringify({ error: 'Erreur API LLM' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const stream = new ReadableStream({
        async start(controller) {
          const reader = response?.body?.getReader?.();
          const decoder = new TextDecoder();
          const encoder = new TextEncoder();
          try {
            while (reader) {
              const { done, value } = await reader.read();
              if (done) break;
              const chunk = decoder.decode(value);
              controller.enqueue(encoder.encode(chunk));
            }
          } catch (error: any) {
            console.error('Stream error:', error);
            controller.error(error);
          } finally {
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    return new Response(
      JSON.stringify({ error: 'Aucune clé API IA valide configurée (GEMINI_API_KEY requise).' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Tutor route error:', error);
    return new Response(
      JSON.stringify({ error: 'Erreur interne de connexion au tuteur Socrate.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
