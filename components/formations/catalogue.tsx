import Link from 'next/link';
import NotifyButton from '@/components/home/notify-button';
import { TRACKS, DISCLAIMER, LIBELLE_STATUT } from '@/lib/catalog';

/**
 * Catalogue des formations : une carte par formation, rangées par parcours,
 * avec le statut « Disponible » ou « Bientôt disponible ». Utilisé par la page « Formations » et par l'accueil.
 */
export default function Catalogue({ niveauTitre = 'h2' }: { niveauTitre?: 'h2' | 'h3' }) {
  const Titre = niveauTitre;
  return (
    <div>
      {TRACKS.map((track, i) => (
        <div key={track.id} className={i === 0 ? '' : 'mt-9'}>
          <div className="flex items-start gap-3 mb-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">{i + 1}</span>
            <div>
              <Titre className="text-lg sm:text-xl font-bold text-foreground">{track.title}</Titre>
              <p className="text-sm text-muted-foreground">{track.subtitle}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {track.courses.map((c) => {
              const open = c.status === 'disponible';
              return (
                <div key={c.slug} className={`flex flex-col gap-1 rounded-xl border bg-card p-4 ${open ? 'border-2 border-blue-600 shadow-md' : 'border-border'}`}>
                  <span className={`self-start rounded-full px-2 py-0.5 text-[11px] font-bold ${open ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-muted text-muted-foreground'}`}>
                    {LIBELLE_STATUT[c.status]}
                  </span>
                  <p className="mt-1 font-bold text-foreground">{c.title}</p>
                  <p className="text-xs text-muted-foreground">Prépare au certificat · {c.certificate}</p>
                  <p className="text-xs text-muted-foreground/70 mb-3">{c.note}</p>
                  {open && c.href ? (
                    <Link href={c.href} className="mt-auto rounded-lg bg-blue-600 py-2 text-center text-xs font-bold text-white hover:bg-blue-700">
                      Découvrir la formation
                    </Link>
                  ) : (
                    <NotifyButton slug={c.slug} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <p className="mt-12 text-xs text-muted-foreground">{DISCLAIMER}</p>
    </div>
  );
}
