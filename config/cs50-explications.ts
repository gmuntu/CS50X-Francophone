// Explications en français des problèmes de CS50x 2026, à la manière des « walkthroughs »
// des assistants de David Malan : ce qu'on demande, un exemple, comment découper le problème,
// les notions du cours à utiliser, les pièges fréquents et comment vérifier son travail.
// Jamais la solution : seulement le chemin pour la trouver (règle d'honnêteté de CS50).
// Rédigé par SavoirIA d'après les consignes officielles (licence CC BY-NC-SA 4.0).

export interface Cs50Explication {
  /** Le problème en clair, en 2 ou 3 phrases. */
  enBref: string;
  /** Exemple d'exécution dans le terminal ($ = ce que tape l'élève). */
  exemple?: string;
  /** Découper le problème en petites étapes (pseudo-code en français). */
  etapes: string[];
  /** Ce qu'il faut avoir compris du cours. */
  notions: string[];
  /** Erreurs fréquentes des étudiants. */
  pieges: string[];
  /** Commandes pour tester et rendre le travail. */
  verifier: string[];
  /** Même problème qu'une semaine précédente (Python après C) : on renvoie à son explication. */
  memeQue?: { week: number; slug: string };
}

const outils = (probleme: string, fichier?: string, rendre = true) => [
  `check50 cs50/problems/2026/x/${probleme}`,
  ...(fichier ? [`style50 ${fichier}`] : []),
  ...(rendre ? [`submit50 cs50/problems/2026/x/${probleme}`] : []),
];

