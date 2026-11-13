'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { toast } from 'sonner';
import { FORMATIONS_OUVERTES, libellePrix, statutInscriptionFr, titreFormation } from '@/lib/formations';
import { moyenPaiementFr, statutPaiementFr, STATUTS_PAIEMENT } from '@/lib/paiement';

interface Ligne {
  id: string; formation: string; titre: string; statut: string; studentType: string; university: string | null;
  paymentStatus: string; paymentMethod: string | null; paymentAmount: number | null; valideeLe: string | null; createdAt: string;
  user: { id: string; name: string | null; email: string; dossierNumber: string | null; status: string; accessExpiresAt: string | null };
}
interface Reglage { formation: string; titre: string; bourseUniversitaire: boolean }

const STATUTS = ['EN_ATTENTE', 'VALIDEE', 'SUSPENDUE', 'REFUSEE'] as const;
const COULEUR: Record<string, string> = {
  VALIDEE: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  EN_ATTENTE: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  SUSPENDUE: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  REFUSEE: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};
const ACTIONS: { statut: string; libelle: string }[] = [
  { statut: 'VALIDEE', libelle: 'Valider' },
  { statut: 'EN_ATTENTE', libelle: 'Remettre en attente' },
  { statut: 'SUSPENDUE', libelle: 'Suspendre' },
  { statut: 'REFUSEE', libelle: 'Refuser' },
];
const date = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { timeZone: 'UTC' });

/** Lit les inscriptions filtrées ; null (avec un message) si le chargement échoue. */
async function lireInscriptions(f: string, s: string) {
  const q = new URLSearchParams({ ...(f ? { formation: f } : {}), ...(s ? { statut: s } : {}) });
  try {
    const r = await fetch(`/api/admin/inscriptions?${q}`, { cache: 'no-store' });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { toast.error(d?.error || 'Chargement impossible.'); return null; }
    return d;
  } catch { toast.error('Pas de connexion.'); return null; }
}

