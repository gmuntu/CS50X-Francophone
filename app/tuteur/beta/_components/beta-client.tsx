'use client';

import { useCallback, useRef, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/header';
import { CS50_MODULES } from '@/config/course-modules';
import VoiceTutor from '@/components/voice-tutor/voice-tutor';
import VoiceErrorBoundary from '@/components/voice-tutor/error-boundary';

export default function BetaClient() {
  const [moduleId, setModuleId] = useState(CS50_MODULES[0]?.id ?? 0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const mod = CS50_MODULES.find((m) => m.id === moduleId) ?? CS50_MODULES[0];
  const src = mod?.videoUrl ? `${mod.videoUrl}${mod.videoUrl.includes('?') ? '&' : '?'}enablejsapi=1` : '';

  // Met la vidéo en pause quand la conversation commence.
  const pauseVideo = useCallback(() => {
    try {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }), '*',
      );
    } catch {}
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-8 flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-extrabold">Tuteur vocal <span className="text-xs align-top text-primary">BÊTA</span></h1>
          <Link href="/tuteur" className="text-sm underline text-muted-foreground">Revenir au tuteur classique</Link>
        </div>

        <select
          value={moduleId}
          onChange={(e) => setModuleId(Number(e.target.value))}
          className="w-full sm:w-auto rounded-xl border border-border bg-card px-3 py-2 text-sm"
        >
          {CS50_MODULES.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
        </select>

        <div className="w-full aspect-video bg-black rounded-2xl overflow-hidden border border-border/80">
          {src ? (
            <iframe
              ref={iframeRef}
              key={src}
              src={src}
              className="w-full h-full"
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              title={mod.title}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">Vidéo indisponible</div>
          )}
        </div>

        <VoiceErrorBoundary>
          <VoiceTutor key={moduleId} moduleId={moduleId} onActive={pauseVideo} />
        </VoiceErrorBoundary>
      </main>
    </div>
  );
}
