'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { WifiOff, Wifi, RefreshCw, GraduationCap, Mic, BookOpen, HardDrive, Pause, Play, CheckCircle2, Clock } from 'lucide-react';
import { type SavedLesson } from '@/lib/offline';
import { pendingCount, SYNC_EVENT } from '@/lib/sync-queue';
import { socrateLocalDisponible } from '@/lib/socrate-local';
import {
  synchroniser, mettreEnPause, etatSync, contenusEnregistres, espaceStockage,
  EVT_SYNC, FORMATIONS, type EtatSync,
} from '@/lib/auto-sync';

const NB_SEMAINES: Record<string, number> = { cs50x: 11, 'ia-essentiels': 8 };

function depuis(iso?: string) {
  if (!iso) return 'jamais';
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 2) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const j = Math.round(h / 24);
  return `il y a ${j} jour${j > 1 ? 's' : ''}`;
}
const go = (o: number) => `${(o / 1073741824).toFixed(1).replace('.', ',')} Go`;

export default function HorsLignePage() {
  const { data: session } = useSession();
  const prenom = (session?.user as any)?.firstName || session?.user?.name?.split(' ')[0] || '';
  const [enLigne, setEnLigne] = useState(true);
  const [sync, setSync] = useState<EtatSync>({ enCours: false, enPause: false, etape: '', fait: 0, total: 0 });
  const [contenus, setContenus] = useState<Record<string, SavedLesson[]>>({});
  const [attente, setAttente] = useState(0);
  const [socrate, setSocrate] = useState<boolean | null>(null);
  const [espace, setEspace] = useState<{ utilise: number; total: number } | null>(null);

  const rafraichir = () => {
    setEnLigne(navigator.onLine);
    setSync(etatSync());
    setAttente(pendingCount());
    contenusEnregistres().then(setContenus).catch(() => {});
    espaceStockage().then(setEspace);
  };

  useEffect(() => {
    rafraichir();
    socrateLocalDisponible().then(setSocrate);
    const surSync = (e: Event) => { setSync({ ...etatSync(), ...(e as CustomEvent).detail }); contenusEnregistres().then(setContenus).catch(() => {}); espaceStockage().then(setEspace); };
    window.addEventListener(EVT_SYNC, surSync);
    window.addEventListener(SYNC_EVENT, rafraichir);
    window.addEventListener('online', rafraichir);
    window.addEventListener('offline', rafraichir);
    return () => {
      window.removeEventListener(EVT_SYNC, surSync);
      window.removeEventListener(SYNC_EVENT, rafraichir);
      window.removeEventListener('online', rafraichir);
      window.removeEventListener('offline', rafraichir);
    };
  }, []);

  const toutes = [...(contenus.cs50x ?? []), ...(contenus['ia-essentiels'] ?? [])];
  const reprendre = [...toutes].sort((a, b) => b.savedAt.localeCompare(a.savedAt))[0];
  const pct = sync.total ? Math.round((sync.fait / sync.total) * 100) : 0;

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto w-full max-w-2xl space-y-4">
        {/* En-tête */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold text-foreground">SavoirIA hors ligne</h1>
          {enLigne ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800"><Wifi className="w-3.5 h-3.5" /> Connecté</span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800"><WifiOff className="w-3.5 h-3.5" /> Hors ligne</span>
          )}
        </div>

        <section className="rounded-2xl border border-border bg-card p-4">
          <p className="font-extrabold text-foreground">Bonjour{prenom ? ` ${prenom}` : ''} 👋</p>
          <p className="text-sm text-muted-foreground mt-1">
            {enLigne
              ? 'Tes cours se mettent à jour tout seuls. Tu pourras ensuite apprendre sans Internet.'
              : 'Tout fonctionne sans Internet. Ta progression est gardée sur cet appareil.'}
          </p>
        </section>

        {/* Reprendre */}
        {reprendre && (
          <a href={reprendre.path} className="block rounded-2xl border border-border bg-card p-4 hover:border-primary/40">
            <p className="font-extrabold text-foreground">▶ Continuer : {reprendre.id >= 1000 ? reprendre.title : `Semaine ${reprendre.id} · ${reprendre.title}`}</p>
            <p className="text-sm text-muted-foreground mt-1">Ouvre la salle de cours là où tu t&apos;étais arrêté.</p>
          </a>
        )}

        {/* Raccourcis (liens classiques : le service worker sert les pages enregistrées) */}
        <div className="grid grid-cols-3 gap-2">
          <a href={reprendre?.path ?? '/tuteur'} className="rounded-2xl border border-border bg-card p-3 text-center text-sm font-bold hover:border-primary/40"><GraduationCap className="mx-auto mb-1 w-5 h-5 text-primary" />Salle de cours</a>
          <a href="/agora" className="rounded-2xl border border-border bg-card p-3 text-center text-sm font-bold hover:border-primary/40"><Mic className="mx-auto mb-1 w-5 h-5 text-primary" />Parler à Socrate</a>
          <a href="/formations" className="rounded-2xl border border-border bg-card p-3 text-center text-sm font-bold hover:border-primary/40"><BookOpen className="mx-auto mb-1 w-5 h-5 text-primary" />Mes formations</a>
        </div>

        {/* État */}
        <section className="rounded-2xl border border-border bg-card p-4 text-sm divide-y divide-border">
          <div className="flex justify-between py-2"><span>🦉 Socrate</span>
            <span className={`font-bold ${socrate ? 'text-emerald-700' : enLigne ? 'text-emerald-700' : 'text-rose-700'}`}>
              {socrate ? 'Prêt · sans Internet' : enLigne ? 'En ligne' : 'En pause sur cet appareil'}
            </span></div>
          <div className="flex justify-between py-2"><span>📤 Résultats à envoyer</span>
            <span className={`font-bold ${attente ? 'text-amber-700' : 'text-emerald-700'}`}>{attente ? `${attente} quiz` : 'Rien en attente'}</span></div>
          <div className="flex justify-between py-2"><span>🔄 Dernière mise à jour</span><span className="font-bold">{depuis(sync.derniere)}</span></div>
        </section>

        {/* Synchronisation */}
        {enLigne && (
          <section className="rounded-2xl border border-sky-300 bg-sky-50 p-4 dark:bg-sky-950/30">
            {sync.enCours ? (
              <>
                <p className="font-extrabold flex items-center gap-2"><RefreshCw className="w-4 h-4 animate-spin" /> Mise à jour en cours… {pct} %</p>
                <p className="text-sm text-muted-foreground mt-1 truncate">{sync.etape}</p>
                <div className="mt-2 h-2 rounded-full bg-white/70 overflow-hidden"><div className="h-full bg-sky-600 transition-all" style={{ width: `${pct}%` }} /></div>
                <button onClick={() => mettreEnPause(true)} className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-sky-300 bg-white px-3 py-2 text-sm font-bold">
                  <Pause className="w-4 h-4" /> Mettre en pause (je n&apos;ai plus de Wi-Fi)
                </button>
              </>
            ) : (
              <>
                <p className="font-extrabold flex items-center gap-2">
                  {sync.enPause ? <Pause className="w-4 h-4" /> : sync.erreur ? <Clock className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4 text-emerald-700" />}
                  {sync.enPause ? 'Mise à jour en pause' : sync.erreur ? 'Mise à jour à reprendre' : 'Tes cours sont à jour'}
                </p>
                {sync.erreur && <p className="text-sm text-muted-foreground mt-1">{sync.erreur}</p>}
                <button onClick={() => synchroniser(false)} className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2 text-sm font-bold text-white">
                  {sync.enPause ? <Play className="w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
                  {sync.enPause ? 'Reprendre' : 'Tout mettre à jour maintenant'}
                </button>
              </>
            )}
          </section>
        )}

        {/* Mes contenus */}
        <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <p className="font-extrabold flex items-center gap-2"><HardDrive className="w-4 h-4" /> Mes contenus sur cet appareil</p>
          {espace && (
            <div>
              <p className="text-sm text-muted-foreground">Espace utilisé par SavoirIA : {go(espace.utilise)} sur {go(espace.total)} disponibles</p>
              <div className="mt-1 h-2 rounded-full bg-muted overflow-hidden"><div className="h-full bg-primary" style={{ width: `${Math.min(100, (espace.utilise / espace.total) * 100)}%` }} /></div>
            </div>
          )}
          <ul className="text-sm divide-y divide-border">
            {FORMATIONS.map((f) => {
              const n = contenus[f.slug]?.length ?? 0, max = NB_SEMAINES[f.slug];
              return (
                <li key={f.slug} className="flex justify-between py-2">
                  <span>{f.titre}</span>
                  <span className={`font-bold ${n >= max ? 'text-emerald-700' : n ? 'text-amber-700' : 'text-muted-foreground'}`}>
                    {n >= max ? '✓ sur l’appareil' : n ? `${n} semaine${n > 1 ? 's' : ''} sur l’appareil` : 'au prochain Wi-Fi'}
                  </span>
                </li>
              );
            })}
            <li className="flex justify-between py-2"><span>🦉 Socrate (Gemma 4 · voix)</span>
              <span className={`font-bold ${socrate ? 'text-emerald-700' : 'text-muted-foreground'}`}>{socrate ? '✓ installé' : 'ordinateurs SavoirIA'}</span></li>
          </ul>
          {toutes.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer font-bold text-primary">Voir les {toutes.length} semaines enregistrées</summary>
              <ul className="mt-2 space-y-1">
                {toutes.map((l) => (
                  <li key={l.id}><a href={l.path} className="hover:underline">{l.id >= 1000 ? l.title : `CS50x · Semaine ${l.id} · ${l.title}`}</a></li>
                ))}
              </ul>
            </details>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <p className="font-extrabold">🎓 Examen final et attestation</p>
          <p className="text-sm text-muted-foreground mt-1">Se passent <b>en ligne</b>, pour garantir la valeur de ton attestation. Les vidéos des cours demandent aussi Internet pour l&apos;instant.</p>
        </section>
      </div>
    </main>
  );
}
