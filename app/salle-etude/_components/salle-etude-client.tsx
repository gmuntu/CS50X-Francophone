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
      <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
        <label htmlFor="choix-semaine" className="text-sm font-bold text-muted-foreground">Semaine</label>
        <select id="choix-semaine" value={id} onChange={(e) => choisir(Number(e.target.value))}
          className="min-w-[16rem] rounded-xl border border-input bg-card px-3 py-2 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
          {semaines.map((s) => <option key={s.id} value={s.id}>{s.libelle} : {s.titre}</option>)}
        </select>
      </div>
      {semaine && <SalleApprofondir key={semaine.id} moduleId={semaine.id} prepare={semaine.contenu} libelleSemaine={semaine.libelle} />}
    </>
  );
}
