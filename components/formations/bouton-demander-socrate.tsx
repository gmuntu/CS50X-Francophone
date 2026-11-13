'use client';

/**
 * « Demander à Socrate » : la même porte d'entrée dans chaque leçon de chaque formation.
 * Le tuteur de la page (zone repérée par id="socrate") connaît déjà la formation et la leçon ouvertes :
 * le bouton y amène l'élève et place le curseur dans la zone de question.
 */
export default function BoutonDemanderSocrate({ cible = 'socrate', className = '' }: { cible?: string; className?: string }) {
  const ouvrir = () => {
    const zone = document.getElementById(cible);
    if (!zone) return;
    zone.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const champ = zone.querySelector<HTMLInputElement | HTMLTextAreaElement>('textarea, input[type="text"], input:not([type])');
    // Après le défilement, sans faire sauter la page une seconde fois.
    window.setTimeout(() => champ?.focus({ preventScroll: true }), 400);
  };
  return (
    <button type="button" onClick={ouvrir}
      className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap bg-blue-600 text-white hover:bg-blue-700 transition ${className}`}>
      🙋🏿 Demander à Socrate
    </button>
  );
}
