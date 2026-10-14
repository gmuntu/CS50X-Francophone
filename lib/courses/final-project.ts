import { IA_SLUG, IA_TITLE } from '@/lib/courses/ia-essentiels';

export const CS50_SLUG = 'cs50x';

/** Semaine où se trouve le projet final, par formation. */
export const FINAL_WEEK: Record<string, number> = { [IA_SLUG]: 5, [CS50_SLUG]: 10 };
export const COURSE_TITLE: Record<string, string> = { [IA_SLUG]: IA_TITLE, [CS50_SLUG]: 'CS50x Francophone' };

export type ProjectFields = { prompt: string; aiResponse: string; verification: string; finalVersion: string };
type Part = { key: keyof ProjectFields; label: string; hint: string };

/** Les 4 parties du projet, adaptées à chaque formation (mêmes colonnes en base). */
export const PROJECT_PARTS: Record<string, Part[]> = {
  [IA_SLUG]: [
    { key: 'prompt', label: '1. Votre prompt', hint: 'La demande écrite à l’IA, avec la méthode en 5 étapes (tâche, contexte, exemple, format, contrainte).' },
    { key: 'aiResponse', label: '2. La réponse de l’IA', hint: 'Collez la réponse obtenue, telle quelle.' },
    { key: 'verification', label: '3. Ce que vous avez vérifié', hint: 'Faits, chiffres, dates, ton, données sensibles… et comment vous avez vérifié.' },
    { key: 'finalVersion', label: '4. Votre version finale améliorée', hint: 'Votre texte final, et ce que vous avez changé par rapport à la réponse de l’IA.' },
  ],
  [CS50_SLUG]: [
    { key: 'prompt', label: '1. Votre projet', hint: 'Titre, à quoi sert le programme, pour qui, et quels langages ou outils vous avez utilisés (C, Python, SQL, Flask, JavaScript…).' },
    { key: 'aiResponse', label: '2. Votre code', hint: 'Lien vers votre dépôt (GitHub ou CS50) ET collez les parties les plus importantes de votre code.' },
    { key: 'verification', label: '3. Comment il fonctionne et vos tests', hint: 'Expliquez les fichiers et fonctions principales, vos choix (structures de données, algorithmes), les bogues rencontrés et comment vous avez testé.' },
    { key: 'finalVersion', label: '4. Démonstration et bilan', hint: 'Lien de votre vidéo de démonstration (2-3 min), puis ce que vous avez appris et ce que vous amélioreriez.' },
  ],
};

export const projectText = (p: ProjectFields, course: string = IA_SLUG) =>
  (PROJECT_PARTS[course] ?? PROJECT_PARTS[IA_SLUG]).map((part) => `${part.label.toUpperCase()} :\n${p[part.key]}`).join('\n\n');

const QUESTIONS: Record<string, string> = {
  [IA_SLUG]: "pourquoi tel choix dans son prompt, ce qu'il a vérifié et comment, ce qu'il a changé dans la version finale et pourquoi, ce qu'il ferait différemment, une limite ou un risque de l'IA dans son cas",
  [CS50_SLUG]: "ce que fait précisément une fonction ou un fichier de son code, pourquoi il a choisi telle structure de données ou tel algorithme, un bogue qu'il a rencontré et comment il l'a corrigé, ce qui se passerait dans un cas limite (entrée vide, très grande, invalide), ce qu'il améliorerait. Demande-lui d'expliquer avec ses propres mots une ligne ou un passage précis de son code",
};

/** Consignes de Socrate pour la défense orale (Gemini Live). */
export function defensePrompt(course: string, p: ProjectFields) {
  const title = COURSE_TITLE[course] ?? '';
  return `Tu es Socrate, examinateur bienveillant mais exigeant de la formation « ${title} » (SavoirIA). Tu parles français, phrases courtes.
C'est la DÉFENSE ORALE du projet final de l'élève. Ton but : vérifier que l'élève a réellement fait ce projet lui-même et le comprend.
Déroulé :
1. Salue l'élève, demande-lui de présenter son projet en une minute (ce qu'il fait et pourquoi).
2. Pose ensuite EXACTEMENT 5 questions, UNE à la fois, précises et propres à SON projet ci-dessous : ${QUESTIONS[course] ?? QUESTIONS[IA_SLUG]}.
3. Écoute la réponse ; si elle est vague, demande UNE précision, puis passe à la question suivante.
4. Après la 5e question, remercie l'élève et dis : « La défense est terminée, vous pouvez cliquer sur Terminer ». Ne donne PAS de note.
Ne donne jamais les réponses, ne lis pas le projet à voix haute.

--- PROJET DE L'ÉLÈVE ---
${projectText(p, course)}`;
}
