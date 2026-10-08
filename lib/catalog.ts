// Catalogue SavoirIA : parcours et formations.
// Pour ouvrir une nouvelle formation plus tard : passer `status` à 'disponible' et renseigner `href`.

export type CourseStatus = 'disponible' | 'bientot';

export interface CatalogCourse {
  slug: string;
  title: string;
  certificate: string; // organisme · certificat visé
  note: string;
  status: CourseStatus;
  href?: string;
}

export interface Track {
  id: string;
  title: string;
  subtitle: string;
  courses: CatalogCourse[];
}

export const TRACKS: Track[] = [
  {
    id: 'fondamentaux',
    title: "Fondamentaux de l'informatique",
    subtitle: 'Les bases solides pour tout métier du numérique.',
    courses: [
      { slug: 'cs50x', title: 'CS50x Francophone', certificate: 'Harvard / CS50', note: '11 semaines · tuteur Socrate · hors ligne', status: 'disponible', href: '/cs50x' },
      { slug: 'google-it-support', title: 'Support informatique', certificate: 'Google IT Support', note: '3 à 6 mois', status: 'bientot' },
      { slug: 'comptia-a-plus', title: 'CompTIA A+', certificate: 'CompTIA', note: '2 examens', status: 'bientot' },
      { slug: 'comptia-network-plus', title: 'CompTIA Network+', certificate: 'CompTIA', note: 'Réseaux', status: 'bientot' },
    ],
  },
  {
    id: 'cybersecurite',
    title: 'Cybersécurité',
    subtitle: 'Protéger les systèmes et les données.',
    courses: [
      { slug: 'google-cybersecurity', title: 'Cybersécurité', certificate: 'Google Cybersecurity', note: '3 à 6 mois', status: 'bientot' },
      { slug: 'comptia-security-plus', title: 'CompTIA Security+', certificate: 'CompTIA', note: 'Référence mondiale', status: 'bientot' },
      { slug: 'google-cloud-security', title: 'Sécurité du cloud', certificate: 'Google Cloud', note: 'Niveau avancé', status: 'bientot' },
    ],
  },
  {
    id: 'donnees-ia',
    title: 'Données et intelligence artificielle',
    subtitle: "Analyser, visualiser et utiliser l'IA au travail.",
    courses: [
      { slug: 'google-ai-essentials', title: "L'essentiel de l'IA", certificate: 'Google AI Essentials', note: 'Court', status: 'bientot' },
      { slug: 'google-data-analytics', title: 'Analyse de données', certificate: 'Google Data Analytics', note: '3 à 6 mois', status: 'bientot' },
      { slug: 'google-cloud-data', title: 'Données dans le cloud', certificate: 'Google Cloud', note: 'Intermédiaire', status: 'bientot' },
      { slug: 'power-bi', title: 'Power BI', certificate: 'Microsoft (PL-300)', note: 'Tableaux de bord', status: 'bientot' },
    ],
  },
  {
    id: 'cloud',
    title: 'Cloud',
    subtitle: 'Les plateformes qui font tourner Internet.',
    courses: [
      { slug: 'google-cloud-foundations', title: 'Fondamentaux du cloud', certificate: 'Google Cloud', note: 'Débutant', status: 'bientot' },
      { slug: 'google-cloud-leader-engineer', title: 'Cloud Digital Leader / Engineer', certificate: 'Google Cloud', note: 'Certification', status: 'bientot' },
      { slug: 'microsoft-azure', title: 'Microsoft Azure', certificate: 'Microsoft (AZ-900, AZ-104)', note: 'Débutant → admin', status: 'bientot' },
      { slug: 'aws', title: 'AWS Cloud Practitioner / Architect', certificate: 'AWS', note: 'Débutant → associé', status: 'bientot' },
    ],
  },
  {
    id: 'automatisation',
    title: 'Automatisation',
    subtitle: 'Gagner du temps avec la programmation.',
    courses: [
      { slug: 'google-it-automation', title: 'Automatisation avec Python', certificate: 'Google IT Automation', note: '3 à 6 mois', status: 'bientot' },
    ],
  },
];

export const ALL_COURSES = TRACKS.flatMap((t) => t.courses);
export const isUpcomingSlug = (slug: string) => ALL_COURSES.some((c) => c.slug === slug && c.status === 'bientot');

export const DISCLAIMER =
  "SavoirIA est un accompagnement indépendant en français. SavoirIA n'est affilié ni à l'Université Harvard, ni à Google, Microsoft, Amazon Web Services ou CompTIA ; les certificats sont délivrés par ces organismes selon leurs propres conditions et tarifs.";
