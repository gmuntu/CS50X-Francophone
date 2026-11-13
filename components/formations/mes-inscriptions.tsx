'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { libellePrix, statutInscriptionFr } from '@/lib/formations';

interface Inscription { formation: string; titre: string; statut: string; href: string | null; paymentAmount: number | null }
interface Disponible { id: string; titre: string; certificat: string; prixUsd: number | null }

const COULEUR: Record<string, string> = {
  VALIDEE: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  EN_ATTENTE: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  SUSPENDUE: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  REFUSEE: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
};

/** Lit les inscriptions de l'élève ; null sans Internet (la carte reste alors vide, le reste de la page fonctionne). */
async function lire() {
  try {
    const r = await fetch('/api/inscriptions', { cache: 'no-store' });
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}

/** « Mes formations » : les inscriptions de l'élève, formation par formation, et la demande d'une formation de plus. */
export default function MesInscriptions() {
  const [inscriptions, setInscriptions] = useState<Inscription[] | null>(null);
  const [disponibles, setDisponibles] = useState<Disponible[]>([]);
  const [enCours, setEnCours] = useState<string | null>(null);
  const [message, setMessage] = useState<{ texte: string; erreur: boolean } | null>(null);

  const afficher = useCallback((d: { inscriptions?: Inscription[]; disponibles?: Disponible[] } | null) => {
    if (!d) return;
    setInscriptions(d.inscriptions ?? []);
    setDisponibles(d.disponibles ?? []);
  }, []);
  const charger = useCallback(() => lire().then(afficher), [afficher]);
  useEffect(() => { lire().then(afficher); }, [afficher]);

  const demander = async (f: Disponible) => {
    setEnCours(f.id); setMessage(null);
    try {
      const r = await fetch('/api/inscriptions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ formation: f.id }) });
      const d = await r.json().catch(() => ({}));
      if (r.ok) {
        setMessage({ texte: `Demande envoyée pour « ${f.titre} ». Elle sera ouverte après validation par l'administration.`, erreur: false });
        await charger();
      } else setMessage({ texte: d?.error || 'La demande n\'a pas pu être envoyée.', erreur: true });
    } catch {
      setMessage({ texte: 'Pas de connexion : réessayez quand Internet sera revenu.', erreur: true });
    }
    setEnCours(null);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400">Mes formations</p>
        <Link href="/formations" className="text-xs font-bold text-blue-700 dark:text-blue-300 hover:underline">Voir tout le catalogue</Link>
      </div>

      {inscriptions === null ? (
        <p className="text-sm text-muted-foreground">Chargement de vos formations…</p>
      ) : inscriptions.length === 0 ? (
        <p className="text-sm text-muted-foreground">Vous n&apos;êtes inscrit à aucune formation pour le moment.</p>
      ) : (
        <ul className="space-y-2">
          {inscriptions.map((i) => (
            <li key={i.formation} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 p-3">
              <div className="min-w-0">
                <p className="font-bold text-foreground">{i.titre}</p>
                <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${COULEUR[i.statut] ?? 'bg-muted text-muted-foreground'}`}>{statutInscriptionFr(i.statut)}</span>
              </div>
              {i.statut === 'VALIDEE' && i.href ? (
                <Link href={i.href} className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700">Ouvrir</Link>
              ) : i.statut === 'EN_ATTENTE' ? (
                <span className="text-xs text-muted-foreground">L&apos;administration vous contactera.</span>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {disponibles.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-bold text-foreground">Ajouter une formation</p>
          <ul className="space-y-2">
            {disponibles.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed border-border p-3">
                <div className="min-w-0">
                  <p className="font-bold text-foreground">{f.titre}</p>
                  <p className="text-xs text-muted-foreground">Prépare au certificat {f.certificat} · {libellePrix(f.prixUsd)}</p>
                </div>
                <button type="button" onClick={() => demander(f)} disabled={enCours !== null}
                  className="rounded-lg border border-blue-600 px-4 py-2 text-xs font-bold text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 disabled:opacity-50">
                  {enCours === f.id ? 'Envoi…' : 'Demander l’inscription'}
                </button>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">Aucun paiement n&apos;est demandé maintenant : la formation s&apos;ouvre après validation par l&apos;administration.</p>
        </div>
      )}

      {message && (
        <p role="status" className={`text-sm font-semibold ${message.erreur ? 'text-rose-600' : 'text-green-700 dark:text-green-300'}`}>{message.texte}</p>
      )}
    </div>
  );
}
