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
    ready: true,
    summary: `Cette semaine, nous suivons **M. Kabeya**, enseignant de CM2 à Kinshasa. Il veut préparer une leçon sur le cycle de l'eau et une petite évaluation. Sa première demande à l'IA donne un texte trop long et trop compliqué. Il apprend à mieux demander.

## 1. Qu'est-ce qu'un prompt ?
Un **prompt** est la demande que vous écrivez (ou dites) à une IA. La qualité de la réponse dépend surtout de la qualité de la demande. L'IA ne lit pas dans vos pensées : ce que vous ne dites pas, elle le devine… souvent mal.

## 2. La méthode en 5 étapes
1. **La tâche** : que voulez-vous exactement ? (« Prépare une leçon… »)
2. **Le contexte** : pour qui, pourquoi, dans quelle situation ? (« …pour des élèves de 10-11 ans à Kinshasa, sans projecteur. »)
3. **Un exemple** : montrez ce que vous attendez. (« Comme cette leçon que j'ai faite sur la photosynthèse : … »)
4. **Le format** : longueur, ton, forme. (« 1 page, phrases courtes, avec 5 questions à la fin. »)
5. **Une contrainte** : langue, budget, pays, matériel. (« Utilise des exemples du fleuve Congo. »)

Pas besoin des 5 à chaque fois : pour une petite tâche, 2 ou 3 suffisent. Pour une tâche importante, utilisez les 5.

## 3. Avant / après
> **Avant** : « Fais une leçon sur le cycle de l'eau. »

> **Après** : « Tu es un enseignant expérimenté. Prépare une leçon d'une page sur le cycle de l'eau pour des élèves de CM2 à Kinshasa. Phrases courtes, exemples du fleuve Congo et de la saison des pluies. Termine par 5 questions à choix multiples avec les réponses. »

La deuxième demande donne une leçon directement utilisable.

## 4. Améliorer une réponse
Une réponse ne vous plaît pas ? Ne recommencez pas tout : **continuez la conversation**.
- « Plus court, s'il te plaît. »
- « Explique plus simplement, comme à un enfant de 10 ans. »
- « Donne 3 autres idées. »
- « Mets ça sous forme de tableau. »
- « Qu'est-ce qui manque dans ta réponse ? »

## 5. Français simple et langues locales
- Écrivez en français simple : phrases courtes, un sujet à la fois.
- Vous pouvez demander une traduction ou une version en lingala, wolof, swahili, bambara… mais **faites vérifier** par quelqu'un qui parle bien la langue : l'IA est souvent moins précise dans les langues africaines.

## Exercice oral avec Socrate Agora
Plus bas sur cette page, dictez à Socrate un prompt pour une vraie tâche. Il vous aide à l'améliorer, étape par étape, avec la méthode en 5 étapes.`,
    keyPoints: [
      "Un prompt est votre demande à l'IA : la qualité de la réponse dépend de la qualité de la demande.",
      'Méthode en 5 étapes : tâche, contexte, exemple, format, contrainte.',
      'Une réponse décevante ? Continuez la conversation au lieu de tout recommencer.',
      'Français simple, phrases courtes, un sujet à la fois.',
      'Langues locales : possibles, mais à faire vérifier par un locuteur.',
    ],
    podcast: [
      { speaker: 'Étudiant', text: "Socrate, j'ai demandé à l'IA de m'aider pour un exposé sur le cacao en Côte d'Ivoire. Elle m'a donné un texte de trois pages, plein de mots compliqués. C'est nul !" },
      { speaker: 'Socrate', text: "Qu'avais-tu écrit exactement ?" },
      { speaker: 'Étudiant', text: "« Fais un exposé sur le cacao. »" },
      { speaker: 'Socrate', text: "Imagine que tu donnes cette même phrase à un ami très savant qui ne te connaît pas. Que lui manque-t-il pour bien t'aider ?" },
      { speaker: 'Étudiant', text: "Il ne sait pas que c'est pour ma classe de terminale, que j'ai dix minutes pour parler, et que je veux parler surtout des planteurs." },
      { speaker: 'Socrate', text: "Tu viens de trouver le contexte. Et la forme ? Tu voulais trois pages ?" },
      { speaker: 'Étudiant', text: "Non ! Un plan en trois parties, avec des phrases simples que je peux dire à l'oral." },
      { speaker: 'Socrate', text: "Voilà le format. Tâche, contexte, format : tu as déjà trois des cinq étapes. Une contrainte, peut-être ?" },
      { speaker: 'Étudiant', text: "Utiliser des chiffres récents… et me dire d'où ils viennent, pour que je puisse vérifier." },
      { speaker: 'Socrate', text: "Excellent, tu penses déjà à vérifier. Et si la réponse est encore trop longue, que feras-tu ?" },
      { speaker: 'Étudiant', text: "Je ne recommence pas tout : je lui dis « plus court » ou « plus simple »." },
      { speaker: 'Socrate', text: "Tu as compris l'art du prompt : bien demander, puis discuter. Tout à l'heure, dans l'exercice oral, tu vas le pratiquer à voix haute avec moi." },
    ],
    quiz: [
      { q: "Qu'est-ce qu'un prompt ?", options: ["Un virus informatique", "La demande que l'on écrit ou dit à une IA", "Un type d'ordinateur", "Le nom d'une application"], answer: 1, explain: "Le prompt est votre demande ; sa qualité détermine celle de la réponse." },
      { q: "Quelles sont les 5 étapes d'un bon prompt ?", options: ["Bonjour, merci, s'il te plaît, au revoir, bravo", "Tâche, contexte, exemple, format, contrainte", "Titre, image, couleur, police, taille", "Question, réponse, question, réponse, fin"], answer: 1, explain: "Tâche, contexte, exemple, format, contrainte." },
      { q: "« Fais une leçon sur le cycle de l'eau. » Qu'ajouter en priorité ?", options: ["Rien, c'est parfait", "Le public (élèves de CM2), la longueur et le format attendu", "Des emojis", "Le mot « urgent »"], answer: 1, explain: "Le contexte et le format rendent la réponse directement utilisable." },
      { q: "La réponse de l'IA est trop longue. Que faire ?", options: ["Fermer l'application", "Recommencer une nouvelle conversation depuis zéro", "Continuer la conversation : « Plus court, s'il te plaît »", "Copier quand même tout le texte"], answer: 2, explain: "On améliore une réponse en dialoguant avec l'IA." },
      { q: "Vous demandez une traduction en wolof. Que faut-il faire ?", options: ["L'utiliser telle quelle", "La faire vérifier par quelqu'un qui parle bien wolof", "Ne jamais demander de traduction", "La traduire à nouveau en anglais"], answer: 1, explain: "L'IA est souvent moins précise dans les langues africaines : faites vérifier." },
    ],
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
    ready: true,
    summary: `Cette semaine, nous suivons **Fatou**, journaliste à Dakar. À trois jours d'une élection, elle reçoit sur WhatsApp une vidéo où un candidat semble insulter ses électeurs. La vidéo circule partout. Est-elle vraie ?

## 1. Les biais
Une IA apprend à partir d'exemples. Si ces exemples sont déséquilibrés, l'IA reproduit les déséquilibres : c'est un **biais**.
- Demandez « l'image d'un médecin » : l'IA montre souvent un homme blanc.
- Demandez « une ville africaine » : elle montre parfois seulement la pauvreté, jamais les quartiers d'affaires de Lagos ou d'Abidjan.

**Que faire ?** Remarquer le stéréotype, préciser votre demande (« une femme médecin camerounaise »), et ne pas prendre la réponse pour la réalité.

## 2. La vie privée
Ce que vous écrivez à une IA peut être conservé et parfois utilisé pour l'entraîner. **Ne donnez jamais** :
- mots de passe, codes PIN, numéros de carte ;
- numéros de pièce d'identité ;
- informations de santé ou privées d'une autre personne ;
- documents confidentiels de votre employeur.

Astuce : remplacez les vrais noms par « Client A », « Élève B » avant de coller un texte.

## 3. Les fausses informations
L'IA permet de fabriquer de **fausses images, fausses voix et fausses vidéos** (on parle de *deepfakes*) très réalistes. Fatou applique sa méthode :
1. **D'où vient la vidéo ?** Qui l'a publiée en premier ?
2. **Les grands médias en parlent-ils ?** Une vraie déclaration choquante serait reprise partout.
3. **Les détails** : lèvres décalées, voix métallique, mains ou yeux étranges, lumière bizarre.
4. **Recherche inversée** : chercher l'image ou une capture de la vidéo sur Google Images ou Google Lens.
5. **Dans le doute, on ne partage pas.**

Fatou découvre que la voix a été fabriquée : elle publie un article qui explique la manipulation.

## 4. Droits d'auteur et honnêteté
- Un texte produit par l'IA n'est pas « votre » travail : à l'école, **dites quand vous avez utilisé l'IA** si on vous le demande.
- Ne faites pas recopier mot pour mot le livre ou l'article de quelqu'un d'autre.
- Citez vos sources, et vérifiez qu'elles existent vraiment.

## 5. La règle d'or (encore)
Vous restez **responsable** de ce que vous publiez, envoyez ou rendez, même si l'IA l'a écrit.`,
    keyPoints: [
      "Un biais : l'IA reproduit les déséquilibres de ses données (ex. stéréotypes sur l'Afrique ou les femmes).",
      "Jamais de mots de passe, numéros de carte ou données privées d'autrui dans une IA.",
      'Fausses vidéos et voix existent : vérifier la source, les médias, les détails, puis la recherche inversée.',
      'Dans le doute, on ne partage pas.',
      "Être honnête : dire quand on a utilisé l'IA, citer ses sources ; on reste responsable.",
    ],
    podcast: [
      { speaker: 'Étudiant', text: "Socrate, tout le monde a partagé une vidéo d'un ministre qui insulte les commerçants. Je l'ai transférée à toute ma famille." },
      { speaker: 'Socrate', text: "Avant de la transférer, qu'est-ce qui te faisait penser qu'elle était vraie ?" },
      { speaker: 'Étudiant', text: "Euh… c'était sa voix, son visage. Et tout le monde la partageait." },
      { speaker: 'Socrate', text: "Cette semaine, tu as appris que l'IA peut fabriquer une voix et un visage. Le fait que beaucoup de gens partagent une vidéo prouve-t-il qu'elle est vraie ?" },
      { speaker: 'Étudiant', text: "Non… ça prouve seulement qu'elle choque." },
      { speaker: 'Socrate', text: "Bien vu. Alors, comment aurais-tu pu vérifier ?" },
      { speaker: 'Étudiant', text: "Regarder d'où elle vient, voir si les journaux sérieux en parlent, et faire une recherche avec une capture de l'image." },
      { speaker: 'Socrate', text: "Et si tu ne trouves rien ?" },
      { speaker: 'Étudiant', text: "Dans le doute, je ne partage pas. Et là, je vais envoyer un message à ma famille pour dire que ce n'est peut-être pas vrai." },
      { speaker: 'Socrate', text: "C'est courageux. Une dernière question : pour ton devoir, tu as fait écrire ton introduction par l'IA. Que dois-tu à ton professeur ?" },
      { speaker: 'Étudiant', text: "L'honnêteté. Je dois le dire, et vérifier ce qu'elle a écrit." },
      { speaker: 'Socrate', text: "Voilà ce qu'est utiliser l'IA de façon responsable : vérifier, protéger, être honnête. Ce sont des qualités humaines, et elles comptent plus que jamais." },
    ],
    quiz: [
      { q: "Qu'est-ce qu'un biais dans une IA ?", options: ["Une panne d'électricité", "Un déséquilibre appris dans ses données, qui peut créer des stéréotypes", "Une mise à jour", "Un mot de passe"], answer: 1, explain: "L'IA reproduit les déséquilibres de ses exemples d'entraînement." },
      { q: "Que pouvez-vous coller sans risque dans une IA ?", options: ["Votre code PIN", "Le dossier médical d'un collègue", "Un texte où les vrais noms sont remplacés par « Client A », « Client B »", "Le numéro de votre carte bancaire"], answer: 2, explain: "Anonymisez : jamais de données sensibles ou privées." },
      { q: "Vous recevez une vidéo choquante d'une personnalité. Première chose à faire ?", options: ["La partager vite à tout le monde", "Vérifier d'où elle vient et si des médias sérieux en parlent", "La commenter", "L'envoyer à la personnalité"], answer: 1, explain: "L'IA peut fabriquer de fausses vidéos : on vérifie la source d'abord." },
      { q: "Après vérification, vous ne savez toujours pas si l'image est vraie.", options: ["Je la partage avec « peut-être »", "Je ne la partage pas", "Je la modifie", "Je demande à l'IA de dire si c'est vrai et je la crois"], answer: 1, explain: "Dans le doute, on ne partage pas." },
      { q: "L'IA a écrit une partie de votre devoir. Quelle attitude est honnête ?", options: ["Ne rien dire", "Dire que vous avez utilisé l'IA si on le demande, et vérifier le contenu", "Accuser un camarade", "Changer quelques mots pour que ça ne se voie pas"], answer: 1, explain: "On reste honnête et responsable de ce qu'on rend." },
    ],
  },
  {
    n: 5,
    title: 'Rester à jour et projet final',
    intro: "Suivre l'évolution de l'IA, réaliser son projet final et préparer le certificat.",
    tags: ['Veille simple', 'Projet final', 'Préparation au certificat'],
    ready: true,
    summary: `Dernière semaine ! Vous savez ce qu'est l'IA, vous gagnez du temps avec elle, vous savez bien demander et l'utiliser de façon responsable. Il reste à **continuer d'apprendre** et à **le prouver**.

## 1. L'IA change très vite
De nouveaux outils sortent chaque mois. Inutile de tout suivre : **15 minutes par semaine** suffisent.
- Choisissez **2 ou 3 sources fiables** : la rubrique technologie d'un grand média, le blog officiel d'un outil que vous utilisez, une communauté locale (club, groupe d'entraide).
- Une fois par semaine, **testez une nouvelle fonction** sur une vraie tâche.
- Méfiez-vous des promesses miracles (« devenez riche avec l'IA en 3 jours ») : ce sont souvent des arnaques.

## 2. Garder ses bonnes habitudes
- La **méthode en 5 étapes** pour chaque demande importante.
- **Vérifier** les faits, chiffres, dates et sources.
- **Protéger** vos données et celles des autres.
- **Rester honnête** : vous êtes responsable du résultat.

## 3. Votre projet final
Choisissez une **vraie tâche** de votre travail ou de votre vie : une affiche, un plan de vente, un courriel important, une leçon, un CV…
Préparez ces 4 éléments :
1. **Votre prompt** (avec la méthode en 5 étapes).
2. **La réponse de l'IA**.
3. **Ce que vous avez vérifié** (faits, chiffres, ton).
4. **Votre version finale améliorée**, et ce que vous avez changé.

Présentez-les à Socrate ci-dessous : il vous donne son avis. Le dépôt officiel du projet et l'attestation SavoirIA arrivent très bientôt sur cette page.

## 4. Préparer le certificat Google AI Essentials
- Le cours officiel est sur **Coursera**, en anglais, et payant selon les conditions de Google (des aides financières existent parfois).
- Vous connaissez déjà les grands thèmes : **vous aurez un temps d'avance**.
- Conseil : utilisez la traduction automatique des sous-titres, et posez vos questions à Socrate en français.

## 5. Et après ?
L'IA est une porte d'entrée. Continuez avec une autre formation SavoirIA : **CS50x Francophone** (programmation), puis bientôt **Analyse de données** et **Cybersécurité**.`,
    keyPoints: [
      "15 minutes de veille par semaine, avec 2 ou 3 sources fiables, suffisent.",
      'Méfiez-vous des promesses miracles : souvent des arnaques.',
      'Projet final : prompt, réponse de l\'IA, vérifications, version finale améliorée.',
      'Le certificat Google AI Essentials se prépare sur Coursera (en anglais) : vous avez une longueur d\'avance.',
      "Continuez avec une autre formation SavoirIA.",
    ],
    podcast: [
      { speaker: 'Étudiant', text: "Socrate, c'est la dernière semaine. Mais l'IA change tout le temps… ce que j'ai appris sera vite dépassé, non ?" },
      { speaker: 'Socrate', text: "Réfléchissons. Parmi ce que tu as appris, qu'est-ce qui dépend d'un outil précis, et qu'est-ce qui restera vrai dans cinq ans ?" },
      { speaker: 'Étudiant', text: "Les boutons des applications vont changer. Mais bien demander, vérifier, protéger ses données… ça restera." },
      { speaker: 'Socrate', text: "Exactement. Les outils passent, les bonnes habitudes restent. Et pour suivre les nouveautés, combien de temps te faut-il ?" },
      { speaker: 'Étudiant', text: "Pas des heures. Un quart d'heure par semaine, avec deux ou trois sources sérieuses." },
      { speaker: 'Socrate', text: "Et si on te promet de devenir riche avec l'IA en trois jours ?" },
      { speaker: 'Étudiant', text: "Je me méfie. C'est sûrement une arnaque." },
      { speaker: 'Socrate', text: "Parlons de ton projet final. Quelle vraie tâche vas-tu choisir ?" },
      { speaker: 'Étudiant', text: "Le CV de mon grand frère qui cherche du travail. Je vais écrire un bon prompt, vérifier, puis améliorer moi-même." },
      { speaker: 'Socrate', text: "Un excellent choix, utile à quelqu'un que tu aimes. Et souviens-toi : ce n'est pas la fin. C'est le début. Viens me raconter ton projet quand tu veux." },
    ],
    quiz: [
      { q: "Combien de temps de veille par semaine est conseillé pour suivre l'IA ?", options: ["Aucun", "Environ 15 minutes, avec 2 ou 3 sources fiables", "8 heures par jour", "Seulement quand un ami en parle"], answer: 1, explain: "Peu de temps, mais régulièrement, avec de bonnes sources." },
      { q: "« Devenez riche avec l'IA en 3 jours ! » Votre réaction ?", options: ["Je paie tout de suite", "Je me méfie : c'est souvent une arnaque", "Je partage à mes amis", "Je donne mon numéro de carte"], answer: 1, explain: "Les promesses miracles sont un signal d'arnaque." },
      { q: "Qu'est-ce qui restera utile même quand les outils changeront ?", options: ["L'emplacement des boutons", "Le nom des applications", "Bien demander, vérifier, protéger ses données, rester honnête", "Rien"], answer: 2, explain: "Les bonnes habitudes durent plus longtemps que les outils." },
      { q: "Que contient le projet final ?", options: ["Seulement la réponse de l'IA", "Le prompt, la réponse de l'IA, les vérifications et votre version améliorée", "Une photo de profil", "Un paiement"], answer: 1, explain: "Le projet montre votre méthode, pas seulement le résultat de l'IA." },
      { q: "Où se prépare le certificat officiel Google AI Essentials ?", options: ["Sur WhatsApp", "Sur Coursera, en anglais", "Uniquement sur SavoirIA", "À la mairie"], answer: 1, explain: "SavoirIA prépare en français ; le certificat officiel est délivré par Google sur Coursera." },
    ],
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
