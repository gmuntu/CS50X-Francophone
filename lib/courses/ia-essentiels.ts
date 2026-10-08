// Formation « L'essentiel de l'IA » — contenu original SavoirIA, en français.
// Prépare aux thèmes du certificat Google AI Essentials (SavoirIA n'est pas affilié à Google).

export const IA_SLUG = 'ia-essentiels';
export const IA_TITLE = "L'essentiel de l'IA";
export const IA_PASS_SCORE = 0.7; // 70 % de bonnes réponses pour ouvrir la semaine suivante

export interface IaQuestion { q: string; options: string[]; answer: number; explain: string }
export interface IaLine { speaker: 'Socrate' | 'Étudiant'; text: string }
export interface IaWeek {
  n: number;
  title: string;
  intro: string;
  tags: string[];
  ready: boolean; // false = contenu en préparation
  summary?: string; // markdown simple (## titres, - listes, **gras**)
  keyPoints?: string[];
  podcast?: IaLine[];
  quiz?: IaQuestion[];
  oral?: { title: string; instructions: string; prompt: string };
}

export const IA_WEEKS: IaWeek[] = [
  {
    n: 1,
    title: "Découvrir l'IA",
    intro: "Qu'est-ce que l'IA, l'IA générative, ce qu'elle sait faire (et ne sait pas faire).",
    tags: ['IA et apprentissage automatique', 'IA générative', 'Limites et erreurs (« hallucinations »)'],
    ready: true,
    summary: `## 1. L'IA, c'est quoi ?
L'**intelligence artificielle (IA)** désigne des programmes informatiques capables de faire des tâches qui demandent habituellement de l'intelligence humaine : comprendre une phrase, reconnaître une image, traduire, résumer, proposer une idée.

Une IA ne « pense » pas comme une personne. Elle repère des **régularités** (des motifs) dans une très grande quantité d'exemples, puis s'en sert pour produire une réponse probable.

## 2. Apprendre à partir d'exemples
La plupart des IA actuelles utilisent l'**apprentissage automatique** (en anglais *machine learning*). Au lieu d'écrire toutes les règles à la main, on montre à la machine des milliers d'exemples.

- Exemple : pour reconnaître une mangue mûre, on lui montre beaucoup de photos de mangues mûres et pas mûres.
- Peu à peu, le programme ajuste ses réglages pour se tromper de moins en moins.
- Plus les exemples sont nombreux et variés, meilleur est le résultat.

## 3. L'IA générative
L'**IA générative** est une IA qui *crée* du contenu nouveau : du texte, des images, du son, du code. Les assistants comme Gemini, ChatGPT ou Claude en font partie.

Ils fonctionnent avec un **grand modèle de langage** : un programme entraîné sur d'énormes quantités de textes, qui prédit, mot après mot, la suite la plus probable d'une phrase.

## 4. Ce que l'IA fait bien
- Rédiger un premier brouillon (courriel, lettre, affiche).
- Résumer un long texte ou un compte rendu de réunion.
- Expliquer une notion avec des mots simples.
- Traduire et reformuler.
- Proposer des idées (noms de produit, plan d'exposé).

## 5. Ses limites
- **Les hallucinations** : l'IA peut inventer une information fausse avec beaucoup d'assurance (un chiffre, une date, une source qui n'existe pas).
- **Les biais** : si les exemples d'entraînement sont déséquilibrés, l'IA peut reproduire des préjugés, par exemple sur l'Afrique ou les femmes.
- **Les connaissances datées** : un modèle ne connaît pas toujours les événements récents.
- **Le contexte local** : elle connaît souvent moins bien les réalités africaines, les langues locales ou les prix du marché.

## 6. La règle d'or
L'IA est un **assistant**, pas un patron. C'est **vous** qui vérifiez, corrigez et décidez. On parle d'« humain dans la boucle ».`,
    keyPoints: [
      "L'IA repère des régularités dans beaucoup d'exemples ; elle ne pense pas comme un humain.",
      "L'apprentissage automatique apprend à partir d'exemples au lieu de règles écrites à la main.",
      "L'IA générative crée du contenu nouveau (texte, image, son, code).",
      "Une hallucination est une information inventée présentée comme vraie.",
      "Toujours vérifier : l'humain reste responsable du résultat.",
    ],
    podcast: [
      { speaker: 'Étudiant', text: "Socrate, tout le monde parle de l'intelligence artificielle au bureau. Mais honnêtement, je ne sais pas vraiment ce que c'est." },
      { speaker: 'Socrate', text: "Alors partons de ce que tu connais. Quand ta grand-mère choisit une mangue au marché, comment sait-elle qu'elle est mûre ?" },
      { speaker: 'Étudiant', text: "Elle la touche, elle la sent. Elle en a choisi des milliers dans sa vie, alors elle sait." },
      { speaker: 'Socrate', text: "Exactement. Elle a appris par l'expérience, à force d'exemples. L'apprentissage automatique, c'est la même idée : on montre à un programme des milliers d'exemples, et il apprend à reconnaître les régularités." },
      { speaker: 'Étudiant', text: "D'accord. Et l'IA générative, comme les assistants qui écrivent des textes ?" },
      { speaker: 'Socrate', text: "Ceux-là ont lu une quantité énorme de textes. Quand tu leur poses une question, ils prédisent, mot après mot, la suite la plus probable. Ils créent donc un texte nouveau. Mais à ton avis, prédire le mot le plus probable, est-ce la même chose que dire la vérité ?" },
      { speaker: 'Étudiant', text: "Hmm… non. Le plus probable n'est pas forcément le plus juste." },
      { speaker: 'Socrate', text: "Tu viens de comprendre les hallucinations. L'IA peut inventer un chiffre ou une source avec un ton très sûr. Que devrais-tu faire avant d'envoyer un rapport écrit avec son aide ?" },
      { speaker: 'Étudiant', text: "Vérifier les chiffres et les sources moi-même." },
      { speaker: 'Socrate', text: "Voilà la règle d'or : l'IA est un assistant, pas un patron. Cette semaine, essaie de lui demander de résumer un texte que tu connais bien, puis compare. Tu verras ce qu'elle fait bien… et ce qu'elle rate." },
    ],
    quiz: [
      { q: "Comment la plupart des IA actuelles apprennent-elles ?", options: ["On leur écrit toutes les règles à la main", "Elles apprennent à partir de très nombreux exemples", "Elles copient le cerveau humain", "Elles cherchent toujours la réponse sur Internet"], answer: 1, explain: "C'est l'apprentissage automatique : la machine ajuste ses réglages à partir d'exemples." },
      { q: "Qu'est-ce que l'IA générative ?", options: ["Une IA qui crée du contenu nouveau (texte, image, son…)", "Une IA qui fabrique de l'électricité", "Un robot physique", "Un antivirus"], answer: 0, explain: "Générative = qui génère, qui crée du contenu nouveau." },
      { q: "Une « hallucination » de l'IA, c'est…", options: ["Une panne d'ordinateur", "Une image floue", "Une information inventée présentée comme vraie", "Une réponse trop longue"], answer: 2, explain: "L'IA peut inventer des faits avec assurance : il faut vérifier." },
      { q: "Pourquoi une IA peut-elle avoir des biais ?", options: ["Parce qu'elle est méchante", "Parce que ses exemples d'entraînement peuvent être déséquilibrés", "Parce qu'Internet est lent", "Elle n'a jamais de biais"], answer: 1, explain: "Elle reproduit les déséquilibres présents dans ses données d'entraînement." },
      { q: "Quelle est la bonne attitude avec un texte écrit par l'IA ?", options: ["L'envoyer tel quel, l'IA ne se trompe pas", "Ne jamais utiliser l'IA", "Le relire, vérifier les faits et l'adapter avant de l'utiliser", "Demander à une autre IA de décider"], answer: 2, explain: "L'humain reste dans la boucle et responsable du résultat." },
    ],
  },
  {
    n: 2,
    title: "Gagner du temps avec l'IA",
    intro: "Utiliser l'IA au travail : courriels, résumés, plans, tableaux.",
    tags: ["Outils d'IA du quotidien", 'Rédiger et résumer', 'Organiser son travail'],
    ready: false,
  },
  {
    n: 3,
    title: "L'art du prompt",
    intro: 'Bien demander pour bien obtenir : la méthode en 5 étapes.',
    tags: ['Tâche, contexte, exemples', 'Améliorer une réponse', 'Prompts en français et langues locales'],
    ready: false,
    oral: {
      title: "Exercice oral : l'art du prompt",
      instructions: "Dictez à Socrate un prompt pour une tâche réelle (ex. : une affiche pour votre boutique). Il vous aide à l'améliorer, étape par étape.",
      prompt: `EXERCICE ORAL « L'ART DU PROMPT ».
1. Demande d'abord à l'élève de dicter un prompt pour une tâche réelle de son quotidien.
2. Répète-le en une phrase, puis pose UNE seule question à la fois pour l'améliorer, dans cet ordre : la tâche est-elle claire ? le contexte (pour qui, pourquoi) ? un exemple ? le format attendu (longueur, ton, liste…) ? une contrainte (langue, budget, pays) ?
3. À la fin, fais-lui redire la version finale et félicite-le en nommant ce qui s'est amélioré.
Ne réécris jamais le prompt à sa place : guide-le pour qu'il le trouve lui-même.`,
    },
  },
  {
    n: 4,
    title: "Utiliser l'IA de façon responsable",
    intro: 'Biais, vie privée, sécurité des données, droits d\'auteur.',
    tags: ['Repérer les biais', 'Protéger ses données', 'Vérifier avant de partager'],
    ready: false,
  },
  {
    n: 5,
    title: 'Rester à jour',
    intro: "Suivre l'évolution de l'IA et préparer l'examen du certificat.",
    tags: ['Veille simple', 'Projet final', 'Préparation au certificat'],
    ready: false,
  },
];

