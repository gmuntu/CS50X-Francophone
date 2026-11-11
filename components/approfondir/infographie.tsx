'use client';

import { Printer, X } from 'lucide-react';
import type { Notion } from '@/lib/approfondir/types';
import { vueTableau } from '@/lib/approfondir/tableau';
import { AMBRE, BLEU, ENCRE } from './schema-tableau';

/**
 * Infographie d'une notion : une affiche composée par le site à partir des données préparées
 * (aucun modèle d'image) : identique avec ou sans Internet, à imprimer ou à enregistrer en PDF.
 */
export default function Infographie({ notion, sujet, source, onFermer }: { notion: Notion; sujet: string; source?: string; onFermer: () => void }) {
  const vue = vueTableau(notion);
  const comparaison = vue.type === 'comparaison';
  const libelle = { cycle: 'Un cycle', etapes: 'Étape par étape', comparaison: 'Côte à côte', relations: 'Les liens entre les idées' }[vue.type];
  const aRetenir = notion.infographie?.points ?? [];
  const passage = notion.passages?.[0];
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4" onClick={onFermer}>
      <div className="my-4 w-full max-w-2xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={`Infographie : ${notion.titre}`}>
        <div className="mb-3 flex justify-end gap-2 print:hidden">
          <button type="button" onClick={() => window.print()} className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold hover:brightness-105" style={{ background: BLEU, color: ENCRE }}>
            <Printer className="h-4 w-4" /> Imprimer ou enregistrer en PDF
          </button>
          <button type="button" onClick={onFermer} aria-label="Fermer" className="rounded-full bg-white/15 p-2 text-white hover:bg-white/25">
            <X className="h-5 w-5" />
          </button>
        </div>
        <article className="classe-infographie overflow-hidden rounded-2xl bg-[#fbf5e3] text-[#2b2a26] shadow-2xl">
          <header className="bg-[#14244f] px-8 py-7 text-[#f4f1e8]">
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: BLEU }}>{sujet}</p>
            <h2 className="mt-1 font-craie text-5xl leading-none">{notion.titre}</h2>
            <p className="mt-3 text-base leading-snug text-white/90">{notion.resume}</p>
          </header>
          <div className="space-y-6 px-8 py-7">
            <section>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-[#1e3a8a]">{libelle}</h3>
              {comparaison ? (
                <table className="w-full border-separate border-spacing-y-1.5 text-sm">
                  <thead>
                    <tr>
                      <th />
                      {(vue.colonnes ?? []).map((c, k) => (
                        <th key={k} className="rounded-t-lg px-3 py-2 text-left text-base font-extrabold" style={{ background: k % 2 ? AMBRE : BLEU }}>{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {vue.etapes.map((e, i) => (
                      <tr key={i}>
                        <td className="py-2 pr-3 font-semibold">{e.label || i + 1}</td>
                        {(e.valeurs ?? []).map((v, k) => (
                          <td key={k} className="px-3 py-2" style={{ background: k % 2 ? '#fbbf2433' : '#93c5fd40' }}>{v}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <ol className="space-y-3">
                  {vue.etapes.map((e, i) => (
                    <li key={i} className="flex gap-4">
                      <span className="flex flex-col items-center">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base font-extrabold" style={{ background: i % 2 ? AMBRE : BLEU, color: ENCRE }}>{i + 1}</span>
                        {i < vue.etapes.length - 1 && <span className="mt-1 w-0.5 flex-1 bg-[#1e3a8a]/25" />}
                      </span>
                      <span className="pb-1">
                        <span className="block text-base font-extrabold leading-tight">
                          {vue.type === 'relations' && e.lien ? <span className="font-normal italic text-[#1e3a8a]">{vue.centre} {e.lien} → </span> : null}
                          {e.label}
                        </span>
                        <span className="block text-sm leading-snug text-[#4a483f]">{e.detail}</span>
                      </span>
                    </li>
                  ))}
                  {vue.type === 'cycle' && <li className="pl-[52px] text-sm italic text-[#1e3a8a]">↻ … puis le cycle recommence.</li>}
                </ol>
              )}
            </section>
            <div className="grid gap-4 sm:grid-cols-2">
              {aRetenir.length > 0 && (
                <section className="rounded-xl border-2 p-4" style={{ borderColor: BLEU, background: '#93c5fd33' }}>
                  <h3 className="mb-1 text-xs font-bold uppercase tracking-widest text-[#1e3a8a]">À retenir</h3>
                  <ul className="space-y-1 text-sm font-semibold leading-snug">
                    {aRetenir.map((p, i) => <li key={i}>{p.icone} {p.texte}</li>)}
                  </ul>
                </section>
              )}
              {passage && (
                <section className="rounded-xl border-2 p-4" style={{ borderColor: AMBRE, background: '#fbbf2426' }}>
                  <h3 className="mb-1 text-xs font-bold uppercase tracking-widest text-[#92400e]">Ce que dit le document</h3>
                  <p className="text-sm leading-snug">« {passage.texte} » <span className="text-xs text-[#6b6857]">({passage.page})</span></p>
                </section>
              )}
            </div>
          </div>
          <footer className="border-t border-[#1e3a8a]/15 px-8 py-3 text-xs text-[#6b6857]">
            Source : {source ?? sujet}{notion.page ? ` · ${notion.page}` : ''} · Salle d’étude SavoirIA
          </footer>
        </article>
      </div>
    </div>
  );
}
