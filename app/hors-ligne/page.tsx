'use client';

import { useEffect, useState } from 'react';
import { WifiOff, Volume2 } from 'lucide-react';
import { listSavedLessons, type SavedLesson } from '@/lib/offline';

export default function HorsLignePage() {
  const [lessons, setLessons] = useState<SavedLesson[] | null>(null);

  useEffect(() => {
    listSavedLessons().then(setLessons).catch(() => setLessons([]));
  }, []);

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-3">
          <WifiOff className="w-12 h-12 mx-auto text-muted-foreground" />
          <h1 className="text-2xl font-extrabold text-foreground">Vous êtes hors ligne</h1>
          <p className="text-sm text-muted-foreground">
            Cette page n'a pas été enregistrée sur votre appareil. Voici les semaines que vous pouvez consulter sans connexion.
          </p>
        </div>

        {lessons && lessons.length > 0 ? (
          <ul className="space-y-2">
            {lessons.map((l) => (
              <li key={l.id}>
                {/* Lien classique (pas next/link) pour que le service worker serve la page enregistrée */}
                <a href={l.path} className="flex items-center justify-between gap-3 bg-card border border-border rounded-xl p-4 hover:border-primary/40">
                  <span className="font-bold text-sm text-foreground">{l.id >= 1000 ? l.title : `Semaine ${l.id} — ${l.title}`}</span>
                  {l.audio.length > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Volume2 className="w-3.5 h-3.5" /> {l.audio.length}</span>
                  )}
                </a>
              </li>
            ))}
          </ul>
        ) : lessons ? (
          <p className="text-center text-sm text-muted-foreground bg-card border border-border rounded-xl p-5">
            Aucune semaine enregistrée. Une fois reconnecté, ouvrez une semaine de cours et touchez « Rendre disponible hors ligne ».
          </p>
        ) : null}

        <div className="text-center">
          <button onClick={() => window.location.reload()} className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold">
            Réessayer
          </button>
        </div>
      </div>
    </main>
  );
}
