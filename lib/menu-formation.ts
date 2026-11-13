/**
 * Menu d'une formation : construit UNE seule fois ici et réutilisé par toutes les formations,
 * dans le même ordre. Une nouvelle formation du catalogue l'a automatiquement : ses onglets sans
 * contenu mènent à une page « Bientôt disponible » (/formations/<formation>/<onglet>).
 * Fichier sans accès à la base : utilisable par le menu (navigateur) comme par le serveur.
 */
import { FORMATIONS_OUVERTES, formationOuverte } from '@/lib/formations';

export const ONGLETS = [
  { id: 'programme', libelle: '📖 Le programme' },
  { id: 'salle-de-cours', libelle: '🎓 Salle de cours' },
  { id: 'demande-au-prof', libelle: '🙋🏿 Demande au prof' },
  { id: 'salle-etude', libelle: '📚 Salle d’étude' },
  { id: 'prof-whatsapp', libelle: '💬 Prof WhatsApp' },
  { id: 'problemes', libelle: '🧩 Problèmes' },
] as const;
export type OngletId = (typeof ONGLETS)[number]['id'];

/** Pages qui existent déjà pour chaque formation. Tout le reste : « Bientôt disponible ». */
const CONTENUS: Record<string, Partial<Record<OngletId, string>>> = {
  cs50x: {
    programme: '/cs50x',
    'salle-de-cours': '/tuteur',
    'demande-au-prof': '/agora', // adresse /agora conservée : les liens existants continuent de marcher
    'salle-etude': '/salle-etude',
    problemes: '/courses/cs50x/problemes',
  },
  'ia-essentiels': {
    programme: '/formations/ia-essentiels',
    'salle-de-cours': '/formations/ia-essentiels/salle-de-cours',
    'demande-au-prof': '/formations/ia-essentiels/demande-au-prof',
  },
};

/** Anciennes adresses de CS50x, d'avant les formations multiples. */
const CHEMINS_CS50X = ['/cs50x', '/courses', '/tuteur', '/salle-etude', '/agora'];

export function ongletConnu(id: unknown): id is OngletId {
  return ONGLETS.some((o) => o.id === id);
}

/** Vrai si l'onglet a déjà sa page pour cette formation (le Prof WhatsApp a toujours sa propre page). */
export function ongletAContenu(formation: string, onglet: OngletId): boolean {
  return !!CONTENUS[formation]?.[onglet];
}

export function lienOnglet(formation: string, onglet: OngletId): string {
  return CONTENUS[formation]?.[onglet] ?? `/formations/${formation}/${onglet}`;
}

export interface OngletMenu { id: OngletId; libelle: string; href: string; bientot: boolean }

/** Menu complet d'une formation ouverte (null si la formation n'existe pas). */
export function menuFormation(formation: string, profWhatsAppActif = false): { formation: string; titre: string; onglets: OngletMenu[] } | null {
  const f = formationOuverte(formation);
  if (!f) return null;
  return {
    formation: f.id,
    titre: f.titre,
    onglets: ONGLETS.map((o) => ({
      id: o.id,
      libelle: o.libelle,
      href: lienOnglet(f.id, o.id),
      bientot: o.id === 'prof-whatsapp' ? !profWhatsAppActif : !ongletAContenu(f.id, o.id),
    })),
  };
}

const commencePar = (chemin: string, p: string) => chemin === p || chemin.startsWith(p + '/');

/** Formation ouverte correspondant à une adresse (null hors des pages d'une formation, ex. le catalogue). */
export function formationDuChemin(chemin: string | null | undefined): string | null {
  if (!chemin) return null;
  for (const f of FORMATIONS_OUVERTES) if (commencePar(chemin, `/formations/${f.id}`)) return f.id;
  if (CHEMINS_CS50X.some((p) => commencePar(chemin, p))) return 'cs50x';
  return null;
}

/** Onglet actif pour une adresse : l'onglet dont l'adresse est la plus longue à correspondre. */
export function ongletDuChemin(formation: string, chemin: string): OngletId | null {
  let meilleur: { id: OngletId; n: number } | null = null;
  for (const o of ONGLETS) {
    const href = lienOnglet(formation, o.id);
    if (commencePar(chemin, href) && (!meilleur || href.length > meilleur.n)) meilleur = { id: o.id, n: href.length };
  }
  return meilleur?.id ?? null;
}
