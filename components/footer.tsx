import Link from 'next/link';
import { Fragment } from 'react';
import { LEGAL } from '@/lib/legal';

const COURS = [
  { label: 'Le programme', href: '/cs50x' },
  { label: 'Salle de cours', href: '/tuteur' },
  { label: 'Demande au prof', href: '/agora' },
  { label: 'Salle d’étude', href: '/salle-etude' },
  { label: 'Problèmes', href: '/courses/cs50x/problemes' },
];
const INFOS = [
  { label: 'Confidentialité', href: '/confidentialite' },
  { label: 'Conditions', href: '/conditions' },
  { label: 'Contact', href: `mailto:${LEGAL.contactEmail}` },
];

const lien = 'whitespace-nowrap hover:text-foreground transition-colors';
// Points de séparation sur grand écran seulement : au téléphone, aucun « · » ne reste seul en bout de ligne.
const point = <span aria-hidden className="hidden sm:inline text-muted-foreground/50">·</span>;

/** Une ligne de liens centrée (sur plusieurs lignes au téléphone), puis © et la mention CS50. */
function Groupe({ liens }: { liens: { label: string; href: string }[] }) {
  return (
    <span className="flex flex-wrap items-center justify-center gap-x-4 sm:gap-x-2 gap-y-1.5">
      {liens.map((l, i) => (
        <Fragment key={l.href}>
          {i > 0 && point}
          {l.href.startsWith('mailto:')
            ? <a href={l.href} className={lien}>{l.label}</a>
            : <Link href={l.href} className={lien}>{l.label}</Link>}
        </Fragment>
      ))}
    </span>
  );
}

export default function Footer() {
  return (
    <footer className="border-t border-border/80 bg-card/60 backdrop-blur-sm py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center gap-3 text-center">
        <nav aria-label="Pied de page" className="flex flex-wrap items-center justify-center gap-x-4 sm:gap-x-3 gap-y-1.5 text-xs font-semibold text-muted-foreground">
          <Groupe liens={COURS} />
          <span aria-hidden className="hidden sm:inline text-muted-foreground/50">|</span>
          <Groupe liens={INFOS} />
        </nav>
        <p className="text-xs text-muted-foreground font-medium">© 2026 SavoirIA</p>
        <p className="text-[11px] text-muted-foreground max-w-xl">
          SavoirIA n&apos;est pas affilié à l&apos;Université Harvard ni à CS50, et n&apos;est pas approuvé par eux.
          CS50 est une marque de Harvard. Le certificat CS50x est délivré gratuitement par CS50.
        </p>
      </div>
    </footer>
  );
}
