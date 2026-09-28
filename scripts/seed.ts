import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const CS50_MODULES = [
  { id: 0, title: 'Semaine 0 : Introduction & Scratch', slug: 'semaine-0-introduction-scratch', description: "Introduction au cours CS50 : pensée computationnelle, binaire, algorithmes et programmation visuelle avec Scratch.", videoUrl: 'https://www.youtube.com/embed/UuIEbpQms8o', order: 0 },
  { id: 1, title: 'Semaine 1 : C', slug: 'semaine-1-c', description: "Transition vers le langage C, syntaxe de base, types de données, conditions et compilation.", videoUrl: 'https://www.youtube.com/embed/SlqjA04_dpk', order: 1 },
  { id: 2, title: 'Semaine 2 : Les Tableaux', slug: 'semaine-2-les-tableaux', description: "Exploration des tableaux, mémoire, chaînes de caractères et débogage en C.", videoUrl: 'https://www.youtube.com/embed/h5Gc1n8ZuU8', order: 2 },
  { id: 3, title: 'Semaine 3 : Les Algorithmes', slug: 'semaine-3-les-algorithmes', description: "Complexité algorithmique, recherche linéaire et binaire, tris et récursion.", videoUrl: 'https://www.youtube.com/embed/6Svu_ae5ebk', order: 3 },
  { id: 4, title: 'Semaine 4 : La Mémoire', slug: 'semaine-4-la-memoire', description: "Pointeurs, allocation dynamique, gestion de la mémoire et manipulation de fichiers.", videoUrl: 'https://www.youtube.com/embed/db0H0U13YsA', order: 4 },
  { id: 5, title: 'Semaine 5 : Les Structures de données', slug: 'semaine-5-les-structures-de-donnees', description: "Listes chaînées, arbres binaires, tables de hachage et Tries.", videoUrl: 'https://www.youtube.com/embed/PmAI76OGE_E', order: 5 },
  { id: 6, title: 'Semaine 6 : Python', slug: 'semaine-6-python', description: "Transition vers Python, typage dynamique, structures natives et projet ADN.", videoUrl: 'https://www.youtube.com/embed/Rl0ludWTLxs', order: 6 },
  { id: 7, title: 'Semaine 7 : SQL', slug: 'semaine-7-sql', description: "Bases de données relationnelles, requêtes SQL, jointures et sécurité.", videoUrl: 'https://www.youtube.com/embed/oqRU2So6Z2Y', order: 7 },
  { id: 8, title: 'Semaine 8 : HTML, CSS, JavaScript', slug: 'semaine-8-html-css-javascript', description: "Conception de pages web interactives, DOM et développement front-end.", videoUrl: 'https://www.youtube.com/embed/yYst7puZXjw', order: 8 },
  { id: 9, title: 'Semaine 9 : Flask', slug: 'semaine-9-flask', description: "Développement back-end avec Flask, routes, sessions et authentification.", videoUrl: 'https://www.youtube.com/embed/am7POvSZ4GE', order: 9 },
  { id: 10, title: 'Semaine 10 : Cybersécurité', slug: 'semaine-10-cybersecurite', description: "Sécurité informatique, cryptographie, HTTPS et bonnes pratiques.", videoUrl: 'https://www.youtube.com/embed/ApQTgFkf8TU', order: 10 },
];