export const CS50_EXPLICATIONS: Record<string, Cs50Explication> = {
  // ─────────────── Semaine 0 : Scratch ───────────────
  '0-scratch': {
    enBref: "Créer dans Scratch un projet à vous : un jeu, une animation ou une histoire interactive. Le but n'est pas d'être parfait, mais de montrer que vous savez utiliser les idées de la semaine : boucles, conditions, variables.",
    etapes: [
      "Choisir une idée simple que vous pourrez finir (un personnage qui attrape des objets, un quiz…).",
      "Dessiner sur papier ce qui se passe : qui bouge, quand, et comment on gagne ou on perd.",
      "Construire d'abord une version minimale qui marche, puis ajouter des détails.",
      "Vérifier la liste des exigences officielles avant de rendre.",
    ],
    notions: [
      "Au moins deux sprites (personnages ou objets), dont au moins un qui n'est pas un chat, et au moins trois scripts en tout.",
      "Au moins une condition (si… alors), une boucle (répéter, pour toujours) et une variable.",
      "Au moins un « bloc personnalisé » que vous créez vous-même (Créer un bloc), qui reçoit au moins une entrée.",
      "Si vous importez des images ou des sons, citez leur origine dans un commentaire.",
    ],
    pieges: [
      "Un projet trop ambitieux qu'on ne termine pas : commencez petit.",
      "Oublier le bloc personnalisé : c'est une exigence de la note.",
      "Copier un projet existant : il doit être de vous.",
    ],
    verifier: ["Testez votre projet en demandant à quelqu'un d'y jouer sans vos explications.", "Rendez-le avec le formulaire indiqué dans les consignes officielles."],
  },

  // ─────────────── Semaine 1 : C ───────────────
  '1-world': {
    enBref: "Votre tout premier programme en C : il affiche simplement hello, world. L'objectif est d'apprendre le trio écrire → compiler → exécuter.",
    exemple: "$ make hello\n$ ./hello\nhello, world",
    etapes: [
      "Créer le dossier world et le fichier hello.c (code hello.c).",
      "Écrire le programme vu en cours, avec #include <stdio.h> et printf.",
      "Compiler avec make hello, puis lancer ./hello.",
    ],
    notions: ["La fonction main, point de départ de tout programme C.", "printf pour afficher du texte, et \\n pour aller à la ligne.", "La compilation : transformer le code source en programme exécutable."],
    pieges: ["Oublier le point-virgule à la fin d'une instruction.", "Oublier \\n : le $ du terminal se retrouve collé au texte.", "Modifier le code sans recompiler : il faut refaire make après chaque changement."],
    verifier: outils('world', 'hello.c', false),
  },
  '1-me': {
    enBref: "Le programme demande son nom à l'utilisateur, puis le salue : hello, Adele. C'est votre première entrée clavier.",
    exemple: "$ ./hello\nWhat's your name? Adele\nhello, Adele",
    etapes: ["Demander le nom avec get_string et le ranger dans une variable.", "Afficher hello, suivi du nom, avec printf."],
    notions: ["Les variables et le type string (de la bibliothèque CS50).", "get_string, déclarée dans cs50.h.", "Les codes de format : %s remplace un texte dans printf."],
    pieges: ["Oublier #include <cs50.h>.", "Écrire printf(\"hello, name\") : le mot name s'affiche tel quel. Il faut %s et passer la variable."],
    verifier: outils('me', 'hello.c'),
  },
  '1-mario-less': {
    enBref: "Afficher une demi-pyramide de # alignée à droite, comme l'escalier à la fin d'un niveau de Mario. L'utilisateur choisit la hauteur (de 1 à 8).",
    exemple: "$ ./mario\nHeight: 3\n  #\n ##\n###",
    etapes: [
      "Demander la hauteur, et redemander tant qu'elle n'est pas entre 1 et 8 (boucle do… while).",
      "Pour chaque ligne i (de 1 à la hauteur) : afficher d'abord des espaces, puis des #.",
      "Trouver la règle : à la ligne i, combien d'espaces ? combien de # ? (indice : leur somme vaut toujours la hauteur).",
      "Passer à la ligne après chaque rangée.",
    ],
    notions: ["La boucle do… while pour valider une saisie.", "Les boucles for imbriquées : une pour les lignes, une (ou deux) pour les caractères.", "Créer ses propres fonctions, par exemple print_row(espaces, briques)."],
    pieges: ["Une pyramide alignée à gauche : il manque les espaces avant les #.", "Des espaces en trop en fin de ligne : check50 les refuse.", "Accepter 0 ou un nombre négatif."],
    verifier: outils('mario/less', 'mario.c'),
  },
  '1-mario-more': {
    enBref: "Comme la version facile, mais avec deux demi-pyramides face à face, séparées par deux espaces.",
    exemple: "$ ./mario\nHeight: 3\n  #  #\n ##  ##\n###  ###",
    etapes: [
      "Valider la hauteur (1 à 8) avec une boucle do… while.",
      "Pour chaque ligne : des espaces, des #, deux espaces fixes, puis des # à nouveau.",
      "Ne rien afficher après les # de droite.",
    ],
    notions: ["Boucles imbriquées et fonctions, comme dans la version facile.", "Repérer ce qui change et ce qui ne change pas d'une ligne à l'autre."],
    pieges: ["Ajouter des espaces après la pyramide de droite : check50 échoue.", "Un seul espace au milieu au lieu de deux."],
    verifier: outils('mario/more', 'mario.c'),
  },
  '1-cash': {
    enBref: "Un client doit recevoir de la monnaie : combien de pièces au minimum faut-il lui rendre ? Pièces américaines : 25, 10, 5 et 1 cent.",
    exemple: "$ ./cash\nChange owed: 70\n4",
    etapes: [
      "Demander la somme due en cents (redemander si elle est négative).",
      "Donner autant de pièces de 25 que possible, et retirer leur valeur de la somme.",
      "Recommencer avec 10, puis 5, puis 1.",
      "Additionner le nombre de pièces et l'afficher.",
    ],
    notions: ["L'algorithme glouton : toujours prendre la plus grosse pièce possible.", "La division entière (/) et le reste (%) en C.", "Découper son programme en petites fonctions, par exemple calculate_quarters."],
    pieges: ["Oublier de soustraire la valeur des pièces déjà données.", "Accepter une somme négative.", "Afficher autre chose que le nombre : check50 attend uniquement le nombre."],
    verifier: outils('cash', 'cash.c'),
  },
  '1-credit': {
    enBref: "Vérifier qu'un numéro de carte bancaire est valide grâce à l'algorithme de Luhn, puis dire s'il s'agit d'une carte AMEX, MASTERCARD ou VISA (sinon INVALID).",
    exemple: "$ ./credit\nNumber: 4003600000000014\nVISA",
    etapes: [
      "Lire le numéro avec get_long (il est trop grand pour un int).",
      "Parcourir les chiffres de droite à gauche avec % 10 et / 10.",
      "Un chiffre sur deux, en partant de l'avant-dernier : le multiplier par 2 et additionner les chiffres du résultat.",
      "Ajouter les autres chiffres. Si le total se termine par 0, la somme de contrôle est bonne.",
      "Regarder la longueur et les premiers chiffres pour trouver la marque.",
    ],
    notions: ["Le type long pour les grands nombres.", "Extraire un chiffre avec % 10 et le retirer avec / 10.", "Les conditions combinées (&&, ||)."],
    pieges: ["Additionner 12 au lieu de 1 + 2 quand un chiffre doublé dépasse 9.", "Oublier de vérifier la longueur : AMEX 15 chiffres, MASTERCARD 16, VISA 13 ou 16.", "Afficher la marque d'une carte dont la somme de contrôle est fausse."],
    verifier: outils('credit', 'credit.c'),
  },

  // ─────────────── Semaine 2 : tableaux ───────────────
  '2-scrabble': {
    enBref: "Deux joueurs tapent chacun un mot. Le programme calcule les points de chaque mot selon le barème du Scrabble et annonce : Player 1 wins!, Player 2 wins! ou Tie!",
    exemple: "$ ./scrabble\nPlayer 1: Question?\nPlayer 2: Question!\nTie!",
    etapes: [
      "Demander les deux mots.",
      "Écrire une fonction compute_score(word) qui additionne les points de chaque lettre.",
      "Pour une lettre, trouver sa place dans l'alphabet (A = 0, B = 1…) et lire ses points dans le tableau POINTS.",
      "Comparer les deux scores et afficher le résultat.",
    ],
    notions: ["Les tableaux : POINTS[0] contient les points de A.", "Les caractères sont des nombres (code ASCII) : 'C' - 'A' vaut 2.", "isupper, islower, toupper de ctype.h.", "strlen pour connaître la longueur d'un mot."],
    pieges: ["Oublier les minuscules : a et A valent la même chose.", "Donner des points à la ponctuation (! vaut 0).", "Lire en dehors du tableau POINTS."],
    verifier: outils('scrabble', 'scrabble.c'),
  },
  '2-readability': {
    enBref: "Estimer pour quel niveau scolaire un texte est écrit, avec la formule de Coleman-Liau. Le programme affiche Grade X, Before Grade 1 ou Grade 16+.",
    exemple: "$ ./readability\nText: Congratulations! Today is your day. You're off to Great Places! You're off and away!\nGrade 3",
    etapes: [
      "Compter les lettres (seulement a à z et A à Z).",
      "Compter les mots : en gros, nombre d'espaces + 1.",
      "Compter les phrases : nombre de ., ! et ?.",
      "Calculer L (lettres pour 100 mots) et S (phrases pour 100 mots), puis l'indice 0.0588 × L − 0.296 × S − 15.8.",
      "Arrondir et afficher le bon message.",
    ],
    notions: ["Parcourir une chaîne caractère par caractère.", "isalpha de ctype.h.", "La division entre entiers en C coupe la virgule : il faut un float.", "round de math.h."],
    pieges: ["Diviser deux int : 65 / 14 donne 4 au lieu de 4,64. Convertissez en float.", "Oublier les cas en dessous de 1 et à partir de 16."],
    verifier: outils('readability', 'readability.c'),
  },
  '2-caesar': {
    enBref: "Chiffrer un message en décalant chaque lettre d'un même nombre de places (la clé). Avec la clé 1, HELLO devient IFMMP. La clé est donnée sur la ligne de commande.",
    exemple: "$ ./caesar 13\nplaintext:  hello, world\nciphertext: uryyb, jbeyq",
    etapes: [
      "Vérifier qu'il y a exactement un argument et qu'il ne contient que des chiffres. Sinon : Usage: ./caesar key et return 1.",
      "Convertir la clé en nombre avec atoi.",
      "Demander le texte, puis le parcourir lettre par lettre.",
      "Décaler les lettres en restant dans l'alphabet (après Z, on revient à A), garder la casse, laisser le reste tel quel.",
    ],
    notions: ["Les arguments de la ligne de commande : argc et argv.", "isdigit, isupper, islower.", "Le reste de la division (%) pour boucler sur 26 lettres.", "La valeur de retour de main (return 1 en cas d'erreur)."],
    pieges: ["Une grande clé (par exemple 27) qui fait sortir de l'alphabet : utilisez % 26.", "Chiffrer les espaces et la ponctuation.", "Oublier le saut de ligne final."],
    verifier: outils('caesar', 'caesar.c'),
  },
  '2-substitution': {
    enBref: "Chiffrer un message avec une clé de 26 lettres : la 1re lettre de la clé remplace A, la 2e remplace B, etc.",
    exemple: "$ ./substitution VCHPRZGJNTLSKFBDQWAXEUYMOI\nplaintext:  hello, world\nciphertext: jrssb, ybwsp",
    etapes: [
      "Vérifier la clé : 26 caractères, seulement des lettres, chacune une seule fois. Sinon, message d'erreur et return 1.",
      "Demander le texte.",
      "Pour chaque lettre, trouver sa place dans l'alphabet et la remplacer par la lettre de la clé à cette place.",
      "Garder les majuscules et les minuscules, laisser le reste tel quel.",
    ],
    notions: ["argc et argv.", "Les tableaux et la position d'une lettre : 'C' - 'A'.", "toupper et tolower."],
    pieges: ["Accepter une clé avec une lettre en double.", "Perdre la casse : un h minuscule doit donner une minuscule."],
    verifier: outils('substitution', 'substitution.c'),
  },

  // ─────────────── Semaine 3 : algorithmes ───────────────
  '3-sort': {
    enBref: "On vous donne trois programmes de tri déjà compilés, sans le code. À vous de deviner lequel utilise le tri par sélection, le tri à bulles ou le tri fusion, en mesurant leur vitesse.",
    exemple: "$ time ./sort1 reversed10000.txt",
    etapes: [
      "Lancer chaque programme sur des listes triées, aléatoires et inversées, de tailles différentes.",
      "Mesurer le temps avec time.",
      "Comparer avec ce que vous savez de chaque algorithme.",
      "Écrire vos réponses et vos raisons dans answers.txt.",
    ],
    notions: ["Tri à bulles : très rapide si la liste est déjà triée (il s'arrête tôt).", "Tri par sélection : toujours lent, même sur une liste triée.", "Tri fusion : rapide dans tous les cas.", "La notation O (grand O) et Ω (oméga)."],
    pieges: ["Tester seulement de petites listes : les différences n'apparaissent qu'avec les grandes.", "Donner une réponse sans justification."],
    verifier: outils('sort'),
  },
  '3-plurality': {
    enBref: "Programmer une élection simple : chaque électeur vote pour un candidat, celui qui a le plus de voix gagne. En cas d'égalité, on affiche tous les gagnants.",
    exemple: "$ ./plurality Alice Bob\nNumber of voters: 3\nVote: Alice\nVote: Bob\nVote: Alice\nAlice",
    etapes: [
      "Lire le code fourni : le tableau de candidats et la structure candidate.",
      "Écrire vote(name) : chercher le candidat, ajouter une voix, renvoyer true. Renvoyer false s'il n'existe pas.",
      "Écrire print_winner : trouver le plus grand nombre de voix, puis afficher tous ceux qui l'ont.",
    ],
    notions: ["Les structures (struct) et les tableaux de structures.", "strcmp pour comparer deux chaînes.", "La recherche linéaire."],
    pieges: ["Comparer des chaînes avec == au lieu de strcmp.", "Afficher un seul gagnant en cas d'égalité.", "Modifier le code fourni en dehors des deux fonctions."],
    verifier: outils('plurality', 'plurality.c'),
  },
  '3-runoff': {
    enBref: "Une élection à vote classé : chaque électeur range les candidats par préférence. Si personne n'a la majorité, on élimine le dernier et on recompte, jusqu'à avoir un gagnant.",
    etapes: [
      "vote : enregistrer le rang de chaque candidat dans le tableau preferences.",
      "tabulate : donner une voix au premier choix encore en course de chaque électeur.",
      "print_winner : s'il y a une majorité absolue, afficher le gagnant.",
      "find_min et is_tie : trouver le plus petit score et voir si tous les restants sont à égalité.",
      "eliminate : éliminer les candidats qui ont le plus petit score.",
    ],
    notions: ["Les tableaux à deux dimensions : preferences[i][j].", "Les structures avec un champ eliminated.", "Découper un gros problème en fonctions."],
    pieges: ["Dans tabulate, oublier de sauter les candidats éliminés.", "La majorité, c'est plus de la moitié, pas la moitié.", "Compter les candidats éliminés dans find_min."],
    verifier: outils('runoff', 'runoff.c'),
  },
  '3-tideman': {
    enBref: "Facultatif et très difficile. Une élection où l'on compare les candidats deux à deux, puis on les « verrouille » dans un graphe du plus fort duel au plus faible, sans jamais créer de cycle. La source du graphe gagne.",
    etapes: [
      "vote et record_preferences : remplir preferences[i][j] (combien préfèrent i à j).",
      "add_pairs : créer les duels où un candidat gagne.",
      "sort_pairs : trier les duels du plus net au moins net.",
      "lock_pairs : ajouter chaque arête au graphe, sauf si elle crée un cycle.",
      "print_winner : trouver le candidat vers lequel aucune flèche ne pointe.",
    ],
    notions: ["Les graphes représentés par une matrice (locked).", "La récursivité, très utile pour détecter un cycle.", "Les algorithmes de tri."],
    pieges: ["Détecter seulement les cycles directs (A → B → A) et rater les plus longs.", "Trier selon le mauvais critère (il faut la force de la victoire)."],
    verifier: outils('tideman', 'tideman.c'),
  },

  // ─────────────── Semaine 4 : mémoire ───────────────
  '4-volume': {
    enBref: "Changer le volume d'un fichier audio WAV : chaque échantillon est multiplié par un facteur (2.0 deux fois plus fort, 0.5 deux fois moins).",
    exemple: "$ ./volume input.wav output.wav 2.0",
    etapes: [
      "Copier tel quel l'en-tête du fichier (les 44 premiers octets).",
      "Lire les échantillons un par un (chacun fait 2 octets, type int16_t).",
      "Multiplier chaque échantillon par le facteur, puis l'écrire dans le nouveau fichier.",
    ],
    notions: ["Les fichiers : fopen, fread, fwrite, fclose.", "Les types de taille fixe : uint8_t, int16_t (stdint.h).", "Un fichier n'est qu'une suite d'octets."],
    pieges: ["Multiplier aussi l'en-tête : le fichier devient illisible.", "Lire les échantillons octet par octet au lieu de 2 octets.", "Oublier de fermer les fichiers."],
    verifier: outils('volume', 'volume.c'),
  },
  '4-filter-less': {
    enBref: "Appliquer quatre filtres à une image BMP : niveaux de gris, sépia, miroir et flou. Vous écrivez seulement les fonctions de helpers.c.",
    exemple: "$ ./filter -g images/yard.bmp out.bmp",
    etapes: [
      "grayscale : chaque pixel prend la moyenne de son rouge, vert et bleu.",
      "sepia : appliquer les formules données, sans dépasser 255.",
      "reflect : échanger les pixels de gauche et de droite sur chaque ligne.",
      "blur : chaque pixel prend la moyenne des pixels voisins (carré 3 × 3), en lisant une copie de l'image.",
    ],
    notions: ["Une image = un tableau à deux dimensions de pixels (RGBTRIPLE).", "Les structures et leurs champs (rgbtRed…).", "Arrondir avec round, limiter une valeur."],
    pieges: ["Calculer une moyenne avec des entiers : la virgule est perdue avant l'arrondi.", "Flou : modifier l'image pendant qu'on la lit. Travaillez sur une copie.", "Miroir : échanger chaque paire deux fois, ce qui annule tout."],
    verifier: outils('filter/less', 'helpers.c'),
  },
  '4-filter-more': {
    enBref: "Comme la version facile, mais le sépia est remplacé par la détection des contours (filtre de Sobel), plus mathématique.",
    exemple: "$ ./filter -e images/yard.bmp out.bmp",
    etapes: [
      "grayscale, reflect et blur, comme dans la version facile.",
      "edges : pour chaque couleur, calculer Gx et Gy avec les deux matrices données, sur les voisins 3 × 3.",
      "Combiner : racine de (Gx² + Gy²), arrondir, limiter à 255.",
      "Considérer les pixels hors de l'image comme noirs (0).",
    ],
    notions: ["Les tableaux à deux dimensions et les bords d'une image.", "sqrt et round de math.h.", "Travailler sur une copie de l'image."],
    pieges: ["Lire hors de l'image aux bords.", "Oublier de limiter à 255.", "Mélanger les trois couleurs au lieu de les traiter séparément."],
    verifier: outils('filter/more', 'helpers.c'),
  },
  '4-recover': {
    enBref: "Récupérer les photos JPEG effacées d'une carte mémoire (le fichier card.raw). Chaque photo retrouvée est enregistrée sous 000.jpg, 001.jpg, etc.",
    exemple: "$ ./recover card.raw",
    etapes: [
      "Ouvrir card.raw, et vérifier qu'il y a bien un argument.",
      "Lire la carte par blocs de 512 octets.",
      "Si un bloc commence par la signature d'un JPEG (0xff 0xd8 0xff 0xe?) : fermer la photo en cours et en ouvrir une nouvelle.",
      "Si une photo est ouverte, y écrire le bloc.",
      "À la fin, tout fermer.",
    ],
    notions: ["fread renvoie le nombre de blocs lus : c'est ainsi qu'on détecte la fin.", "Les octets (uint8_t) et les nombres hexadécimaux.", "sprintf(nom, \"%03i.jpg\", n) pour fabriquer les noms."],
    pieges: ["Le 4e octet : utilisez (buffer[3] & 0xf0) == 0xe0.", "Écrire avant d'avoir trouvé le premier JPEG.", "Oublier de fermer les fichiers : valgrind signalera des fuites."],
    verifier: outils('recover', 'recover.c'),
  },

  // ─────────────── Semaine 5 : structures de données ───────────────
  '5-inheritance': {
    enBref: "Simuler comment le groupe sanguin se transmet des grands-parents aux parents, puis à l'enfant. Chaque personne a deux allèles (A, B ou O), un reçu de chaque parent, au hasard.",
    etapes: [
      "create_family(generations) : allouer une personne avec malloc.",
      "S'il reste des générations : créer ses deux parents (récursivement), puis lui donner un allèle au hasard de chacun.",
      "Sinon (les plus anciens) : pas de parents, deux allèles tirés au hasard.",
      "free_family : libérer les parents d'abord, puis la personne.",
    ],
    notions: ["Les pointeurs et les structures (person).", "malloc et free.", "La récursivité."],
    pieges: ["Libérer la personne avant ses parents : on perd l'accès à eux.", "Oublier de mettre les parents à NULL pour la génération la plus ancienne.", "Fuites de mémoire : vérifiez avec valgrind."],
    verifier: outils('inheritance', 'inheritance.c'),
  },
  '5-speller': {
    enBref: "Écrire le correcteur orthographique le plus rapide possible : charger un dictionnaire de 140 000 mots, puis vérifier chaque mot d'un texte. Vous écrivez les fonctions de dictionary.c avec une table de hachage.",
    exemple: "$ ./speller texts/lalaland.txt",
    etapes: [
      "load : lire chaque mot du dictionnaire, créer un nœud, le ranger dans la bonne case de la table selon hash(mot).",
      "hash : transformer un mot en numéro de case (le même mot doit toujours donner le même numéro).",
      "size : renvoyer le nombre de mots chargés.",
      "check : chercher le mot dans sa case, sans tenir compte des majuscules.",
      "unload : libérer tous les nœuds.",
    ],
    notions: ["La table de hachage : un tableau de listes chaînées.", "Les nœuds (node) et les pointeurs.", "strcasecmp pour comparer sans les majuscules.", "fscanf pour lire un mot."],
    pieges: ["Une fonction hash qui ne tient pas compte des majuscules différemment dans load et check.", "Trop peu de cases : tout devient lent.", "Fuites de mémoire dans unload : valgrind est indispensable."],
    verifier: outils('speller', 'dictionary.c'),
  },

  // ─────────────── Semaine 6 : Python ───────────────
  '6-hello': {
    memeQue: { week: 1, slug: 'me' },
    enBref: "Le même programme que « Hello, It's Me » de la semaine 1, mais en Python. Comparez : c'est beaucoup plus court.",
    exemple: "$ python hello.py\nWhat is your name?\nDavid\nhello, David",
    etapes: ["Demander le nom avec input.", "L'afficher avec print, par exemple avec une f-string."],
    notions: ["Pas de compilation en Python : on lance directement python hello.py.", "input et print.", "Les f-strings : f\"hello, {name}\"."],
    pieges: ["Ajouter des points-virgules et des accolades par habitude du C : inutile."],
    verifier: outils('sentimental/hello', 'hello.py'),
  },
  '6-mario-less': {
    memeQue: { week: 1, slug: 'mario-less' },
    enBref: "La même demi-pyramide qu'en semaine 1, cette fois en Python.",
    etapes: ["Redemander la hauteur tant qu'elle n'est pas entre 1 et 8.", "Pour chaque ligne, afficher des espaces puis des #."],
    notions: ["Pas de do… while en Python : on utilise while True avec break.", "On peut multiplier une chaîne : \"#\" * 3 donne ###.", "get_int de la bibliothèque cs50, ou input avec int()."],
    pieges: ["Oublier que print va à la ligne tout seul (end=\"\" pour l'éviter).", "Le programme plante si l'utilisateur tape un mot au lieu d'un nombre."],
    verifier: outils('sentimental/mario/less', 'mario.py'),
  },
  '6-mario-more': {
    memeQue: { week: 1, slug: 'mario-more' },
    enBref: "Les deux demi-pyramides de la semaine 1, en Python.",
    etapes: ["Valider la hauteur avec while True.", "Pour chaque ligne : espaces, #, deux espaces, #."],
    notions: ["Multiplier les chaînes et les coller avec +."],
    pieges: ["Des espaces en trop à la fin des lignes."],
    verifier: outils('sentimental/mario/more', 'mario.py'),
  },
  '6-cash': {
    memeQue: { week: 1, slug: 'cash' },
    enBref: "Le rendu de monnaie de la semaine 1, en Python. Attention : cette fois, l'utilisateur tape une somme en dollars (0.41), pas en cents.",
    exemple: "$ python cash.py\nChange: 0.41\n4",
    etapes: ["Demander la somme en dollars (float positif).", "La convertir en cents, en arrondissant.", "Appliquer le même algorithme glouton."],
    notions: ["get_float, round().", "La division entière // et le reste % en Python."],
    pieges: ["Ne pas arrondir : 0.41 × 100 donne 40.99999, à cause de l'imprécision des nombres à virgule."],
    verifier: outils('sentimental/cash', 'cash.py'),
  },
  '6-credit': {
    memeQue: { week: 1, slug: 'credit' },
    enBref: "La vérification de carte bancaire de la semaine 1, en Python.",
    etapes: ["Lire le numéro.", "Appliquer l'algorithme de Luhn.", "Trouver la marque selon la longueur et les premiers chiffres."],
    notions: ["En Python, on peut traiter le numéro comme une chaîne : str(numero), numero[::-1] pour l'inverser.", "int() pour reconvertir un caractère en chiffre."],
    pieges: ["Mélanger chaînes et nombres sans conversion."],
    verifier: outils('sentimental/credit', 'credit.py'),
  },
  '6-readability': {
    memeQue: { week: 2, slug: 'readability' },
    enBref: "Le calcul du niveau de lecture de la semaine 2, en Python.",
    etapes: ["Compter lettres, mots et phrases.", "Appliquer la formule de Coleman-Liau.", "Afficher Grade X, Before Grade 1 ou Grade 16+."],
    notions: ["Parcourir une chaîne : for c in text.", "c.isalpha(), text.split().", "En Python, / donne toujours un nombre à virgule."],
    pieges: ["Oublier les cas extrêmes (moins de 1, 16 et plus)."],
    verifier: outils('sentimental/readability', 'readability.py'),
  },
  '6-dna': {
    enBref: "Identifier à qui appartient un échantillon d'ADN. On compte, dans la séquence, la plus longue répétition de chaque motif (STR, par exemple AGATC), puis on cherche la personne de la base qui a exactement ces nombres.",
    exemple: "$ python dna.py databases/small.csv sequences/1.txt\nBob",
    etapes: [
      "Vérifier les arguments de la ligne de commande (sys.argv).",
      "Lire la base CSV avec csv.DictReader.",
      "Lire la séquence d'ADN.",
      "Pour chaque motif (colonnes de la base), calculer la plus longue répétition avec la fonction longest_match fournie.",
      "Comparer avec chaque personne. Afficher son nom, ou No match.",
    ],
    notions: ["Les fichiers CSV et le module csv.", "Les listes et les dictionnaires.", "Lire et réutiliser une fonction fournie."],
    pieges: ["Comparer des nombres avec des chaînes : les valeurs du CSV sont du texte, convertissez avec int().", "Compter toutes les apparitions du motif au lieu de la plus longue suite consécutive."],
    verifier: outils('dna', 'dna.py'),
  },

  // ─────────────── Semaine 7 : SQL ───────────────
  '7-songs': {
    enBref: "Écrire 8 requêtes SQL sur une base des 100 chansons les plus écoutées d'une année, une requête par fichier (1.sql à 8.sql), puis réfléchir à l'« aura musicale » de l'auditeur dans answers.txt.",
    exemple: "$ cat 1.sql | sqlite3 songs.db",
    etapes: [
      "Explorer la base : sqlite3 songs.db, puis .schema.",
      "Pour chaque question, écrire une seule requête dans son fichier.",
      "Tester chaque fichier avec cat N.sql | sqlite3 songs.db.",
      "Répondre aux questions de réflexion dans answers.txt.",
    ],
    notions: ["SELECT, WHERE, ORDER BY, LIMIT.", "AVG et les fonctions d'agrégat.", "Les sous-requêtes ou JOIN pour relier songs et artists."],
    pieges: ["Écrire plusieurs requêtes dans un même fichier.", "Écrire en dur un identifiant (artist_id = 54) au lieu de le chercher par le nom."],
    verifier: outils('songs'),
  },
  '7-movies': {
    enBref: "Écrire 13 requêtes SQL sur une grande base de films (titres, acteurs, réalisateurs, notes), une par fichier.",
    exemple: "$ cat 1.sql | sqlite3 movies.db",
    etapes: [
      "Lire le schéma : movies, people, stars, directors, ratings.",
      "Pour chaque question, repérer les tables à relier.",
      "Construire la requête petit à petit et vérifier le nombre de lignes attendu.",
    ],
    notions: ["JOIN entre plusieurs tables.", "Les sous-requêtes (IN (SELECT …)).", "COUNT, AVG, ORDER BY … DESC."],
    pieges: ["Oublier les doublons (DISTINCT).", "Des requêtes trop lentes : préférez les JOIN bien construits."],
    verifier: outils('movies'),
  },
  '7-fiftyville': {
    enBref: "Une enquête policière en SQL : le canard de CS50 a été volé. À partir des journaux de la ville (témoignages, retraits d'argent, appels, vols d'avion), retrouvez le voleur, sa destination et son complice.",
    etapes: [
      "Commencer par le rapport de police du jour et du lieu du vol.",
      "Suivre chaque piste des témoignages : parking, distributeur, téléphone, aéroport.",
      "Croiser les listes de suspects.",
      "Garder toutes vos requêtes, avec des commentaires, dans log.sql, et vos réponses dans answers.txt.",
    ],
    notions: ["Explorer une base inconnue : .tables et .schema.", "Les JOIN et les sous-requêtes.", "Raisonner par élimination."],
    pieges: ["Deviner sans preuve : check50 vérifie seulement les réponses, mais log.sql doit montrer votre démarche."],
    verifier: outils('fiftyville'),
  },

  // ─────────────── Semaine 8 : le web ───────────────
  '8-trivia': {
    enBref: "Créer une page de quiz en HTML, CSS et JavaScript : une question à choix multiples et une question à réponse libre. La page dit tout de suite si la réponse est juste (vert, Correct!) ou fausse (rouge, Incorrect).",
    etapes: [
      "Écrire les deux questions dans index.html : au moins trois boutons de réponse (un seul juste), puis un champ texte avec un bouton de validation.",
      "En JavaScript, réagir aux clics avec addEventListener.",
      "Changer la couleur et afficher Correct! ou Incorrect.",
    ],
    notions: ["La structure d'une page HTML.", "Le CSS pour les couleurs.", "Le DOM : document.querySelector, addEventListener."],
    pieges: ["Lancer le JavaScript avant que la page soit chargée : utilisez DOMContentLoaded."],
    verifier: ["http-server pour voir la page.", "submit50 cs50/problems/2026/x/trivia"],
  },
  '8-homepage': {
    enBref: "Créer votre propre site d'au moins quatre pages, sur le sujet de votre choix (vous-même, une passion, votre ville…).",
    etapes: [
      "Choisir un sujet et prévoir 4 pages reliées entre elles.",
      "Écrire le HTML, puis le mettre en forme avec CSS et Bootstrap.",
      "Ajouter au moins une fonctionnalité en JavaScript.",
    ],
    notions: ["Au moins 4 pages HTML (dont index.html), toutes reliées entre elles, et au moins 10 balises différentes.", "Au moins une fonctionnalité de Bootstrap.", "Votre propre feuille styles.css (au moins 5 sélecteurs et 5 propriétés différentes).", "Du JavaScript qui rend le site interactif."],
    pieges: ["Oublier le fichier specification.txt, qui liste vos 10 balises, vos 5 propriétés CSS et votre usage de JavaScript et de Bootstrap.", "Utiliser un modèle tout fait : le site doit être de vous."],
    verifier: ["http-server pour voir le site.", "submit50 cs50/problems/2026/x/homepage"],
  },

  // ─────────────── Semaine 9 : Flask ───────────────
  '9-birthdays': {
    enBref: "Créer une application web avec Flask qui enregistre des anniversaires (nom, jour, mois) dans une base SQLite et les affiche dans un tableau.",
    etapes: [
      "Dans index.html, écrire le formulaire (nom, mois, jour).",
      "Dans app.py, pour une requête POST : lire le formulaire et faire un INSERT dans la base.",
      "Pour une requête GET : lire tous les anniversaires avec SELECT et les passer au modèle.",
      "Dans index.html, afficher les lignes avec une boucle Jinja.",
    ],
    notions: ["Flask : routes, request.form, render_template, redirect.", "SQL : INSERT et SELECT avec des ? (pas de texte collé dans la requête).", "Les modèles Jinja ({% for %})."],
    pieges: ["Construire la requête SQL en collant le texte de l'utilisateur : risque d'injection SQL. Utilisez toujours des ?.", "Oublier de rediriger après le POST."],
    verifier: ["flask run pour essayer l'application.", "submit50 cs50/problems/2026/x/birthdays"],
  },
  '9-finance': {
    enBref: "Créer une application web de Bourse fictive : on s'inscrit, on consulte le prix d'une action, on achète et on vend avec 10 000 dollars fictifs, et on voit son portefeuille et son historique.",
    etapes: [
      "register : créer un compte (mot de passe haché avec generate_password_hash).",
      "quote : afficher le prix d'une action avec la fonction lookup fournie.",
      "buy : vérifier le symbole, le nombre d'actions et l'argent disponible, puis enregistrer l'achat.",
      "index : afficher le portefeuille (actions, prix actuel, total, argent restant).",
      "sell, puis history : vendre et afficher toutes les opérations.",
      "Ajouter une touche personnelle (changer de mot de passe, ajouter de l'argent…).",
    ],
    notions: ["Flask avec sessions (connexion).", "Créer ses propres tables SQL (par exemple transactions).", "Valider tout ce que tape l'utilisateur.", "Les mots de passe ne sont jamais stockés en clair."],
    pieges: ["Accepter un nombre d'actions négatif, à virgule ou du texte.", "Laisser acheter sans argent suffisant.", "Construire le SQL avec du texte collé au lieu de ?."],
    verifier: outils('finance', 'app.py'),
  },
};

export const getExplication = (week: number, slug: string) => CS50_EXPLICATIONS[`${week}-${slug}`];

/** Texte simple de l'explication, pour que Socrate s'appuie sur la même explication que la page. */
export function explicationEnTexte(e: Cs50Explication): string {
  return [
    `EN BREF : ${e.enBref}`,
    e.exemple ? `EXEMPLE :\n${e.exemple}` : '',
    `ÉTAPES :\n- ${e.etapes.join('\n- ')}`,
    `NOTIONS DU COURS :\n- ${e.notions.join('\n- ')}`,
    `PIÈGES FRÉQUENTS :\n- ${e.pieges.join('\n- ')}`,
  ].filter(Boolean).join('\n\n');
}
