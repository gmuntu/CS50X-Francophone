'use client';

import type { Notion } from '@/lib/approfondir/types';

/**
 * Infographie d'une notion, dessinée à partir des données préparées (aucun modèle d'image) :
 * elle s'affiche à l'identique avec ou sans Internet. Imprimable.
 */
export default function Infographie({ notion, source, onFermer }: { notion: Notion; source?: string; onFermer: () => void }) {
  const info = notion.infographie ?? {
    titre: notion.titre,
    points: (notion.schema.etapes ?? []).map((e, i) => ({ icone: `${i + 1}.`, texte: e.texte ? `${e.titre} : ${e.texte}` : e.titre })),
  };
  return (
    <div role="dialog" aria-modal="true" aria-label={`Infographie : ${info.titre}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onFermer}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-card p-6 shadow-2xl print:shadow-none" onClick={(e) => e.stopPropagation()}>
        <p className="text-xs font-extrabold uppercase tracking-wide text-primary">Infographie</p>
        <h3 className="mt-1 font-craie text-2xl font-bold text-foreground">{info.titre}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{notion.resume}</p>
        <ul className="mt-4 space-y-3">
          {info.points.map((p, i) => (
            <li key={i} className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-lg" aria-hidden>{p.icone}</span>
              <span className="text-sm text-foreground">{p.texte}</span>
            </li>
          ))}
        </ul>
        {source && <p className="mt-4 text-[11px] text-muted-foreground">Source : {source}{notion.page ? ` · ${notion.page}` : ''}</p>}
        <div className="mt-4 flex justify-end gap-2 print:hidden">
          <button type="button" onClick={() => window.print()} className="rounded-xl border border-border px-3 py-2 text-sm font-semibold hover:bg-muted">Imprimer</button>
          <button type="button" onClick={onFermer} className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90">Fermer</button>
        </div>
      </div>
    </div>
  );
}
