import { CS50_MODULES } from '@/config/course-modules';
import { prisma } from '@/lib/prisma';

// Le tuteur Socrate, version message (SMS / WhatsApp).
const BASE = `Tu es Socrate, tuteur socratique bienveillant du cours CS50x (Harvard) pour des étudiants francophones (Afrique, Haïti, etc.).
- Réponds TOUJOURS en français correct, avec les accents.
- Ne donne jamais la solution complète d'un exercice noté.
- Termine TOUJOURS par une phrase complète, jamais au milieu d'une idée.`;

const SYSTEM = (channel: 'sms' | 'whatsapp', maxChars: number) =>
  channel === 'sms'
    ? `${BASE}
L'étudiant t'écrit par SMS, souvent sans Internet : chaque caractère coûte.
- Réponse courte : ${maxChars} caractères MAXIMUM, sans mise en forme, sans emoji.
- Une explication simple ou une analogie du quotidien, puis UNE question pour le faire réfléchir.`
    : `${BASE}
L'étudiant t'écrit par WhatsApp, souvent avec peu de données.
- Donne une vraie explication pédagogique, complète et structurée, entre 600 et ${maxChars} caractères.
- Structure conseillée : 1) une définition claire ; 2) une analogie concrète du quotidien africain ou francophone ; 3) un exemple précis (2 à 5 lignes de code ou de pseudo-code si utile) ; 4) une question socratique pour le faire avancer.
- Paragraphes courts séparés par une ligne vide. Mise en forme WhatsApp autorisée : *gras* avec une seule étoile, listes avec « - ». Pas de tableau, pas de titre avec #.
- Si l'étudiant dit que ta réponse est vague, approfondis vraiment avec des exemples.`;

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

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${key}`;
  const call = (withThinking: boolean) =>
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM(opts.channel, opts.maxChars) + context }] },
        contents,
        // La « réflexion » du modèle consomme aussi des jetons : on la limite et on laisse
        // une marge large pour que la réponse ne soit jamais coupée en plein milieu.
        generationConfig: {
          temperature: 0.6,
          maxOutputTokens: 4096,
          ...(withThinking ? { thinkingConfig: { thinkingLevel: 'low' } } : {}),
        },
      }),
      signal: AbortSignal.timeout(13_000), // Twilio coupe à 15 s
    });

  let res = await call(true);
  if (res.status === 400) res = await call(false); // réglage non reconnu par ce modèle : on réessaie sans
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  // On ignore les éventuelles « pensées » du modèle et on ne garde que la réponse.
  return String(parts.filter((p: any) => !p?.thought).map((p: any) => p?.text ?? '').join('')).trim();
}
