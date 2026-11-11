'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import SalleApprofondir from '@/components/approfondir/salle-approfondir';
import type { ContenuApprofondir } from '@/lib/approfondir/types';

export type SemaineEtude = { id: number; libelle: string; titre: string; contenu: ContenuApprofondir | null };

export default function SalleEtudeClient({ semaines }: { semaines: SemaineEtude[] }) {
  const demande = Number(useSearchParams().get('semaine'));
  const [id, setId] = useState(semaines.some((s) => s.id === demande) ? demande : semaines[0]?.id ?? 0);
  const semaine = semaines.find((s) => s.id === id) ?? semaines[0];

  // Changer de semaine sans recharger la page : marche aussi sans Internet.
  const choisir = (nouveau: number) => {
    setId(nouveau);
    try { window.history.replaceState(null, '', `/salle-etude?semaine=${nouveau}`); } catch {}
  };

  return (
    <>
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground">📚 Salle d’étude</h1>
          <p className="text-sm sm:text-base font-semibold text-primary">Approfondir le sujet</p>
        </div>
        <label className="flex flex-col gap-1 text-xs font-bold text-muted-foreground">
          Semaine
          <select value={id} onChange={(e) => choisir(Number(e.target.value))}
            className="min-w-[16rem] rounded-xl border border-input bg-card px-3 py-2.5 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
            {semaines.map((s) => <option key={s.id} value={s.id}>{s.libelle} : {s.titre}</option>)}
          </select>
        </label>
      </header>
      <div className="mt-5">
        {semaine && <SalleApprofondir key={semaine.id} moduleId={semaine.id} prepare={semaine.contenu} />}
      </div>
    </>
  );
}
