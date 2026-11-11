'use client';

import { useState } from 'react';
import type { Schema } from '@/lib/approfondir/types';

/** Nombre d'éléments d'un schéma (étapes, colonnes ou liens). */
export const tailleSchema = (s: Schema) =>
  s.type === 'comparaison' ? (s.colonnes?.length ?? 0) : s.type === 'relations' ? (s.liens?.length ?? 0) : (s.etapes?.length ?? 0);

/**
 * Schéma « au tableau » : il se construit étape par étape, comme un professeur qui écrit à la craie.
 * Le parent change la « key » à chaque notion : le schéma repart alors de la première étape.
 */
export default function SchemaTableau({ schema }: { schema: Schema }) {
  const total = tailleSchema(schema);
  const [visibles, setVisibles] = useState(1);
  if (!total) return null;

  const montre = (i: number) => i < visibles;
  const anim = 'transition-all duration-500';
  const cache = 'opacity-0 translate-y-1 pointer-events-none';

  return (
    <div>
      {schema.type === 'comparaison' ? (
        <div className={`grid gap-3 ${schema.colonnes!.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
          {schema.colonnes!.map((c, i) => (
            <div key={i} className={`${anim} ${montre(i) ? '' : cache} rounded-xl border border-white/25 p-3`}>
              <p className="font-craie text-lg font-bold text-sky-200">{c.titre}</p>
              <ul className="mt-1 space-y-1 text-sm text-white/90">
                {c.points.map((p, j) => <li key={j}>• {p}</li>)}
              </ul>
            </div>
          ))}
        </div>
      ) : schema.type === 'relations' ? (
        <ul className="space-y-2">
          {schema.liens!.map((l, i) => (
            <li key={i} className={`${anim} ${montre(i) ? '' : cache} flex flex-wrap items-center gap-2 text-sm`}>
              <span className="rounded-lg border border-white/30 px-2 py-1 font-semibold">{l.de}</span>
              <span className="text-sky-200" aria-hidden>—{l.label ? ` ${l.label} ` : ''}→</span>
              {l.label && <span className="sr-only">{l.label}</span>}
              <span className="rounded-lg border border-white/30 px-2 py-1 font-semibold">{l.vers}</span>
            </li>
          ))}
        </ul>
      ) : (
        <ol className={`grid gap-2 ${schema.type === 'cycle' ? 'sm:grid-cols-2' : ''}`}>
          {schema.etapes!.map((e, i) => (
            <li key={i} className={`${anim} ${montre(i) ? '' : cache} flex gap-3 rounded-xl border border-white/20 bg-white/5 p-3`}>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-300 text-sm font-extrabold text-blue-950">{i + 1}</span>
              <div>
                <p className="font-craie text-lg font-bold leading-tight text-white">{e.titre}</p>
                {e.texte && <p className="text-sm text-white/85">{e.texte}</p>}
              </div>
            </li>
          ))}
          {schema.type === 'cycle' && visibles >= total && (
            <li className="sm:col-span-2 text-center font-craie text-sky-200">↺ … et on recommence à l'étape 1</li>
          )}
        </ol>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {visibles < total ? (
          <>
            <button type="button" onClick={() => setVisibles((v) => v + 1)}
              className="rounded-xl bg-white px-3 py-2 text-sm font-bold text-blue-950 hover:bg-sky-100">Étape suivante ({visibles}/{total})</button>
            <button type="button" onClick={() => setVisibles(total)} className="rounded-xl border border-white/40 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10">Tout afficher</button>
          </>
        ) : (
          <button type="button" onClick={() => setVisibles(1)} className="rounded-xl border border-white/40 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10">Recommencer le schéma</button>
        )}
      </div>
    </div>
  );
}
