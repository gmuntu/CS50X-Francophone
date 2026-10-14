import { IA_SLUG, IA_TITLE } from '@/lib/courses/ia-essentiels';

export const FINAL_WEEK: Record<string, number> = { [IA_SLUG]: 5 };
export const COURSE_TITLE: Record<string, string> = { [IA_SLUG]: IA_TITLE };

export type ProjectFields = { prompt: string; aiResponse: string; verification: string; finalVersion: string };

export const projectText = (p: ProjectFields) =>
  `PROMPT DE L'ÉLÈVE :\n${p.prompt}\n\nRÉPONSE DE L'IA :\n${p.aiResponse}\n\nCE QUE L'ÉLÈVE A VÉRIFIÉ :\n${p.verification}\n\nVERSION FINALE AMÉLIORÉE :\n${p.finalVersion}`;

/** Consignes de Socrate pour la défense orale (Gemini Live). */
export function defensePrompt(courseTitle: string, p: ProjectFields) {
  return `Tu es Socrate, examinateur bienveillant mais exigeant de la formation « ${courseTitle} » (SavoirIA). Tu parles français, phrases courtes.
C'est la DÉFENSE ORALE du projet final de l'élève. Ton but : vérifier que l'élève a réellement fait ce projet et le comprend.
Déroulé :
1. Salue l'élève, demande-lui de présenter son projet en une minute (la tâche choisie et pourquoi).
2. Pose ensuite EXACTEMENT 5 questions, UNE à la fois, précises et propres à SON projet ci-dessous : pourquoi tel choix dans son prompt, ce qu'il a vérifié et comment, ce qu'il a changé dans la version finale et pourquoi, ce qu'il ferait différemment, une limite ou un risque de l'IA dans son cas.
3. Écoute la réponse ; si elle est vague, demande UNE précision, puis passe à la question suivante.
4. Après la 5e question, remercie l'élève et dis : « La défense est terminée, vous pouvez cliquer sur Terminer ». Ne donne PAS de note.
Ne donne jamais les réponses, ne lis pas le projet à voix haute.

--- PROJET DE L'ÉLÈVE ---
${projectText(p)}`;
}
