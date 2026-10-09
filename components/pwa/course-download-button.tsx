'use client';

import { useState } from 'react';
import { CloudDownload, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { offlineSupported, saveLesson, storeGeneratedAudio, generatedAudioKey, readGeneratedAudio } from '@/lib/offline';
import { IA_SLUG, getIaWeek } from '@/lib/courses/ia-essentiels';

type Lesson = { id: number; week?: number; title: string; path: string; audio: string[] };

/** « Toute la formation hors ligne » : enregistre toutes les semaines ouvertes, podcasts compris. */
export default function CourseDownloadButton({ course, label = 'Toute la formation hors ligne' }: { course: string; label?: string }) {
  const [progress, setProgress] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const run = async () => {
    if (!offlineSupported()) {
      toast.error("Ce navigateur ne permet pas l'enregistrement hors ligne. Essayez Chrome ou l'application installée.");
      return;
    }
    setProgress('Préparation…');
    try {
      const res = await fetch(`/api/offline/manifest?course=${encodeURIComponent(course)}`);
      if (res.status === 401) { window.location.href = '/auth/login'; return; }
      const { lessons } = (await res.json()) as { lessons: Lesson[] };
      let failed = 0;
      for (let i = 0; i < lessons.length; i++) {
        const l = lessons[i];
        setProgress(`Semaine ${i + 1} / ${lessons.length}`);
        try {
          const r = await saveLesson({ id: l.id, title: l.title, path: l.path, audio: l.audio });
          failed += r.failed.length;
          // Formations SavoirIA : les voix du podcast sont générées, on les enregistre une par une.
          if (course === IA_SLUG && l.week) {
            const lines = getIaWeek(l.week)?.podcast ?? [];
            for (let j = 0; j < lines.length; j++) {
              const key = generatedAudioKey(course, l.week, j);
              if (await readGeneratedAudio(key)) continue;
              const sp = await fetch('/api/speech', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: lines[j].text, speaker: lines[j].speaker }),
              }).then((x) => x.json()).catch(() => null);
              if (sp?.audioContent) await storeGeneratedAudio(l.id, key, sp.audioContent);
              else failed++;
            }
          }
        } catch {
          failed++;
        }
      }
      setDone(true);
      if (failed) toast.warning(`Formation enregistrée, sauf ${failed} élément(s) audio. Relancez avec une meilleure connexion.`);
      else toast.success(`${lessons.length} semaine(s) disponibles sans Internet, podcasts compris.`);
    } catch {
      toast.error("Échec de l'enregistrement. Vérifiez votre connexion et l'espace libre.");
    } finally {
      setProgress(null);
    }
  };

  if (progress) {
    return (
      <span className="inline-flex items-center gap-2 rounded-xl bg-sky-50 px-4 py-2.5 text-sm font-bold text-sky-700 ring-1 ring-sky-300 dark:bg-sky-950/40 dark:text-sky-300 dark:ring-sky-800">
        <Loader2 className="w-4 h-4 animate-spin" /> {progress}
      </span>
    );
  }
  return (
    <button onClick={run}
      className="inline-flex items-center gap-2 rounded-xl bg-sky-50 px-4 py-2.5 text-sm font-extrabold text-sky-700 ring-1 ring-sky-300 hover:bg-sky-100 dark:bg-sky-950/40 dark:text-sky-300 dark:ring-sky-800">
      {done ? <CheckCircle className="w-4 h-4" /> : <CloudDownload className="w-4 h-4" />}
      {done ? 'Enregistrée · mettre à jour' : label}
    </button>
  );
}
