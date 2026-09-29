'use client';

import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';

/** Lance tout de suite la préparation automatique du contenu (même tâche que celle de chaque nuit). */
export default function PrepareContentButton() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  const run = async () => {
    setBusy(true);
    setErrors([]);
    setMsg('Préparation en cours (jusqu’à 4 minutes, gardez la page ouverte)…');
    try {
      const res = await fetch('/api/cron/weekly-content', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Erreur');
      const n = data.done?.length ?? 0;
      setErrors(Array.isArray(data.errors) ? data.errors : []);
      setMsg(
        n === 0 && !data.errors?.length
          ? 'Tout le programme est déjà prêt ✅'
          : `${n} élément(s) préparé(s)${data.errors?.length ? ` · ${data.errors.length} à réessayer` : ''}. Relancez pour continuer.`,
      );
    } catch (e: any) {
      setMsg(`Échec : ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 bg-card border border-border rounded-xl p-5">
      <div>
        <p className="font-bold text-foreground">Contenu automatique des cours</p>
        <p className="text-sm text-muted-foreground">
          Chaque nuit, résumés, séances socratiques (lun/mer/ven) et quiz sont préparés automatiquement.
          {msg && <span className="block mt-1 text-foreground">{msg}</span>}
          {errors.map((e) => (
            <span key={e} className="block text-xs text-rose-600">⚠️ {e}</span>
          ))}
        </p>
      </div>
      <button
        onClick={run}
        disabled={busy}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        Préparer maintenant
      </button>
    </div>
  );
}
