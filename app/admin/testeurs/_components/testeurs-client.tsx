'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { Copy, Plus, Loader2, Users } from 'lucide-react';
import { toast } from 'sonner';

interface Code {
  id: string;
  code: string;
  label: string;
  expiresAt: string;
  maxUses: number | null;
  usedCount: number;
  active: boolean;
  users: { id: string; name: string | null; email: string; createdAt: string }[];
}

const toInputDate = (iso: string) => iso.slice(0, 10);
const fr = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

export default function TesteursClient() {
  const [codes, setCodes] = useState<Code[] | null>(null);
  const [label, setLabel] = useState('Test pilote');
  const [expiresOn, setExpiresOn] = useState(inDays(21));
  const [maxUses, setMaxUses] = useState('50');
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  const call = async (method: string, body?: unknown) => {
    setBusy(true);
    try {
      const res = await fetch('/api/admin/tester-codes', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) toast.error(data?.error ?? 'Erreur');
      else setCodes(data.codes);
      return res.ok;
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { call('GET'); }, []);

  const site = typeof window !== 'undefined' ? window.location.origin : '';
  const invite = (c: Code) =>
    `Bonjour ! Merci de tester Savoiria.\n1. Ouvrez ${site}/auth/testeur?code=${c.code}\n2. Créez votre compte (code : ${c.code})\n3. Suivez le dossier de test joint.\nVotre accès est valable jusqu'au ${fr(c.expiresAt)}.`;
  const copy = (t: string) => { navigator.clipboard?.writeText(t); toast.success('Copié'); };

  const status = (c: Code) => {
    if (new Date(c.expiresAt) <= new Date()) return { t: 'Terminé', cls: 'bg-muted text-muted-foreground' };
    if (!c.active) return { t: 'Inscriptions fermées', cls: 'bg-amber-500/10 text-amber-600' };
    if (c.maxUses != null && c.usedCount >= c.maxUses) return { t: 'Complet', cls: 'bg-amber-500/10 text-amber-600' };
    return { t: 'Actif', cls: 'bg-emerald-500/10 text-emerald-600' };
  };

  const input = 'bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground';

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Codes testeurs</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Un code donne un accès immédiat (sans validation manuelle) qui s'arrête automatiquement à la date de fin.
            Prolonger un code prolonge aussi tous les testeurs inscrits avec lui.
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <h2 className="font-extrabold text-foreground">Créer un code</h2>
          <div className="grid sm:grid-cols-4 gap-3 items-end">
            <label className="text-xs font-bold text-muted-foreground sm:col-span-2">
              Nom du groupe
              <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="ex. Étudiants Kinshasa" className={`${input} w-full mt-1`} />
            </label>
            <label className="text-xs font-bold text-muted-foreground">
              Accès jusqu'au (inclus)
              <input type="date" value={expiresOn} onChange={(e) => setExpiresOn(e.target.value)} className={`${input} w-full mt-1`} />
            </label>
            <label className="text-xs font-bold text-muted-foreground">
              Places (vide = illimité)
              <input type="number" min={1} value={maxUses} onChange={(e) => setMaxUses(e.target.value)} className={`${input} w-full mt-1`} />
            </label>
          </div>
          <button
            disabled={busy}
            onClick={() => call('POST', { label, expiresOn, maxUses: maxUses || null })}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Créer le code
          </button>
        </div>

        {codes === null ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : codes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun code pour l'instant.</p>
        ) : (
          <div className="space-y-3">
            {codes.map((c) => {
              const st = status(c);
              return (
                <div key={c.id} className="bg-card border border-border rounded-2xl p-5 space-y-3">
                  <div className="flex flex-wrap items-center gap-3 justify-between">
                    <div>
                      <p className="font-bold text-foreground">{c.label}</p>
                      <p className="font-mono text-lg tracking-wider text-primary">{c.code}</p>
                    </div>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${st.cls}`}>{st.t}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Accès jusqu'au <strong className="text-foreground">{fr(c.expiresAt)}</strong> ·{' '}
                    {c.usedCount} inscrit{c.usedCount > 1 ? 's' : ''}{c.maxUses != null ? ` sur ${c.maxUses} places` : ''}
                  </p>
                  <div className="flex flex-wrap gap-2 items-center">
                    <button onClick={() => copy(invite(c))} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-bold">
                      <Copy className="w-3.5 h-3.5" /> Copier le message d'invitation
                    </button>
                    <label className="text-xs font-bold text-muted-foreground inline-flex items-center gap-2">
                      Prolonger / modifier la fin :
                      <input
                        type="date"
                        defaultValue={toInputDate(c.expiresAt)}
                        onBlur={(e) => e.target.value && e.target.value !== toInputDate(c.expiresAt) && call('PATCH', { id: c.id, expiresOn: e.target.value })}
                        className={input}
                      />
                    </label>
                    <button disabled={busy} onClick={() => call('PATCH', { id: c.id, active: !c.active })} className="px-3 py-1.5 rounded-lg border border-border text-xs font-bold">
                      {c.active ? 'Fermer les inscriptions' : 'Rouvrir les inscriptions'}
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => confirm(`Couper maintenant l'accès des ${c.usedCount} testeur(s) de « ${c.label} » ?`) && call('PATCH', { id: c.id, endNow: true })}
                      className="px-3 py-1.5 rounded-lg border border-red-500/30 text-red-600 text-xs font-bold"
                    >
                      Terminer maintenant
                    </button>
                    <button onClick={() => setOpen(open === c.id ? null : c.id)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-primary">
                      <Users className="w-3.5 h-3.5" /> {open === c.id ? 'Masquer' : 'Voir'} les testeurs
                    </button>
                  </div>
                  {open === c.id && (
                    <ul className="text-sm divide-y divide-border border border-border rounded-xl">
                      {c.users.length === 0 && <li className="px-3 py-2 text-muted-foreground">Aucun inscrit pour l'instant.</li>}
                      {c.users.map((u) => (
                        <li key={u.id} className="px-3 py-2 flex justify-between gap-3">
                          <span className="text-foreground">{u.name}</span>
                          <span className="text-muted-foreground">{u.email}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