const EXERCISES: { lessonId: number; title: string; description: string; instructions: string; difficulty: string }[] = [
  { lessonId: 0, title: 'Scratch : Mon premier jeu', description: 'Créer un jeu simple dans Scratch.', instructions: "Créez un programme Scratch avec au moins 2 sprites, 3 scripts et une boucle. Le programme doit être interactif (répondre aux clics ou touches clavier). Décrivez votre programme et partagez le lien.", difficulty: 'easy' },
  { lessonId: 1, title: 'Hello en C', description: 'Premier programme en langage C.', instructions: "Écrivez un programme en C qui demande le nom de l'utilisateur et affiche un message de bienvenue personnalisé. Utilisez printf et get_string (bibliothèque cs50.h).", difficulty: 'easy' },
  { lessonId: 1, title: 'Mario Pyramide', description: 'Construire une pyramide avec des #.', instructions: "Écrivez un programme en C qui demande une hauteur (1-8) et affiche une pyramide de caractères # alignée à droite.", difficulty: 'medium' },
  { lessonId: 2, title: 'Lisibilité (Readability)', description: 'Calculer l\'indice de lisibilité Coleman-Liau.', instructions: "Implémentez un programme en C qui calcule l'indice de lisibilité Coleman-Liau d'un texte donné et affiche le niveau scolaire correspondant.", difficulty: 'medium' },
  { lessonId: 3, title: 'Tri à bulles', description: 'Implémenter le tri à bulles.', instructions: "Implémentez l'algorithme de tri à bulles (bubble sort) en C. Votre programme doit trier un tableau d'entiers et afficher chaque étape du tri.", difficulty: 'medium' },
  { lessonId: 4, title: 'Filtre d\'images', description: 'Appliquer des filtres sur des images BMP.', instructions: "Implémentez les fonctions grayscale, sepia, reflect et blur pour manipuler des images BMP pixel par pixel en C.", difficulty: 'hard' },
  { lessonId: 5, title: 'Dictionnaire (Speller)', description: 'Table de hachage pour vérifier l\'orthographe.', instructions: "Implémentez un correcteur orthographique en C utilisant une table de hachage. Implémentez les fonctions load, hash, size, check et unload.", difficulty: 'hard' },
  { lessonId: 6, title: 'ADN en Python', description: 'Identifier une personne par son ADN.', instructions: "Écrivez un programme Python qui lit une séquence ADN et une base de données CSV, puis identifie à qui appartient l'ADN en comptant les STR.", difficulty: 'medium' },
  { lessonId: 7, title: 'Requêtes SQL - Films', description: 'Écrire des requêtes SQL sur une base de films.', instructions: "Écrivez 13 requêtes SQL pour interroger une base de données IMDb : titres par année, acteurs, notes, etc.", difficulty: 'medium' },
  { lessonId: 8, title: 'Page Web Personnelle', description: 'Créer un site personnel avec HTML/CSS/JS.', instructions: "Créez une page web personnelle avec au moins 3 sections, du CSS personnalisé, et au moins une fonctionnalité JavaScript interactive.", difficulty: 'easy' },
  { lessonId: 9, title: 'Finance (C$50)', description: 'Simulateur de bourse en Flask.', instructions: "Implémentez une application Flask permettant de gérer un portefeuille d'actions : inscription, achat, vente, historique. Utilisez l'API IEX pour les cours réels.", difficulty: 'hard' },
  { lessonId: 10, title: 'Projet Final', description: 'Projet libre de fin de cours.', instructions: "Concevez et implémentez un projet de votre choix utilisant les compétences acquises durant CS50. Le projet doit inclure : un README, du code source documenté, et une vidéo de démonstration de 2-3 minutes.", difficulty: 'hard' },
];

