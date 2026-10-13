'use client';

import { useCallback, useState } from 'react';
import BilingualVideo from '@/components/pwa/bilingual-video';
import Link from 'next/link';
import Header from '@/components/header';
import { CS50_MODULES } from '@/config/course-modules';
import VoiceTutor from '@/components/voice-tutor/voice-tutor';
import VoiceErrorBoundary from '@/components/voice-tutor/error-boundary';

export default function BetaClient() {
  const [moduleId, setModuleId] = useState(CS50_MODULES[0]?.id ?? 0);
  const mod = CS50_MODULES.find((m) => m.id === moduleId) ?? CS50_MODULES[0];

  // Met la vidéo en pause quand la conversation commence.
  const pauseVideo = useCallback(() => {
    window.dispatchEvent(new Event('savoiria:pause-video'));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-8 flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold">Agora</h1>
            <p className="text-sm text-muted-foreground">La salle de classe où vous discutez de vive voix avec Socrate.</p>
          </div>
          <Link href="/tuteur" className="text-sm underline text-muted-foreground">Revenir au tuteur classique</Link>
        </div>

        <select
          value={moduleId}
          onChange={(e) => setModuleId(Number(e.target.value))}
          className="w-full sm:w-auto rounded-xl border border-border bg-card px-3 py-2 text-sm"
        >
          {CS50_MODULES.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
        </select>

        {mod?.videoUrl ? (
          <BilingualVideo key={mod.id} en={mod.videoUrl} fr={mod.videoUrlFr} title={mod.title} autoload />
        ) : (
          <div className="w-full aspect-video bg-black rounded-2xl flex items-center justify-center text-muted-foreground text-sm">Vidéo indisponible</div>
        )}
        {mod?.videoUrlFr && (
          <p className="text-xs text-muted-foreground -mt-2">Socrate s'appuie sur la vidéo originale anglaise : ses repères de temps (« vers 12:30 ») correspondent à la version anglaise ; en français, le moment peut être légèrement décalé.</p>
        )}

        <VoiceErrorBoundary>
          <VoiceTutor key={moduleId} moduleId={moduleId} onActive={pauseVideo} />
        </VoiceErrorBoundary>
      </main>
    </div>
  );
}
