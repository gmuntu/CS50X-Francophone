import { CS50_MODULES } from '@/config/course-modules';
import { prisma } from '@/lib/prisma';

// Le tuteur Socrate, version message court (SMS / WhatsApp).
const SYSTEM = (channel: 'sms' | 'whatsapp', maxChars: number) => `Tu es Socrate, tuteur socratique bienveillant du cours CS50x pour des étudiants francophones (Afrique, Haïti, etc.), qui t'écrivent par ${channel === 'sms' ? 'SMS, souvent sans Internet' : 'WhatsApp, souvent avec très peu de données'}.
Règles strictes :
- Réponds TOUJOURS en français simple.
- Réponse TRÈS courte : ${maxChars} caractères MAXIMUM, sans Markdown, sans emoji, sans tableau.
- Méthode socratique : une explication brève ou une analogie concrète du quotidien, puis UNE seule question pour faire réfléchir.
- Pour du code, au plus 2 ou 3 lignes très courtes.
- Ne donne jamais la solution complète d'un exercice noté.`;

export interface HistoryMsg { role: 'user' | 'assistant'; content: string; at: string; channel?: string }

export async function tutorReply(opts: {
  question: string;
  week: number | null;
  history: HistoryMsg[];
  channel: 'sms' | 'whatsapp';
  maxChars: number;
}): Promise<string> {
  const key = process.env.GEMINI_API_KEY || process.env.EMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY manquante');

  let context = '';
  const mod = opts.week !== null ? CS50_MODULES.find((m: any) => m?.id === opts.week) : null;
  if (mod) {
    context = `\nSemaine ${mod.id} : ${mod.title}. Sujets : ${mod.topics?.join(', ')}.`;
    try {
      const s = await prisma.videoSummary.findUnique({ where: { lessonId: mod.id } });
      if (s) context += `\nRésumé du cours (référence) : ${String(s.overview).slice(0, 1500)}`;
    } catch {}
  }

  const contents: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];
  for (const m of [...opts.history.slice(-6), { role: 'user', content: opts.question } as HistoryMsg]) {
    const role = m.role === 'assistant' ? 'model' : 'user';
    const last = contents[contents.length - 1];
    if (last && last.role === role) last.parts[0].text += `\n${m.content}`;
    else contents.push({ role, parts: [{ text: m.content }] });
  }
  if (contents[0]?.role !== 'user') contents.unshift({ role: 'user', parts: [{ text: 'Bonjour' }] });

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM(opts.channel, opts.maxChars) + context }] },
        contents,
        generationConfig: { temperature: 0.6, maxOutputTokens: 400 },
      }),
      signal: AbortSignal.timeout(12_000), // Twilio coupe à 15 s
    }
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const data = await res.json();
  return String(data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text ?? '').join('') ?? '').trim();
}