const QUIZZES = [
  {
    lessonId: 0, dayOfWeek: 'MONDAY' as const, title: 'Quiz : Bases du binaire et Scratch',
    questions: [
      { order: 0, question: 'Combien de bits y a-t-il dans un octet ?', options: ['4', '8', '16', '32'], correctOption: 'B', explanation: 'Un octet (byte) contient 8 bits.', conceptTested: 'Binaire' },
      { order: 1, question: 'Quel bloc Scratch permet de répéter une action ?', options: ['"dire"', '"répéter"', '"si"', '"quand drapeau vert"'], correctOption: 'B', explanation: 'Le bloc "répéter" crée une boucle dans Scratch.', conceptTested: 'Scratch' },
      { order: 2, question: 'Que vaut 1010 en décimal ?', options: ['8', '10', '12', '5'], correctOption: 'B', explanation: '1×8 + 0×4 + 1×2 + 0×1 = 10.', conceptTested: 'Binaire' },
    ],
  },
  {
    lessonId: 1, dayOfWeek: 'MONDAY' as const, title: 'Quiz : Fondamentaux du C',
    questions: [
      { order: 0, question: 'Quel type stocke un nombre entier en C ?', options: ['float', 'string', 'int', 'char'], correctOption: 'C', explanation: 'Le type int stocke des nombres entiers.', conceptTested: 'Types C' },
      { order: 1, question: 'Quelle commande compile un programme C ?', options: ['run', 'make', 'python', 'execute'], correctOption: 'B', explanation: 'La commande make (ou clang) compile le code C.', conceptTested: 'Compilation' },
      { order: 2, question: 'Que fait printf en C ?', options: ['Lire une entrée', 'Afficher du texte', 'Déclarer une variable', 'Créer une boucle'], correctOption: 'B', explanation: 'printf affiche du texte formaté sur la sortie standard.', conceptTested: 'Fonctions C' },
    ],
  },
  {
    lessonId: 2, dayOfWeek: 'MONDAY' as const, title: 'Quiz : Tableaux et chaînes',
    questions: [
      { order: 0, question: 'Quel est l\'index du premier élément d\'un tableau en C ?', options: ['1', '0', '-1', 'Dépend du type'], correctOption: 'B', explanation: 'Les indices commencent à 0 en C.', conceptTested: 'Tableaux' },
      { order: 1, question: 'Une chaîne en C se termine par quel caractère ?', options: ['\\n', '\\0', 'NULL', 'EOF'], correctOption: 'B', explanation: 'Les chaînes C se terminent par le caractère nul \\0.', conceptTested: 'Chaînes' },
    ],
  },
  {
    lessonId: 3, dayOfWeek: 'MONDAY' as const, title: 'Quiz : Algorithmes de tri et recherche',
    questions: [
      { order: 0, question: 'Quelle est la complexité de la recherche binaire ?', options: ['O(n)', 'O(log n)', 'O(n²)', 'O(1)'], correctOption: 'B', explanation: 'La recherche binaire divise par 2 à chaque étape → O(log n).', conceptTested: 'Big-O' },
      { order: 1, question: 'Quel tri a une complexité O(n log n) dans tous les cas ?', options: ['Bubble Sort', 'Selection Sort', 'Merge Sort', 'Insertion Sort'], correctOption: 'C', explanation: 'Le tri fusion (Merge Sort) garantit O(n log n).', conceptTested: 'Tri' },
    ],
  },
  {
    lessonId: 4, dayOfWeek: 'MONDAY' as const, title: 'Quiz : Pointeurs et mémoire',
    questions: [
      { order: 0, question: 'Que retourne malloc ?', options: ['Un entier', 'Un pointeur', 'Une chaîne', 'Un booléen'], correctOption: 'B', explanation: 'malloc retourne un pointeur vers la mémoire allouée.', conceptTested: 'malloc' },
      { order: 1, question: 'Quel outil détecte les fuites mémoire ?', options: ['gdb', 'Valgrind', 'printf', 'make'], correctOption: 'B', explanation: 'Valgrind détecte les fuites et erreurs mémoire.', conceptTested: 'Valgrind' },
    ],
  },
  {
    lessonId: 5, dayOfWeek: 'MONDAY' as const, title: 'Quiz : Structures de données',
    questions: [
      { order: 0, question: 'Quelle structure offre un accès O(1) en moyenne ?', options: ['Liste chaînée', 'Arbre binaire', 'Table de hachage', 'Tableau trié'], correctOption: 'C', explanation: 'Les tables de hachage offrent un accès moyen en O(1).', conceptTested: 'Hash Tables' },
      { order: 1, question: 'Dans une liste chaînée, comment accède-t-on au 5e élément ?', options: ['index[4]', 'Parcours séquentiel', 'Recherche binaire', 'Accès direct'], correctOption: 'B', explanation: 'Il faut parcourir la liste nœud par nœud.', conceptTested: 'Listes' },
    ],
  },
  {
    lessonId: 6, dayOfWeek: 'MONDAY' as const, title: 'Quiz : Python fondamental',
    questions: [
      { order: 0, question: 'Python est un langage à typage...', options: ['Statique', 'Dynamique', 'Manuel', 'Binaire'], correctOption: 'B', explanation: 'Python utilise le typage dynamique.', conceptTested: 'Python' },
      { order: 1, question: 'Comment créer un dictionnaire en Python ?', options: ['[]', '()', '{}', '<>'], correctOption: 'C', explanation: 'Les accolades {} créent un dictionnaire.', conceptTested: 'Dictionnaires' },
    ],
  },
];

