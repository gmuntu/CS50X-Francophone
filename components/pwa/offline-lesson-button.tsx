'use client';

import { useEffect, useState } from 'react';
import { CloudDownload, CheckCircle, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { listSavedLessons, offlineSupported, removeLesson, saveLesson } from '@/lib/offline';

interface Props {
  lessonId: number;
  title: string;
  audioUrls: string[];
}

/** Bouton « Disponible hors ligne » : enregistre la page (résumé inclus) et les podcasts sur l'appareil. */
export default function OfflineLessonButton({ lessonId, title, audioUrls }: Props) {
  const [supported, setSupported] = useState(false);
  const [saved, setSaved] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);

  useEffect(() => {
    if (!offlineSupported()) return;
    setSupported(true);
    listSavedLessons().then((l) => setSaved(l.some((x) => x.id === lessonId))).catch(() => {});
  }, [lessonId]);

  if (!supported) return null;

  const onSave = async () => {
    setProgress('0 %');
    try {
      const { failed } = await saveLesson(
        { id: lessonId, title, path: window.location.pathname, audio: audioUrls },
        (d, t) => setProgress(`${Math.round((d / t) * 100)} %`)
      );
      setSaved(true);
      if (failed.length) toast.warning(`Semaine enregistrée, mais ${failed.length} podcast(s) n'ont pas pu être téléchargés.`);
      else toast.success('Semaine disponible hors ligne : résumé et podcasts enregistrés.');
    } catch {
      toast.error("Échec de l'enregistrement. Vérifiez votre connexion et l'espace libre.");
    } finally {
      setProgress(null);
    }
  };

  const onRemove = async () => {
    await removeLesson(lessonId);
    setSaved(false);
    toast.success("Semaine retirée de l'appareil.");
  };

  if (progress) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-xs font-bold text-muted-foreground">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Téléchargement… {progress}
      </span>
    );
  }

  return saved ? (
    <span className="inline-flex items-center gap-2">
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20">
        <CheckCircle className="w-3.5 h-3.5" /> Disponible hors ligne
      </span>
      <button onClick={onRemove} title="Retirer de l'appareil" aria-label="Retirer de l'appareil" className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </span>
  ) : (
    <button
      onClick={onSave}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-bold border border-primary/20 hover:bg-primary/15"
    >
      <CloudDownload className="w-3.5 h-3.5" /> Rendre disponible hors ligne
    </button>
  );
}
