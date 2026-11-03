'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { paquetsPerimes, mettreAJourPaquets, type SavedLesson } from '@/lib/offline';

/**
 * Bandeau « Des quiz ont été corrigés » : s'affiche seulement quand une semaine enregistrée
 * sur l'appareil n'est plus à jour. Sinon, un quiz fait hors ligne avec l'ancienne version
 * serait noté avec les nouvelles bonnes réponses.
 */
export default function PaquetsPerimes() {
  const [perimes, setPerimes] = useState<SavedLesson[]>([]);
  const [enCours, setEnCours] = useState(false);

  useEffect(() => {
    let actif = true;
    const verifier = () => paquetsPerimes().then((l) => actif && setPerimes(l)).catch(() => {});
    verifier();
    window.addEventListener('online', verifier);
    return () => {
      actif = false;
      window.removeEventListener('online', verifier);
    };
  }, []);

  if (!perimes.length) return null;

  const mettreAJour = async () => {
    setEnCours(true);
    try {
      const faits = await mettreAJourPaquets(perimes);
      const restants = await paquetsPerimes();
      setPerimes(restants);
      if (!restants.length) toast.success(faits > 1 ? `${faits} semaines mises à jour.` : 'Semaine mise à jour.');
      else toast.error("Certaines semaines n'ont pas pu être mises à jour. Réessaie avec une meilleure connexion.");
    } catch {
      toast.error('La mise à jour a échoué. Vérifie ta connexion.');
    } finally {
      setEnCours(false);
    }
  };

  const n = perimes.length;
  return (
    <div role="status" className="rounded-2xl border border-amber-500/40 bg-amber-50 dark:bg-amber-950/30 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" aria-hidden />
      <div className="flex-1 text-sm">
        <p className="font-bold text-foreground">
          {n > 1 ? `${n} semaines enregistrées sur ton appareil ne sont plus à jour` : 'Une semaine enregistrée sur ton appareil n’est plus à jour'}
        </p>
        <p className="text-muted-foreground">
          Des quiz ont été corrigés ({perimes.map((l) => l.title).join(', ')}). Mets-les à jour avant de réviser sans Internet :
          seules les pages sont retéléchargées, tes podcasts sont gardés.
        </p>
      </div>
      <button
        type="button"
        onClick={mettreAJour}
        disabled={enCours}
        className="self-start sm:self-center rounded-xl bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 text-sm font-bold flex items-center gap-2 disabled:opacity-60 whitespace-nowrap"
      >
        <RefreshCw className={`w-4 h-4 ${enCours ? 'animate-spin' : ''}`} />
        {enCours ? 'Mise à jour…' : 'Mettre à jour'}
      </button>
    </div>
  );
}
