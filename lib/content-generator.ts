import fs from 'fs';
import path from 'path';
import { CS50_MODULES } from '@/config/course-modules';

export interface KeyConcept {
  term: string;
  definition: string;
  importance: string;
}

export interface TimelineItem {
  timestamp: string;
  title: string;
  description: string;
  keyPoints: string[];
}

export interface CodeExample {
  language: string;
  title: string;
  code: string;
  explanation: string;
}

export interface GeneratedVideoSummary {
  title: string;
  overview: string;
  keyConcepts: KeyConcept[];
  timelineBreakdown: TimelineItem[];
  codeExamples: CodeExample[];
  pedagogicalTakeaway: string;
  fullMarkdown: string;
}

/**
 * Lit le matériel pédagogique source (texte du cours) pour un module donné.
 * Le contenu n'existe que pour certaines semaines (0, 1, 6, 7).
 */
export function readCourseSource(moduleId: number): string | null {
  try {
    const filePath = path.join(process.cwd(), 'content', 'course-sources', `semaine${moduleId}.txt`);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8')?.trim?.();
      if (content && content.length > 20) return content;
    }
  } catch (e) {
    console.error('readCourseSource error:', e);
  }
  return null;
}

/**
 * Génère le contenu pédagogique structuré d'un module via l'API LLM d'Abacus.AI.
 * Utilise le matériel source du cours quand il est disponible.
 */
export async function generateModuleContent(moduleId: number): Promise<GeneratedVideoSummary> {
  const mod = CS50_MODULES?.find?.((m) => m?.id === moduleId);
  if (!mod) throw new Error('Module introuvable');

  const source = readCourseSource(moduleId);
  const sourceBlock = source
    ? `\n\nVoici le matériel pédagogique de référence à utiliser en priorité pour ce module :\n"""\n${source.slice(0, 9000)}\n"""`
    : '';

  const prompt = `Tu es un concepteur pédagogique expert du cours CS50 de Harvard, écrivant en français pour des étudiants francophones.
Génère un contenu pédagogique structuré et rigoureux pour le module suivant :

Titre : ${mod.title}
Sujets : ${mod.topics?.join?.(', ')}
Description : ${mod.description}${sourceBlock}

Réponds UNIQUEMENT avec un objet JSON valide (sans texte autour, sans balises markdown) respectant EXACTEMENT ce schéma :
{
  "title": "titre du module",
  "overview": "résumé synthétique de 3 à 5 phrases",
  "keyConcepts": [ { "term": "nom du concept", "definition": "définition claire", "importance": "pourquoi c'est capital" } ],
  "timelineBreakdown": [ { "timestamp": "00:00", "title": "titre de la section", "description": "description", "keyPoints": ["point 1", "point 2"] } ],
  "codeExamples": [ { "language": "c", "title": "titre", "code": "code source complet", "explanation": "explication ligne par ligne" } ],
  "pedagogicalTakeaway": "le point pédagogique essentiel à retenir",
  "fullMarkdown": "un résumé magistral complet et détaillé au format markdown (titres, listes, blocs de code) couvrant l'ensemble du module"
}

Contraintes :
- Rédige TOUT en français.
- Fournis entre 4 et 7 concepts clés.
- Fournis entre 4 et 6 sections de découpage vidéo avec des timestamps plausibles.
- Fournis entre 1 et 4 extraits de code pertinents (utilise le langage du module ; pour la Semaine 0 utilise du pseudo-code ou Scratch).
- Le champ fullMarkdown doit être riche et pédagogique (au moins 400 mots).`;

  const geminiKey = process.env.GEMINI_API_KEY || process.env.EMINI_API_KEY;
  let raw = '';

  if (geminiKey) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${geminiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.6,
          maxOutputTokens: 4000,
        },
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error('Gemini generateModuleContent error:', errText);
      throw new Error('Erreur lors de la génération du contenu');
    }
    const data = await res.json();
    raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  } else if (process.env.ABACUSAI_API_KEY && !process.env.ABACUSAI_API_KEY.startsWith('AQ.')) {
    const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.ABACUSAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-5.4-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        max_tokens: 4000,
        temperature: 0.6,
      }),
    });
    if (!response?.ok) {
      const errText = await response?.text?.();
      console.error('LLM generate error:', errText);
      throw new Error('Erreur lors de la génération du contenu');
    }
    const data = await response.json();
    raw = data?.choices?.[0]?.message?.content ?? '';
  } else {
    throw new Error('Aucune clé API IA valide (GEMINI_API_KEY requise)');
  }
  let parsed: any;
  try {
    const cleaned = String(raw)
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();
    parsed = JSON.parse(cleaned);
  } catch (e) {
    console.error('JSON parse error, raw:', raw?.slice?.(0, 500));
    throw new Error('Réponse IA invalide (JSON)');
  }

  return {
    title: parsed?.title || mod.title,
    overview: parsed?.overview || '',
    keyConcepts: Array.isArray(parsed?.keyConcepts) ? parsed.keyConcepts : [],
    timelineBreakdown: Array.isArray(parsed?.timelineBreakdown) ? parsed.timelineBreakdown : [],
    codeExamples: Array.isArray(parsed?.codeExamples) ? parsed.codeExamples : [],
    pedagogicalTakeaway: parsed?.pedagogicalTakeaway || '',
    fullMarkdown: parsed?.fullMarkdown || parsed?.overview || '',
  };
}

