'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Monitor, Plus, Power, Copy } from 'lucide-react';

export type Poste = { id: string; nom: string; active: boolean; derniereSynchro: string | null; createdAt: string; institutionId: string };

const quand = (d: string | null) =>
  d ? new Date(d).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'jamais';

/** Ordinateurs SavoirIA d'un établissement : création (clé montrée une seule fois) et désactivation. */
export default function PostesEcole({ institutionId, postes, onChange }: { institutionId: string; postes: Poste[]; onChange: () => void }) {
  const [nom, setNom] = useState('');
  const [busy, setBusy] = useState(false);
  const [cle, setCle] = useState<{ nom: string; cle: string } | null>(null);

  const creer = async () => {
    setBusy(true);
    try {
      const r = await fetch('/api/admin/postes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ institutionId, nom: nom.trim() }),
      });
      const j = await r.json();
      if (!r.ok) return toast.error(j?.error || 'Erreur');
      setCle({ nom: j.poste.nom, cle: j.cle });
      setNom('');
      onChange();
    } finally {
      setBusy(false);
    }
  };

  const basculer = async (p: Poste) => {
    if (p.active && !confirm(`Désactiver « ${p.nom} » ? Il ne pourra plus échanger avec le site.`)) return;
    setBusy(true);
    try {
      const r = await fetch('/api/admin/postes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: p.id, active: !p.active }),
      });
      if (!r.ok) return toast.error('Erreur');
      toast.success(p.active ? 'Poste désactivé' : 'Poste réactivé');
      onChange();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4 border-t border-border pt-3 space-y-2">
      <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
        <Monitor className="w-4 h-4 text-primary" /> Ordinateurs d&apos;école (hors ligne)
      </p>

      {cle && (
        <div className="rounded-xl border border-amber-500/50 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm space-y-2">
          <p className="font-bold text-foreground">Clé du poste « {cle.nom} » : copiez-la maintenant, elle ne sera plus jamais affichée.</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 break-all rounded bg-muted px-2 py-1 font-mono text-xs">{cle.cle}</code>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(cle.cle).then(() => toast.success('Clé copiée'))}
              className="p-1.5 rounded hover:bg-muted"
              title="Copier"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Elle se colle sur l&apos;ordinateur pendant l&apos;installation (savoiria-local.sh). Ne l&apos;envoyez pas par un canal public.
          </p>
          <button type="button" onClick={() => setCle(null)} className="text-xs font-semibold underline">J&apos;ai copié la clé</button>
        </div>
      )}

      {postes.map((p) => (
        <div key={p.id} className={`flex flex-wrap items-center gap-2 text-sm ${p.active ? '' : 'opacity-60'}`}>
          <span className="font-medium text-foreground">{p.nom}</span>
          <span className="text-xs text-muted-foreground">
            · dernière synchronisation : {quand(p.derniereSynchro)}{p.active ? '' : ' · désactivé'}
          </span>
          <button type="button" disabled={busy} onClick={() => basculer(p)} className="p-1.5 rounded hover:bg-muted" title={p.active ? 'Désactiver' : 'Réactiver'}>
            <Power className="w-4 h-4" />
          </button>
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          placeholder="Nom du poste (ex. Salle info, PC 1)"
          maxLength={80}
          className="px-3 py-1.5 text-sm bg-background border border-border rounded-lg"
        />
        <button
          type="button"
          disabled={busy || nom.trim().length < 2}
          onClick={creer}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-border text-sm font-semibold text-muted-foreground disabled:opacity-50"
        >
          <Plus className="w-4 h-4" /> Nouvel ordinateur d&apos;école
        </button>
      </div>
    </div>
  );
}
