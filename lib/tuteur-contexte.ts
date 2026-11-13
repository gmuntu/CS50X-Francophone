// Consigne et contexte du tuteur (Socrate), partagés par la route /api/tutor et par la lecture
// du contexte à l'avance sur un ordinateur d'école (/api/tutor/prechauffer) : le texte doit être
// identique, sinon Gemma ne reconnaît pas ce qu'il a déjà lu.
import { CS50_MODULES } from '@/config/course-modules';
import { prisma } from '@/lib/prisma';
import { readCourseSource } from '@/lib/content-generator';
import { IA_SLUG, IA_SYSTEM_PROMPT, iaWeekContext } from '@/lib/courses/ia-essentiels';
import { leconVocale, systemeSocrateVocalLocal } from '@/lib/socrate-vocal';

const LOCAL = process.env.SAVOIRIA_LOCAL === '1';
// Sur un ordinateur d'école, Gemma lit le texte envoyé à environ 60 jetons par seconde :
// des notes plus courtes divisent l'attente avant la réponse. Le Tuteur vocal (2 à 4 phrases)
// n'a besoin que du résumé de la semaine.
const NOTES_MAX = LOCAL ? 1500 : 6000;
const IA_MAX = LOCAL ? 3000 : 12000;
const IA_MAX_VOIX = 1200;

const SYSTEM_PROMPT = `Tu es Socrate, un tuteur socratique expert en informatique et programmation, spécialisé dans le cours CS50 de Harvard pour les étudiants francophones.
Ton rôle est de guider les étudiants vers la compréhension profonde par des questions socratiques stimulantes, sans donner directement les réponses toutes faites.

Règles :
- Réponds TOUJOURS en français
- Utilise la méthode socratique : pose des questions qui invitent au raisonnement logique et à l'expérimentation
- Encourage, sois bienveillant et empathique, ne décourage jamais
- Si l'étudiant pose une question d'intuition ("Pourquoi ce concept a-t-il été inventé ?"), donne d'abord une analogie concrète du monde réel puis pose-lui une question guidée
- Quand tu montres ou décris du code, explique l'intuition de chaque instruction
- Adapte ton niveau au contexte de la question et du module actuel`;

/** Consigne complète du tuteur pour une leçon (CS50x) ou une semaine de « L'essentiel de l'IA ». */
export async function systemeTuteur({ moduleId, course, week, voix, bureau }: {
  moduleId?: unknown; course?: unknown; week?: unknown; voix?: boolean;
  /** Vrai pour « Demande au prof » (/agora) : même Socrate qu'en ligne. */
  bureau?: boolean;
}): Promise<string> {
  const isIa = course === IA_SLUG;
  // Contexte court pour la voix, seulement sur un ordinateur d'école (en ligne, rien ne change).
  const court = LOCAL && voix === true;
  const mod = CS50_MODULES?.find?.((m: any) => m?.id === moduleId);

  // « Demande au prof » sur un ordinateur SavoirIA : même Socrate qu'en ligne sur /agora
  // (même consigne, même contenu de leçon : titre, aperçu, chronologie de la vidéo).
  if (court && bureau === true && !isIa && mod) {
    let lecon = '';
    try {
      lecon = leconVocale(await prisma.videoSummary.findUnique({ where: { lessonId: mod.id } }));
    } catch (e) {
      console.error('Tutor context enrichment error:', e);
    }
    return systemeSocrateVocalLocal(lecon || `Titre : ${mod.title}\nSujets : ${mod.topics?.join?.(', ')}\nDescription : ${mod.description}`);
  }
  let moduleContext = mod
    ? `\nModule actuel : ${mod.title}\nSujets : ${mod.topics?.join?.(', ')}\nDescription : ${mod.description}`
    : '';

  if (isIa) moduleContext = `\n\n--- COURS DE LA SEMAINE ---\n${iaWeekContext(Number(week) || 1).slice(0, court ? IA_MAX_VOIX : IA_MAX)}`;

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
      if (source && !court) {
        moduleContext += `\n\n--- NOTES DE COURS SOURCE ---\n${source.slice(0, NOTES_MAX)}`;
      }
      moduleContext += `\n\nAppuie tes relances socratiques sur ce matériel pédagogique.`;
    }
  } catch (e) {
    console.error('Tutor context enrichment error:', e);
  }
  return (isIa ? IA_SYSTEM_PROMPT : SYSTEM_PROMPT) + moduleContext;
}