/* ------------------------------------------------------------------ */
/*  AUDIOS SOCRATIQUES (3x / semaine : Lundi, Mercredi, Vendredi)      */
/* ------------------------------------------------------------------ */

export type DayOfWeekType = 'MONDAY' | 'WEDNESDAY' | 'FRIDAY';

export interface DialogueLine {
  speaker: 'Socrate' | 'Étudiant';
  text: string;
}

export interface GeneratedAudioScript {
  dayOfWeek: DayOfWeekType;
  title: string;
  pedagogicalObjective: string;
  targetDurationMinutes: number;
  dialogue: DialogueLine[];
  cleanTtsText: string;
}

const DAY_TITLES: Record<DayOfWeekType, string> = {
  MONDAY: "Lundi : L'Éveil & L'Intuition Socratique",
  WEDNESDAY: "Mercredi : L'Atelier de Code & La Mécanique Profonde",
  FRIDAY: "Vendredi : L'Œil de l'Ingénieur & Le Défi Pratique",
};

const DAY_FOCUS: Record<DayOfWeekType, string> = {
  MONDAY:
    "Éveiller la curiosité et bâtir une intuition solide AVANT toute syntaxe. Utilise des analogies concrètes du quotidien, pose une grande question socratique centrale, et déconstruis les idées reçues.",
  WEDNESDAY:
    "Entrer dans l'atelier de programmation : que se passe-t-il réellement dans le processeur et la mémoire ? Décortique la mécanique interne, autopsie les pièges classiques et erreurs de débutant.",
  FRIDAY:
    "Prendre de la hauteur avec le regard de l'ingénieur : complexité, optimisation, compromis de performance (temps vs espace), pièges d'architecture, et lancer un défi réflexif de fin de semaine.",
};

