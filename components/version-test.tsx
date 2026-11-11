'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, FlaskConical } from 'lucide-react';
import { LEGAL } from '@/lib/legal';

// Texte validé par le propriétaire (2026-11-05). Ne rien promettre de plus sans son accord.

const DISPONIBLE: [string, string][] = [
  ['Le cours CS50x en français', ', de la Semaine 0 à la Semaine 10, avec la Semaine 7½ sur l’intelligence artificielle. Chaque semaine propose une vidéo en français, un résumé, le podcast du jour et des quiz.'],
  ['Les problèmes officiels de CS50', ', expliqués en français pas à pas.'],
  ['Le tuteur', ', à l’écrit (« Questions au tuteur ») et à voix haute (« Demande au prof »). Il vous guide par des questions plutôt que de vous donner la réponse.'],
  ['La formation « L’essentiel de l’IA »', '.'],
  ['Le mode hors ligne sur votre téléphone ou votre ordinateur.', ' Après votre connexion, les pages du cours et les quiz sont enregistrés sur votre appareil. Sans Internet, vous pouvez relire vos cours et faire les quiz ; vos résultats sont envoyés dès que vous retrouvez Internet. Pour emporter aussi les podcasts, utilisez le bouton de téléchargement de la semaine.'],
];

const PREVU: [string, string][] = [
  ['Le tuteur sans Internet', ' : sans connexion, il ne peut pas répondre sur votre appareil ; il note vos questions pour plus tard.'],
  ['Les vidéos et les exercices hors ligne', ' : pour l’instant, ils demandent une connexion.'],
  ['WhatsApp : chat avec le tuteur', ' : à venir.'],
  ['Les ordinateurs d’école entièrement hors ligne', ' : en phase pilote dans quelques écoles partenaires ; ils ne font pas partie de ce test en ligne.'],
  ['Le bonus Cybersécurité', ' : la vidéo est en anglais pour l’instant.'],
];

function Liste({ items }: { items: [string, string][] }) {
  return (
    <ul className="space-y-1.5 list-disc pl-5">
      {items.map(([gras, suite]) => (
        <li key={gras}><b className="text-foreground">{gras}</b>{suite}</li>
      ))}
    </ul>
  );
}

/** Le texte complet « Version de test », pour l'encadré du tableau de bord et la page /version-test. */
export function VersionTestContenu() {
  return (
    <div className="space-y-5 text-sm text-muted-foreground leading-relaxed">
      <p>
        Merci de tester SavoirIA ! Vous utilisez la <b className="text-foreground">version en ligne</b> du site.
        Pour que vous sachiez quoi tester, voici ce qui est prêt et ce qui viendra plus tard.
      </p>
      <section className="space-y-2">
        <h3 className="font-extrabold text-foreground">✅ Disponible aujourd’hui : à tester</h3>
        <Liste items={DISPONIBLE} />
      </section>
      <section className="space-y-2">
        <h3 className="font-extrabold text-foreground">🕒 Prévu, pas encore actif</h3>
        <Liste items={PREVU} />
      </section>
      <section className="space-y-2">
        <h3 className="font-extrabold text-foreground">💬 Un problème, une idée ?</h3>
        <p>
          Écrivez-nous avec le lien <a href={`mailto:${LEGAL.contactEmail}`} className="font-semibold text-primary underline">Contact</a>
          {' '}en bas de page, en précisant la page et ce que vous avez vu. Chaque retour nous aide à améliorer SavoirIA.
        </p>
      </section>
    </div>
  );
}

const CLE_REPLIE = 'savoiria-version-test-replie';

/** Encadré repliable en haut du tableau de bord des testeurs. */
export default function EncadreVersionTest() {
  const [ouvert, setOuvert] = useState(true);
  // Le choix « replié » est gardé sur l'appareil : le testeur ne revoit pas tout le texte à chaque visite.
  useEffect(() => {
    try { if (localStorage.getItem(CLE_REPLIE) === '1') setOuvert(false); } catch {} // eslint-disable-line react-hooks/set-state-in-effect
  }, []);
  const basculer = () => {
    const suivant = !ouvert;
    setOuvert(suivant);
    try { localStorage.setItem(CLE_REPLIE, suivant ? '0' : '1'); } catch {}
  };

  return (
    <div className="rounded-2xl border border-primary/25 bg-primary/5 p-4 sm:p-5">
      <button type="button" onClick={basculer} aria-expanded={ouvert}
        className="w-full flex items-center justify-between gap-3 text-left">
        <span className="flex items-center gap-2 font-extrabold text-foreground">
          <FlaskConical className="w-4 h-4 text-primary" /> Version de test : ce que vous pouvez essayer aujourd’hui
        </span>
        <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${ouvert ? 'rotate-180' : ''}`} />
      </button>
      {ouvert && (
        <div className="mt-4 space-y-3">
          <VersionTestContenu />
          <Link href="/version-test" className="inline-block text-xs font-bold text-primary underline">Ouvrir cette page à part</Link>
        </div>
      )}
    </div>
  );
}