async function main() {
  console.log('🌱 Début du seed...');

  // --- Super Admin : identifiants lus dans l'environnement, jamais dans le code ---
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminEmail && adminPassword && adminPassword.length >= 14) {
    const hashed = await bcrypt.hash(adminPassword, 12);
    await prisma.user.upsert({
      where: { email: adminEmail },
      update: { password: hashed, role: 'ADMIN', status: 'ACTIVE' },
      create: { email: adminEmail, name: 'Administrateur', password: hashed, role: 'ADMIN', status: 'ACTIVE' },
    });
    console.log('✅ Compte administrateur prêt :', adminEmail);
  } else {
    console.log('ℹ️  ADMIN_EMAIL / ADMIN_PASSWORD (14 caractères min.) absents : aucun admin créé.');
  }

  // --- Course ---
  const course = await prisma.course.upsert({
    where: { slug: 'cs50x-francophone' },
    update: { title: 'CS50X Francophone', isPublished: true },
    create: {
      title: 'CS50X Francophone',
      slug: 'cs50x-francophone',
      description: "Le cours d'introduction à l'informatique CS50, avec certificat reconnu par Harvard. Entièrement en français.",
      isPublished: true,
      order: 0,
    },
  });
  console.log('✅ Course seeded:', course.id);

  // --- Lessons ---
  for (const mod of CS50_MODULES) {
    await prisma.lesson.upsert({
      where: { id: mod.id },
      update: { title: mod.title, description: mod.description, videoUrl: mod.videoUrl, order: mod.order, isPublished: true },
      create: {
        id: mod.id,
        courseId: course.id,
        title: mod.title,
        slug: mod.slug,
        description: mod.description,
        videoUrl: mod.videoUrl,
        order: mod.order,
        isPublished: true,
      },
    });
  }
  console.log('✅ 11 lessons seeded');

  // --- Exercises ---
  for (const ex of EXERCISES) {
    const existing = await prisma.exercise.findFirst({
      where: { lessonId: ex.lessonId, title: ex.title },
    });
    if (!existing) {
      await prisma.exercise.create({
        data: {
          lessonId: ex.lessonId,
          title: ex.title,
          description: ex.description,
          instructions: ex.instructions,
          difficulty: ex.difficulty,
          order: 0,
        },
      });
    }
  }
  console.log('✅ Exercises seeded');

  // --- Quizzes ---
  for (const q of QUIZZES) {
    const existing = await prisma.quiz.findUnique({
      where: { lessonId_dayOfWeek: { lessonId: q.lessonId, dayOfWeek: q.dayOfWeek } },
    });
    if (!existing) {
      await prisma.quiz.create({
        data: {
          lessonId: q.lessonId,
          dayOfWeek: q.dayOfWeek,
          title: q.title,
          questions: {
            create: q.questions.map((qu) => ({
              order: qu.order,
              question: qu.question,
              options: qu.options,
              correctOption: qu.correctOption,
              explanation: qu.explanation,
              conceptTested: qu.conceptTested,
            })),
          },
        },
      });
    }
  }
  console.log('✅ Quizzes seeded');

  console.log('🎉 Seed terminé avec succès !');
}

main()
  .catch((e) => { console.error('❌ Seed error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