/** Nettoie une chaîne de tout artefact Markdown pour une synthèse vocale limpide. */
export function sanitizeForTts(text: string): string {
  return String(text ?? '')
    .replace(/```[\s\S]*?```/g, ' (extrait de code) ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/#+\s*/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/>\s*/g, '')
    .replace(/^[-*•]\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Génère le script audio socratique d'un jour donné via l'API LLM d'Abacus.AI. */
export async function generateAudioScript(
  moduleId: number,
  dayOfWeek: DayOfWeekType,
): Promise<GeneratedAudioScript> {
  const mod = CS50_MODULES?.find?.((m) => m?.id === moduleId);
  if (!mod) throw new Error('Module introuvable');

  const source = readCourseSource(moduleId);
  const sourceBlock = source
    ? `\n\nDONNÉES DE RÉFÉRENCE DU COURS (à utiliser en priorité) :\n"""\n${source.slice(0, 8000)}\n"""`
    : '';

  const systemPrompt = `Tu es "Socrate", le tuteur vocal de référence de CS50x Francophone (Savoir IA).
Tu rédiges des scripts audio d'apprentissage profond, immersifs et interactifs, en FRANÇAIS.
STYLE SOCRATIQUE : tu ne donnes jamais une réponse toute faite, tu questionnes, tu suscites l'étonnement, tu guides vers l'eurêka avec des métaphores concrètes. Ton chaleureux, bienveillant et exigeant.
FORMAT TTS-READY : le champ "cleanTtsText" doit être prêt pour un moteur de synthèse vocale : AUCUN markdown (pas de **, #, backticks, tirets de liste), ponctuation orale riche (virgules, points d'interrogation, points de suspension pour les pauses). Oralise les termes techniques (printf -> "print-eff", malloc -> "mal-loc", SQL -> "S-Q-L", O(n) -> "grand O de n").`;

  const prompt = `Rédige le script audio Socratique complet pour :
Module : ${mod.title}
Sujets : ${mod.topics?.join?.(', ')}
Jour : ${dayOfWeek} (${DAY_TITLES[dayOfWeek]})
Objectif du jour : ${DAY_FOCUS[dayOfWeek]}${sourceBlock}

Réponds UNIQUEMENT avec un objet JSON valide (sans texte autour, sans balises markdown) respectant EXACTEMENT ce schéma :
{
  "dayOfWeek": "${dayOfWeek}",
  "title": "titre de la session",
  "pedagogicalObjective": "objectif pédagogique opérationnel en une phrase claire",
  "targetDurationMinutes": 5,
  "dialogue": [ { "speaker": "Socrate", "text": "..." }, { "speaker": "Étudiant", "text": "..." } ],
  "cleanTtsText": "texte oralisé continu et immersif (~5 minutes de lecture), combinant la voix de Socrate et ses relances, SANS aucun markdown, avec une ponctuation soignée pour les pauses."
}

Contraintes : rédige TOUT en français ; le dialogue doit comporter entre 8 et 14 répliques alternées Socrate/Étudiant ; le cleanTtsText doit faire au moins 500 mots et rester fidèle au matériel de référence.`;

  const geminiKey = process.env.GEMINI_API_KEY || process.env.EMINI_API_KEY;
  let raw = '';

  if (geminiKey) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${geminiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.4,
          maxOutputTokens: 4000,
        },
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error('Gemini generateWeeklyAudioScripts error:', errText);
      throw new Error('Erreur lors de la génération du script audio');
    }
    const data = await res.json();
    raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  } else if (process.env.ABACUSAI_API_KEY && !process.env.ABACUSAI_API_KEY.startsWith('AQ.')) {
    const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.ABACUSAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-5.4-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 4000,
        temperature: 0.4,
      }),
    });
    if (!response?.ok) {
      const errText = await response?.text?.();
      console.error('LLM audio-script error:', errText);
      throw new Error('Erreur lors de la génération du script audio');
    }
    const data = await response.json();
    raw = data?.choices?.[0]?.message?.content ?? '';
  } else {
    throw new Error('Aucune clé API IA valide (GEMINI_API_KEY requise)');
  }
  let parsed: any;
  try {
    const cleaned = String(raw)
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();
    parsed = JSON.parse(cleaned);
  } catch (e) {
    console.error('Audio JSON parse error, raw:', raw?.slice?.(0, 500));
    throw new Error('Réponse IA invalide (JSON audio)');
  }

  const dialogue: DialogueLine[] = Array.isArray(parsed?.dialogue)
    ? parsed.dialogue
        .filter((d: any) => d && d.text)
        .map((d: any) => ({
          speaker: d?.speaker === 'Socrate' ? 'Socrate' : 'Étudiant',
          text: String(d.text),
        }))
    : [];

  let cleanTtsText: string = sanitizeForTts(parsed?.cleanTtsText || '');
  if (!cleanTtsText && dialogue.length > 0) {
    cleanTtsText = sanitizeForTts(dialogue.map((d) => d.text).join(' '));
  }

  return {
    dayOfWeek,
    title: parsed?.title || `${DAY_TITLES[dayOfWeek]} — ${mod.title}`,
    pedagogicalObjective:
      parsed?.pedagogicalObjective ||
      'Développer une compréhension profonde par le questionnement socratique.',
    targetDurationMinutes: Number(parsed?.targetDurationMinutes) || 5,
    dialogue,
    cleanTtsText,
  };
}

/** Génère les 3 scripts audios de la semaine (Lundi, Mercredi, Vendredi) en parallèle. */
export async function generateWeeklyAudioScripts(moduleId: number): Promise<GeneratedAudioScript[]> {
  const days: DayOfWeekType[] = ['MONDAY', 'WEDNESDAY', 'FRIDAY'];
  const results = await Promise.all(days.map((d) => generateAudioScript(moduleId, d)));
  return results;
}
