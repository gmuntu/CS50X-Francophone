// Problèmes officiels de CS50x 2026 (Harvard), semaine par semaine.
// Source : https://cs50.harvard.edu/x/2026/psets/ — licence CC BY-NC-SA 4.0.
// Pour ajouter une vidéo doublée : remplir `fr` avec l'adresse « embed » YouTube de la version française.
// Doublage : Moon2⁺Studio, voix « Rémy » (la même que pour les leçons).

export interface ProblemVideo {
  /** Vidéo originale (anglais), adresse « embed » YouTube. */
  en: string;
  /** Version doublée en français (YouTube, non répertoriée) — à remplir après traduction. */
  fr?: string;
  type: 'presentation' | 'explication';
}

export interface Cs50Problem {
  slug: string;
  name: string;
  /** Ce que l'élève doit faire, en une phrase. */
  summary: string;
  url: string;
  /** Exercices au choix : version plus facile ou plus difficile. */
  level?: 'facile' | 'difficile';
  videos: ProblemVideo[];
}

export interface Cs50ProblemWeek {
  week: number;
  /** Phrase affichée quand il faut choisir entre deux versions d'un exercice. */
  choices?: string[];
  problems: Cs50Problem[];
}

const yt = (id: string) => `https://www.youtube.com/embed/${id}`;
const pset = (path: string) => `https://cs50.harvard.edu/x/2026/psets/${path}/`;

export const CS50_PROBLEMS_SOURCE = 'https://cs50.harvard.edu/x/2026/psets/';
export const CS50_PROBLEMS_DEADLINE = '30 juin 2027';

