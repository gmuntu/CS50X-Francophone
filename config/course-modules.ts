export interface CourseModuleConfig {
  /** Numéro de la leçon en base (adresse /courses/cs50x/lessons/<id>). L'ordre d'affichage est celui du tableau. */
  id: number;
  /** Numéro affiché (« 7½ ») quand il diffère de id ; absent pour un bonus. */
  numero?: string;
  /** Leçon hors programme officiel CS50x (pas de problème à rendre). */
  bonus?: boolean;
  title: string;
  slug: string;
  description: string;
  videoUrl?: string;
  /** Version doublée en français (YouTube, non répertoriée). */
  videoUrlFr?: string;
  /** Podcast de la semaine (MP3 dans public/podcasts). Aucun pour l'instant : les anciens fichiers étaient vides. */
  podcastUrl?: string;
  difficulty: 'Débutant' | 'Intermédiaire' | 'Avancé';
  topics: string[];
  imageUrl: string;
}

export const CS50_MODULES: CourseModuleConfig[] = [
  {
    id: 0,
    title: 'Semaine 0 : Introduction & Scratch',
    slug: 'semaine-0-introduction-scratch',
    description: "Introduction au cours CS50 : pensée computationnelle, binaire, algorithmes et programmation visuelle avec Scratch.",
    videoUrl: 'https://www.youtube.com/embed/UuIEbpQms8o',
    videoUrlFr: 'https://www.youtube.com/embed/AsNlqXLJC3E',
    difficulty: 'Débutant',
    topics: ['Binaire', 'Scratch', 'Algorithmes'],
    imageUrl: 'https://cdn.abacus.ai/images/4c6ab7f0-b37e-4691-96a7-bc8fa0be1bed.png',
  },
  {
    id: 1,
    title: 'Semaine 1 : C',
    slug: 'semaine-1-c',
    description: "Transition vers le langage C, syntaxe de base, types de données, conditions et compilation.",
    videoUrl: 'https://www.youtube.com/embed/SlqjA04_dpk',
    videoUrlFr: 'https://www.youtube.com/embed/NsH8PY_WoT8',
    difficulty: 'Débutant',
    topics: ['Langage C', 'Compilation', 'Variables'],
    imageUrl: 'https://i.ytimg.com/vi/rjYN_eW-u6A/maxresdefault.jpg',
  },
  {
    id: 2,
    title: 'Semaine 2 : Les Tableaux',
    slug: 'semaine-2-les-tableaux',
    description: "Exploration des tableaux, mémoire, chaînes de caractères et débogage en C.",
    videoUrl: 'https://www.youtube.com/embed/h5Gc1n8ZuU8',
    videoUrlFr: 'https://www.youtube.com/embed/Ts_r8AK19QU',
    difficulty: 'Intermédiaire',
    topics: ['Tableaux', 'Chaînes', 'Débogage'],
    imageUrl: 'https://ik.imagekit.io/pieces/images/blog/an-overview-of-arrays-as-data-structures-in-java/hero.jpeg?tr=w-1520,f-auto',
  },
  {
    id: 3,
    title: 'Semaine 3 : Les Algorithmes',
    slug: 'semaine-3-les-algorithmes',
    description: "Complexité algorithmique, recherche linéaire et binaire, tris et récursion.",
    videoUrl: 'https://www.youtube.com/embed/6Svu_ae5ebk',
    videoUrlFr: 'https://www.youtube.com/embed/Z26bcyDI4-U',
    difficulty: 'Intermédiaire',
    topics: ['Big-O', 'Tri', 'Récursion'],
    imageUrl: 'https://i.ytimg.com/vi/0jcYxfDp0v0/maxresdefault.jpg',
  },
  {
    id: 4,
    title: 'Semaine 4 : La Mémoire',
    slug: 'semaine-4-la-memoire',
    description: "Pointeurs, allocation dynamique, gestion de la mémoire et manipulation de fichiers.",
    videoUrl: 'https://www.youtube.com/embed/db0H0U13YsA',
    videoUrlFr: 'https://www.youtube.com/embed/svmsj_bjSYA',
    difficulty: 'Avancé',
    topics: ['Pointeurs', 'malloc', 'Valgrind'],
    imageUrl: 'https://ilnumerics.net/media/VS_dark_debug_AVx4_3D_red.png',
  },
  {
    id: 5,
    title: 'Semaine 5 : Les Structures de données',
    slug: 'semaine-5-les-structures-de-donnees',
    description: "Listes chaînées, arbres binaires, tables de hachage et Tries.",
    videoUrl: 'https://www.youtube.com/embed/PmAI76OGE_E',
    videoUrlFr: 'https://www.youtube.com/embed/lfolfGtrK2A',
    difficulty: 'Avancé',
    topics: ['Listes', 'Hash Tables', 'Tries'],
    imageUrl: 'https://i.ytimg.com/vi/J2fol8eWo64/maxresdefault.jpg',
  },
  {
    id: 6,
    title: 'Semaine 6 : Python',
    slug: 'semaine-6-python',
    description: "Transition vers Python, typage dynamique, structures natives et projet ADN.",
    videoUrl: 'https://www.youtube.com/embed/Rl0ludWTLxs',
    videoUrlFr: 'https://www.youtube.com/embed/fGBJsvNTkVw',
    difficulty: 'Intermédiaire',
    topics: ['Python', 'Listes', 'Dictionnaires'],
    imageUrl: 'https://cdn.pixabay.com/photo/2020/01/22/12/33/python-4785225_1280.jpg',
  },
  {
    id: 7,
    title: 'Semaine 7 : SQL',
    slug: 'semaine-7-sql',
    description: "Bases de données relationnelles, requêtes SQL, jointures et sécurité.",
    videoUrl: 'https://www.youtube.com/embed/oqRU2So6Z2Y',
    videoUrlFr: 'https://www.youtube.com/embed/2soubRuIBxA',
    difficulty: 'Intermédiaire',
    topics: ['SQL', 'Jointures', 'Index'],
    imageUrl: 'https://tableplus.com/assets/images/sequel-pro-dark-theme/table-data.png',
  },
  {
    id: 11,
    numero: '7½',
    title: 'Semaine 7½ : Intelligence artificielle',
    slug: 'semaine-7-5-intelligence-artificielle',
    description: "La leçon « Artificial Intelligence » de CS50x, entre SQL et le Web : IA générative, prompts, arbres de décision, minimax, apprentissage automatique, réseaux de neurones et grands modèles de langage.",
    videoUrl: 'https://www.youtube.com/embed/-9bo8HlSxwQ',
    videoUrlFr: 'https://www.youtube.com/embed/19AChNQDZNM',
    difficulty: 'Intermédiaire',
    topics: ['IA générative', 'Apprentissage automatique', 'Grands modèles de langage'],
    imageUrl: 'https://i.ytimg.com/vi/-9bo8HlSxwQ/maxresdefault.jpg',
  },
  {
    id: 8,
    title: 'Semaine 8 : HTML, CSS, JavaScript',
    slug: 'semaine-8-html-css-javascript',
    description: "Conception de pages web interactives, DOM et développement front-end.",
    videoUrl: 'https://www.youtube.com/embed/yYst7puZXjw',
    videoUrlFr: 'https://www.youtube.com/embed/LcxuRVBNRn8',
    difficulty: 'Intermédiaire',
    topics: ['HTML', 'CSS', 'JavaScript'],
    imageUrl: 'https://i.ytimg.com/vi/coVtdZRoAFc/maxresdefault.jpg',
  },
  {
    id: 9,
    title: 'Semaine 9 : Flask',
    slug: 'semaine-9-flask',
    description: "Développement back-end avec Flask, routes, sessions et authentification.",
    videoUrl: 'https://www.youtube.com/embed/am7POvSZ4GE',
    videoUrlFr: 'https://www.youtube.com/embed/dFDuy7QFFuA',
    difficulty: 'Avancé',
    topics: ['Flask', 'Sessions', 'Jinja2'],
    imageUrl: 'https://i.ytimg.com/vi/Aa-F6zqLmig/maxresdefault.jpg',
  },
  {
    id: 10,
    title: 'Semaine 10 : La fin',
    slug: 'semaine-10-la-fin',
    description: "Dernière leçon de CS50x (« The End ») : bilan des dix semaines, ce que vous savez faire désormais, le projet final et la suite de votre parcours.",
    videoUrl: 'https://www.youtube.com/embed/ApQTgFkf8TU',
    videoUrlFr: 'https://www.youtube.com/embed/6yqW-SvyirU',
    difficulty: 'Avancé',
    topics: ['Bilan', 'Projet final', 'Et après ?'],
    imageUrl: 'https://i.ytimg.com/vi/ApQTgFkf8TU/maxresdefault.jpg',
  },
  {
    id: 12,
    bonus: true,
    title: 'Bonus : Cybersécurité',
    slug: 'bonus-cybersecurite',
    description: "Leçon bonus, hors programme officiel CS50x : sécurité informatique, cryptographie, HTTPS et bonnes pratiques.",
    // Conférence officielle « CS50x 2024 - Cybersecurity » (anglais) et sa version française Moon2⁺Studio.
    videoUrl: 'https://www.youtube.com/embed/EKof-cJiTG8',
    videoUrlFr: 'https://www.youtube.com/embed/1wB_pR81S8w',
    difficulty: 'Avancé',
    topics: ['Sécurité', 'Cryptographie', 'HTTPS'],
    imageUrl: 'https://images.stockcake.com/public/b/c/3/bc366a2d-6aed-4bc5-98fa-cbce2a9d9a5e/digital-security-shield-stockcake.jpg',
  },
];

/** Numéro affiché d'une leçon : « 7½ », « 3 »… (null pour un bonus). */
export const numeroModule = (m: Pick<CourseModuleConfig, 'id' | 'numero' | 'bonus'>) => (m.bonus ? null : m.numero ?? String(m.id));

/** Leçons du programme officiel CS50x (sans les bonus). */
export const CS50_PROGRAMME = CS50_MODULES.filter((m) => !m.bonus);
