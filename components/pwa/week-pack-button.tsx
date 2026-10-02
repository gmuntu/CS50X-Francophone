'use client';

import { useState } from 'react';
import { Package, FileText, Loader2, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { buildWeekPack, downloadBlob, shareBlob, type PackInput } from '@/lib/week-pack';

type Props = Omit<PackInput, 'includeAudio' | 'siteUrl'>;

/** « Pack de la semaine » : un seul fichier ZIP à garder, ou à partager sans Internet. */
export default function WeekPackButton(props: Props) {
  const [progress, setProgress] = useState<string | null>(null);
  const [last, setLast] = useState<{ blob: Blob; name: string } | null>(null);

  const make = async (includeAudio: boolean) => {
    setProgress('0 %');
    try {
      const { blob, name, failed } = await buildWeekPack(
        { ...props, includeAudio, siteUrl: window.location.origin },
        (d, t) => setProgress(`${Math.round((d / t) * 100)} %`)
      );
      downloadBlob(blob, name);
      setLast({ blob, name });
      const mo = (blob.size / 1_048_576).toFixed(1);
      if (failed.length) toast.warning(`Pack prêt (${mo} Mo), sans ${failed.length} podcast(s) indisponible(s).`);
      else toast.success(`Pack prêt (${mo} Mo). Ouvrez OUVRIR-MOI.html après l'avoir décompressé.`);
    } catch {
      toast.error('Impossible de préparer le pack. Réessayez avec une meilleure connexion.');
    } finally {
      setProgress(null);
    }
  };

  const share = async () => {
    if (!last) return;
    try {
      if (!(await shareBlob(last.blob, last.name))) toast.info('Partage direct non disponible : envoyez le fichier téléchargé par WhatsApp ou Bluetooth.');
    } catch {}
  };

  return (
    <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-soft-sm space-y-3">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
          <Package className="w-4 h-4" />
        </div>
        <div>
          <h3 className="font-bold text-foreground text-sm">Pack de la semaine</h3>
          <p className="text-xs text-muted-foreground">Un seul fichier, lisible sans Internet ni application, à partager avec vos camarades.</p>
        </div>
      </div>
      {progress ? (
        <p className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Préparation… {progress}
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button onClick={() => make(true)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90">
            <Package className="w-3.5 h-3.5" /> Pack complet (avec podcasts)
          </button>
          <button onClick={() => make(false)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted text-foreground text-xs font-bold hover:bg-muted/70">
            <FileText className="w-3.5 h-3.5" /> Pack léger (texte, quelques Ko)
          </button>
          {last && (
            <button onClick={share} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-foreground text-xs font-bold hover:bg-muted">
              <Share2 className="w-3.5 h-3.5" /> Partager
            </button>
          )}
        </div>
      )}
    </div>
  );
}