export default function InscriptionsClient() {
  const [formation, setFormation] = useState('');
  const [statut, setStatut] = useState('EN_ATTENTE');
  const [lignes, setLignes] = useState<Ligne[] | null>(null);
  const [totaux, setTotaux] = useState<{ formation: string; statut: string; n: number }[]>([]);
  const [reglages, setReglages] = useState<Reglage[]>([]);
  const [occupe, setOccupe] = useState<string | null>(null);

  const afficher = useCallback((d: { inscriptions?: Ligne[]; totaux?: { formation: string; statut: string; n: number }[] } | null) => {
    if (!d) return;
    setLignes(d.inscriptions ?? []); setTotaux(d.totaux ?? []);
  }, []);
  const charger = useCallback((f: string, s: string) => lireInscriptions(f, s).then(afficher), [afficher]);
  useEffect(() => { lireInscriptions(formation, statut).then(afficher); }, [afficher, formation, statut]);
  useEffect(() => {
    fetch('/api/admin/reglages-formations', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).then((d) => d && setReglages(d.reglages ?? [])).catch(() => {});
  }, []);

  const total = (f: string, s: string) => totaux.filter((t) => (!f || t.formation === f) && (!s || t.statut === s)).reduce((a, t) => a + t.n, 0);

  const changer = async (l: Ligne, corps: Record<string, unknown>, message: string) => {
    setOccupe(l.id);
    try {
      const r = await fetch('/api/admin/inscriptions', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: l.id, ...corps }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) toast.error(d?.error || 'Modification impossible.');
      else { toast.success(d.compteActive ? `${message} Le compte de l'élève est maintenant actif.` : message); await charger(formation, statut); }
    } catch { toast.error('Pas de connexion.'); }
    setOccupe(null);
  };

  const basculerBourse = async (r: Reglage) => {
    const res = await fetch('/api/admin/reglages-formations', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ formation: r.formation, bourseUniversitaire: !r.bourseUniversitaire }) });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { toast.error(d?.error || 'Réglage non enregistré.'); return; }
    setReglages(d.reglages ?? []);
    toast.success(`Bourse universitaire ${!r.bourseUniversitaire ? 'activée' : 'désactivée'} pour « ${r.titre} ».`);
  };

  const onglet = (actif: boolean) => `rounded-full px-3 py-1.5 text-xs font-bold border transition ${actif ? 'bg-blue-600 text-white border-blue-600' : 'bg-card text-foreground border-border hover:border-blue-400'}`;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-8 space-y-6">
        <div>
          <Link href="/admin" className="text-xs text-muted-foreground hover:underline">← Administration</Link>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-foreground">Inscriptions par formation</h1>
          <p className="text-sm text-muted-foreground">Validez chaque formation séparément. Le compte d&apos;un élève devient actif dès sa première formation validée.</p>
          <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
            Suspendre ou refuser une formation ne bloque pas encore l&apos;accès au site : pour bloquer un élève, suspendez son compte dans <Link href="/admin/users" className="font-bold underline">Utilisateurs</Link>.
          </p>
        </div>

        <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-foreground">Bourse universitaire</h2>
          <p className="text-xs text-muted-foreground">Proposée à l&apos;inscription seulement pour les formations activées ici (l&apos;élève doit aussi avoir un code de convention valide).</p>
          <div className="flex flex-wrap gap-3">
            {reglages.map((r) => (
              <label key={r.formation} className="flex items-center gap-3 rounded-xl border border-border px-3 py-2 cursor-pointer">
                <input type="checkbox" role="switch" className="h-4 w-4 accent-blue-600" checked={r.bourseUniversitaire} onChange={() => basculerBourse(r)} aria-label={`Bourse universitaire pour ${r.titre}`} />
                <span className="text-sm font-semibold text-foreground">{r.titre}</span>
                <span className={`text-[11px] font-bold ${r.bourseUniversitaire ? 'text-green-700 dark:text-green-300' : 'text-muted-foreground'}`}>{r.bourseUniversitaire ? 'Activée' : 'Désactivée'}</span>
              </label>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Formation">
            <button type="button" className={onglet(formation === '')} onClick={() => setFormation('')}>Toutes ({total('', statut)})</button>
            {FORMATIONS_OUVERTES.map((f) => (
              <button key={f.id} type="button" className={onglet(formation === f.id)} onClick={() => setFormation(f.id)}>{f.titre} ({total(f.id, statut)})</button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Statut">
            <button type="button" className={onglet(statut === '')} onClick={() => setStatut('')}>Tous les statuts ({total(formation, '')})</button>
            {STATUTS.map((s) => (
              <button key={s} type="button" className={onglet(statut === s)} onClick={() => setStatut(s)}>{statutInscriptionFr(s)} ({total(formation, s)})</button>
            ))}
          </div>
        </section>

        {lignes === null ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : lignes.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Aucune inscription pour ce filtre.</p>
        ) : (
          <ul className="space-y-3">
            {lignes.map((l) => (
              <li key={l.id} className="rounded-2xl border border-border bg-card p-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-foreground">{l.user.name || l.user.email}</p>
                    <p className="text-xs text-muted-foreground break-all">{l.user.email}{l.user.dossierNumber ? ` · dossier ${l.user.dossierNumber}` : ''}</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {titreFormation(l.formation)} · {l.studentType === 'UNIVERSITAIRE' ? `Bourse universitaire${l.university ? ` (${l.university})` : ''}` : l.studentType === 'TESTEUR' ? 'Testeur' : 'Candidat libre'} · {libellePrix(l.paymentAmount)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Demandée le {date(l.createdAt)}{l.valideeLe ? ` · validée le ${date(l.valideeLe)}` : ''} · compte {l.user.status === 'ACTIVE' ? 'actif' : l.user.status === 'SUSPENDED' ? 'suspendu' : 'en attente'}
                      {l.user.accessExpiresAt ? ` · accès testeur jusqu'au ${date(l.user.accessExpiresAt)}` : ''}
                    </p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${COULEUR[l.statut] ?? 'bg-muted text-muted-foreground'}`}>{statutInscriptionFr(l.statut)}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {ACTIONS.filter((a) => a.statut !== l.statut).map((a) => (
                    <button key={a.statut} type="button" disabled={occupe === l.id}
                      onClick={() => changer(l, { statut: a.statut }, `${a.libelle} : « ${titreFormation(l.formation)} » pour ${l.user.name || l.user.email}.`)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold border disabled:opacity-50 ${a.statut === 'VALIDEE' ? 'bg-green-600 text-white border-green-600 hover:bg-green-700' : 'bg-card text-foreground border-border hover:bg-muted'}`}>
                      {a.libelle}
                    </button>
                  ))}
                  <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
                    Paiement
                    <select value={l.paymentStatus} disabled={occupe === l.id}
                      onChange={(e) => changer(l, { paymentStatus: e.target.value }, `Paiement noté « ${statutPaiementFr(e.target.value)} ».`)}
                      className="rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground">
                      {STATUTS_PAIEMENT.map((p) => <option key={p} value={p}>{statutPaiementFr(p)}</option>)}
                    </select>
                    <span>{moyenPaiementFr(l.paymentMethod)}</span>
                  </label>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
      <Footer />
    </div>
  );
}