export const CS50_PROBLEM_WEEKS: Cs50ProblemWeek[] = [
  {
    week: 0,
    problems: [
      { slug: 'scratch', name: 'Starting from Scratch', summary: 'Créer avec Scratch un projet de votre choix : jeu, animation ou histoire interactive.', url: pset('0/scratch'), videos: [] },
    ],
  },
  {
    week: 1,
    choices: ['Mario : version facile ou difficile', 'Cash (facile) ou Credit (difficile)'],
    problems: [
      { slug: 'world', name: 'Hello, World', summary: 'Écrire votre premier programme en C, qui affiche « hello, world ».', url: pset('1/world'), videos: [{ en: yt('ufB53UE2Cvo'), type: 'presentation' }] },
      { slug: 'me', name: "Hello, It's Me", summary: "Demander son nom à l'utilisateur, puis le saluer personnellement.", url: pset('1/me'), videos: [{ en: yt('YQHsXMglC9A'), type: 'presentation' }, { en: yt('wSk1KSDUEYA'), type: 'explication' }] },
      { slug: 'mario-less', name: 'Mario', level: 'facile', summary: "Afficher une demi-pyramide alignée à droite, de la hauteur choisie par l'utilisateur.", url: pset('1/mario/less'), videos: [{ en: yt('cWOkHQXw0JQ'), type: 'presentation' }, { en: yt('NAs4FIWkJ4s'), type: 'explication' }] },
      { slug: 'mario-more', name: 'Mario', level: 'difficile', summary: 'Afficher deux demi-pyramides face à face, séparées par un espace.', url: pset('1/mario/more'), videos: [{ en: yt('cWOkHQXw0JQ'), type: 'presentation' }, { en: yt('FzN9RAjYG_Q'), type: 'explication' }] },
      { slug: 'cash', name: 'Cash', level: 'facile', summary: 'Calculer le plus petit nombre de pièces pour rendre la monnaie.', url: pset('1/cash'), videos: [] },
      { slug: 'credit', name: 'Credit', level: 'difficile', summary: "Vérifier qu'un numéro de carte bancaire est valide (algorithme de Luhn) et reconnaître sa marque.", url: pset('1/credit'), videos: [{ en: yt('dF7wNjsRBjI'), type: 'explication' }] },
    ],
  },
  {
    week: 2,
    choices: ['Caesar (facile) ou Substitution (difficile)'],
    problems: [
      { slug: 'scrabble', name: 'Scrabble', summary: 'Comparer les points de deux mots au Scrabble pour désigner le gagnant.', url: pset('2/scrabble'), videos: [] },
      { slug: 'readability', name: 'Readability', summary: "Estimer le niveau scolaire d'un texte avec l'indice de Coleman-Liau.", url: pset('2/readability'), videos: [{ en: yt('AOVyZEh9zgE'), type: 'explication' }] },
      { slug: 'caesar', name: 'Caesar', level: 'facile', summary: "Chiffrer un message en décalant chaque lettre d'un même nombre (chiffre de César).", url: pset('2/caesar'), videos: [{ en: yt('V2uusmv2wxI'), type: 'explication' }] },
      { slug: 'substitution', name: 'Substitution', level: 'difficile', summary: 'Chiffrer un message avec une clé qui remplace chaque lettre par une autre.', url: pset('2/substitution'), videos: [{ en: yt('cXAoZAsgxJ4'), type: 'explication' }] },
    ],
  },
  {
    week: 3,
    choices: ['Runoff ou Tideman (très difficile, facultatif)'],
    problems: [
      { slug: 'sort', name: 'Sort', summary: 'Deviner quel algorithme de tri utilise chacun de trois programmes, en mesurant leur vitesse.', url: pset('3/sort'), videos: [] },
      { slug: 'plurality', name: 'Plurality', summary: 'Programmer une élection où gagne le candidat qui a le plus de voix.', url: pset('3/plurality'), videos: [{ en: yt('ftOapzDjEb8'), type: 'explication' }] },
      { slug: 'runoff', name: 'Runoff', summary: 'Programmer une élection à vote classé, avec éliminations successives des derniers.', url: pset('3/runoff'), videos: [{ en: yt('-Vc5aGywKxo'), type: 'explication' }] },
      { slug: 'tideman', name: 'Tideman', level: 'difficile', summary: 'Programmer une élection selon la méthode Tideman (duels classés entre candidats).', url: pset('3/tideman'), videos: [{ en: yt('kb83NwyYI68'), type: 'explication' }] },
    ],
  },
  {
    week: 4,
    choices: ['Filter : version facile ou difficile'],
    problems: [
      { slug: 'volume', name: 'Volume', summary: "Modifier le volume d'un fichier audio WAV.", url: pset('4/volume'), videos: [{ en: yt('LiGhjz9ColQ'), type: 'explication' }, { en: yt('-rtZkTAK2gg'), type: 'explication' }] },
      { slug: 'filter-less', name: 'Filter', level: 'facile', summary: 'Appliquer des filtres à une image : noir et blanc, sépia, miroir, flou.', url: pset('4/filter/less'), videos: [{ en: yt('K0v9byp9jd0'), type: 'explication' }] },
      { slug: 'filter-more', name: 'Filter', level: 'difficile', summary: 'Appliquer des filtres à une image : noir et blanc, miroir, flou, détection des contours.', url: pset('4/filter/more'), videos: [{ en: yt('vsOsctDernw'), type: 'explication' }] },
      { slug: 'recover', name: 'Recover', summary: "Récupérer des photos JPEG effacées d'une carte mémoire.", url: pset('4/recover'), videos: [{ en: yt('ooL0r_8N9ms'), type: 'explication' }] },
    ],
  },
  {
    week: 5,
    problems: [
      { slug: 'inheritance', name: 'Inheritance', summary: 'Simuler la transmission du groupe sanguin sur plusieurs générations.', url: pset('5/inheritance'), videos: [{ en: yt('xfZhb6lmxjk'), type: 'presentation' }, { en: yt('9p7ddI3ozTY'), type: 'explication' }, { en: yt('H7LULatPwcQ'), type: 'explication' }] },
      { slug: 'speller', name: 'Speller', summary: 'Écrire le correcteur orthographique le plus rapide possible, avec une table de hachage.', url: pset('5/speller'), videos: [{ en: yt('_z57x5PGF4w'), type: 'explication' }] },
    ],
  },
  {
    week: 6,
    choices: ['Mario : version facile ou difficile', 'Cash (facile) ou Credit (difficile)'],
    problems: [
      { slug: 'hello', name: 'Hello', summary: "Refaire « Hello, It's Me » en Python.", url: pset('6/hello'), videos: [] },
      { slug: 'mario-less', name: 'Mario', level: 'facile', summary: 'Refaire la demi-pyramide de Mario en Python.', url: pset('6/mario/less'), videos: [] },
      { slug: 'mario-more', name: 'Mario', level: 'difficile', summary: 'Refaire les deux demi-pyramides de Mario en Python.', url: pset('6/mario/more'), videos: [] },
      { slug: 'cash', name: 'Cash', level: 'facile', summary: 'Refaire le rendu de monnaie en Python.', url: pset('6/cash'), videos: [] },
      { slug: 'credit', name: 'Credit', level: 'difficile', summary: 'Refaire la vérification de carte bancaire en Python.', url: pset('6/credit'), videos: [] },
      { slug: 'readability', name: 'Readability', summary: "Refaire l'estimation du niveau de lecture en Python.", url: pset('6/readability'), videos: [] },
      { slug: 'dna', name: 'DNA', summary: "Identifier à qui appartient un échantillon d'ADN.", url: pset('6/dna'), videos: [{ en: yt('j84b_EgntcQ'), type: 'explication' }] },
    ],
  },
  {
    week: 7,
    problems: [
      { slug: 'songs', name: 'Songs', summary: 'Écrire des requêtes SQL sur une base des chansons les plus écoutées.', url: pset('7/songs'), videos: [] },
      { slug: 'movies', name: 'Movies', summary: 'Écrire des requêtes SQL sur une grande base de films et d’acteurs.', url: pset('7/movies'), videos: [{ en: yt('v5_A3giDlQs'), type: 'explication' }] },
      { slug: 'fiftyville', name: 'Fiftyville', summary: 'Mener une enquête avec SQL pour retrouver le voleur du canard de CS50.', url: pset('7/fiftyville'), videos: [{ en: yt('YHhgEoJMDnU'), type: 'explication' }] },
    ],
  },
  {
    week: 8,
    problems: [
      { slug: 'trivia', name: 'Trivia', summary: 'Créer une page de quiz interactive en HTML, CSS et JavaScript.', url: pset('8/trivia'), videos: [] },
      { slug: 'homepage', name: 'Homepage', summary: 'Créer votre propre site web de plusieurs pages.', url: pset('8/homepage'), videos: [] },
    ],
  },
  {
    week: 9,
    problems: [
      { slug: 'birthdays', name: 'Birthdays', summary: 'Créer une application web avec Flask pour enregistrer des anniversaires.', url: pset('9/birthdays'), videos: [] },
      { slug: 'finance', name: 'Finance', summary: 'Créer une application web de Bourse fictive pour acheter et vendre des actions.', url: pset('9/finance'), videos: [{ en: yt('7wPTAwT-6bA'), type: 'explication' }] },
    ],
  },
  { week: 10, problems: [] },
];

export const getProblemWeek = (week: number) => CS50_PROBLEM_WEEKS.find((w) => w.week === week);
