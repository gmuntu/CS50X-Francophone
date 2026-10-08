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
    ready: true,
    summary: `Cette semaine, nous suivons **Awa**, qui vend des pagnes au marché de Douala et sur WhatsApp. Elle n'a pas d'assistante… alors elle utilise l'IA comme une aide de bureau.

## 1. Les outils d'IA du quotidien
- **Les assistants conversationnels** : Gemini, ChatGPT, Claude, Copilot. On leur écrit (ou on leur parle) comme à une personne.
- **Gratuit ou payant** : les versions gratuites suffisent pour la plupart des tâches de cette formation.
- **Sur le téléphone** : une application ou le navigateur suffit. Les échanges en texte consomment peu de données ; évitez d'envoyer de grosses photos ou vidéos si votre forfait est limité.
- **Dans les outils que vous utilisez déjà** : messagerie, traitement de texte, tableur ont de plus en plus un bouton « IA ».

## 2. Rédiger plus vite
Le matin, Awa doit relancer un client et préparer une affiche. Elle demande :

> « Écris un message WhatsApp poli à un client qui me doit 45 000 FCFA depuis 3 semaines. Ton chaleureux mais ferme. 4 lignes maximum. »

L'IA propose un **premier brouillon** en quelques secondes. Awa le **relit**, change deux mots pour que cela ressemble à sa façon de parler, et l'envoie.

Bonnes idées de tâches : courriels, lettres administratives, messages aux clients, descriptions de produits, textes d'affiche.

## 3. Résumer
À midi, Awa reçoit le compte rendu de 6 pages de la réunion de sa coopérative. Elle colle le texte et demande :

> « Résume ce document en 5 points. Puis liste ce que je dois faire, avec les dates. »

Elle obtient l'essentiel en une minute. Mais elle **vérifie les dates et les montants** dans le document original : un résumé peut oublier ou déformer un détail.

## 4. Organiser son travail
Le soir, Awa demande :

> « Voici mes tâches de la semaine : … Organise-les en un plan du lundi au samedi, les plus urgentes d'abord. »

Elle peut aussi demander un **tableau simple** pour suivre ses ventes (date, client, produit, montant, payé ou non), à copier dans un tableur.

## 5. Garder le contrôle
- **Relire avant d'envoyer** : l'IA peut se tromper de chiffre, de nom ou de ton.
- **Garder sa voix** : adaptez le texte pour qu'il vous ressemble ; vos clients vous connaissent.
- **Pas de données sensibles** : ne collez pas de mots de passe, de numéros de carte, ni d'informations privées de vos clients.
- **Vous restez responsable** de ce que vous envoyez.

## Exercice pratique
Choisissez une vraie tâche de votre travail (un message, une lettre, un résumé). Demandez un brouillon à une IA, puis **améliorez-le vous-même**. Montrez les deux versions à Socrate ci-dessous : il vous aidera à voir ce que vous avez amélioré.`,
    keyPoints: [
      "L'IA fait un premier brouillon en quelques secondes ; vous le relisez et l'adaptez.",
      'Préciser le ton, la longueur et le destinataire donne de bien meilleurs résultats.',
      "Pour un résumé, vérifiez toujours les dates, chiffres et noms dans l'original.",
      "L'IA aide à organiser : plan de semaine, liste de tâches, tableau de suivi.",
      'Jamais de mots de passe ni de données privées de clients dans une IA.',
    ],
    podcast: [
      { speaker: 'Étudiant', text: "Socrate, j'ai un problème. Un client me doit de l'argent depuis un mois, et je n'ose pas lui écrire. J'ai peur d'être trop dure… ou trop gentille." },
      { speaker: 'Socrate', text: "C'est une situation délicate. Tu as entendu dire que l'IA peut aider à rédiger. Qu'est-ce que tu lui demanderais ?" },
      { speaker: 'Étudiant', text: "Je lui écrirais : « Écris un message à un client qui ne paie pas. »" },
      { speaker: 'Socrate', text: "Essayons de voir avec ses yeux. L'IA ne connaît ni ton client, ni le montant, ni votre relation. Que pourrait-elle te proposer avec si peu d'informations ?" },
      { speaker: 'Étudiant', text: "Un message très général… peut-être même un peu froid." },
      { speaker: 'Socrate', text: "Exactement. Alors, qu'ajouterais-tu pour l'aider ?" },
      { speaker: 'Étudiant', text: "Le montant, depuis combien de temps il doit l'argent, que c'est un bon client, et que je veux rester polie mais ferme. Et un message court, pour WhatsApp." },
      { speaker: 'Socrate', text: "Voilà une vraie demande ! L'IA va maintenant te donner un bon brouillon. Mais dis-moi : est-ce que tu l'envoies tel quel ?" },
      { speaker: 'Étudiant', text: "Non. Je le relis, je vérifie le montant, et je le change un peu pour qu'il me ressemble. Mon client connaît ma façon de parler." },
      { speaker: 'Socrate', text: "C'est toute la leçon de la semaine : l'IA te fait gagner du temps sur le brouillon, mais c'est ta voix et ton jugement qui font la différence. Et pour un résumé de réunion, que vérifierais-tu ?" },
      { speaker: 'Étudiant', text: "Les dates et les chiffres, dans le document original." },
      { speaker: 'Socrate', text: "Parfait. Cette semaine, choisis une vraie tâche de ton travail, demande un brouillon à l'IA, puis améliore-le. Tu verras combien de minutes tu gagnes." },
    ],
    quiz: [
      { q: "Awa veut relancer un client. Quelle demande à l'IA donnera le meilleur résultat ?", options: ["« Écris un message. »", "« Client pas payé. »", "« Écris un message WhatsApp poli à un client qui me doit 45 000 FCFA depuis 3 semaines, ton chaleureux mais ferme, 4 lignes. »", "« Fais quelque chose pour mon argent. »"], answer: 2, explain: "Plus la demande est précise (destinataire, montant, ton, longueur), meilleur est le brouillon." },
      { q: "L'IA a résumé un compte rendu de réunion. Que faut-il faire avant d'agir ?", options: ["Rien, le résumé est forcément juste", "Vérifier les dates, chiffres et noms dans le document original", "Supprimer le document original", "Demander un deuxième résumé et choisir au hasard"], answer: 1, explain: "Un résumé peut oublier ou déformer un détail important." },
      { q: "Quelle information ne faut-il JAMAIS coller dans un assistant d'IA ?", options: ["La liste de ses tâches de la semaine", "Le texte d'une affiche", "Le mot de passe de son compte bancaire", "Une question sur l'orthographe"], answer: 2, explain: "Mots de passe, numéros de carte et données privées ne doivent pas être partagés." },
      { q: "Pourquoi adapter le brouillon proposé par l'IA avant de l'envoyer ?", options: ["Pour qu'il ressemble à votre façon de parler et soit exact", "Parce que l'IA écrit toujours mal", "Ce n'est pas utile", "Pour le rendre plus long"], answer: 0, explain: "Vos interlocuteurs vous connaissent ; vous restez responsable du message." },
      { q: "Laquelle de ces tâches l'IA peut-elle aider à faire ?", options: ["Organiser ses tâches en plan de semaine", "Proposer un tableau simple de suivi des ventes", "Rédiger un premier brouillon de lettre", "Les trois"], answer: 3, explain: "Rédiger, résumer et organiser : ce sont les trois grands gains de temps." },
    ],
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