export const getIaWeek = (n: number) => IA_WEEKS.find((w) => w.n === n);

/** Contexte donné à Socrate (écrit ou vocal) pour une semaine. */
export function iaWeekContext(n: number): string {
  const w = getIaWeek(n);
  if (!w) return '';
  return [
    `Formation : ${IA_TITLE} (SavoirIA). Semaine ${w.n} : ${w.title}.`,
    `Objectif : ${w.intro}`,
    w.keyPoints?.length ? `Points clés :\n- ${w.keyPoints.join('\n- ')}` : '',
    w.summary ? `Cours de la semaine :\n${w.summary}` : `Thèmes : ${w.tags.join(', ')}`,
  ].filter(Boolean).join('\n\n');
}

export const IA_SYSTEM_PROMPT = `Tu es Socrate, tuteur de la formation « L'essentiel de l'IA » de SavoirIA, pour des apprenants francophones (souvent en Afrique), débutants, sans connaissances techniques.
- Réponds TOUJOURS en français simple, avec des exemples de la vie quotidienne (marché, petite entreprise, école, administration).
- Méthode socratique : pose des questions qui font réfléchir plutôt que de donner directement la réponse.
- Encourage, sois bienveillant, phrases courtes.
- Rappelle quand c'est utile de vérifier les informations produites par une IA.
- Appuie-toi sur le cours de la semaine ci-dessous.`;
