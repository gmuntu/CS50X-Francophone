'use client';

import { useEffect, useRef, useState } from 'react';
import { Play } from 'lucide-react';
import { ORDINATEUR_LOCAL } from '@/lib/socrate-local';

type Lang = 'fr' | 'en';
const KEY = 'savoiria-video-lang';

/** Identifiant YouTube d'une adresse « …/embed/<id> » (null si ce n'est pas une vidéo YouTube). */
function idYoutube(url: string): string | null {
  const m = /(?:embed\/|youtu\.be\/|[?&]v=)([A-Za-z0-9_-]{11})/.exec(url);
  return m ? m[1] : null;
}

/**
 * Vidéo du cours en français (doublée) ou en anglais (original Harvard).
 * Le bouton de langue reprend la vidéo au même moment.
 * La vidéo ne se charge qu'au clic : la page reste légère sur les petits forfaits.
 * SavoirIA LOCAL : la vidéo copiée sur l'ordinateur (savoiria-videos.sh) est lue sans Internet ;
 * si elle n'y est pas, on revient au lecteur YouTube.
 */
export default function BilingualVideo({ en, fr, title, autoload = false }: { en: string; fr?: string; title?: string; autoload?: boolean }) {
  const [lang, setLang] = useState<Lang>(fr ? 'fr' : 'en');
  const [on, setOn] = useState(autoload);
  const [start, setStart] = useState(0);
  const timeRef = useRef(0);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  // Vidéos absentes de l'ordinateur (on passe alors par YouTube)
  const [absentes, setAbsentes] = useState<string[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY) as Lang | null;
      if (saved && (saved === 'en' || fr)) setLang(saved);
    } catch {}
  }, [fr]);

  // Le lecteur YouTube envoie régulièrement sa position (currentTime).
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (typeof e.origin !== 'string' || !e.origin.includes('youtube')) return;
      try {
        const d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        const t = d?.info?.currentTime;
        if (typeof t === 'number') timeRef.current = t;
      } catch {}
    };
    // Pause demandée par la page (ex. : Socrate Agora commence à parler).
    const onPause = () => {
      try { frameRef.current?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }), '*'); } catch {}
      try { videoRef.current?.pause(); } catch {}
    };
    window.addEventListener('message', onMsg);
    window.addEventListener('savoiria:pause-video', onPause);
    return () => { window.removeEventListener('message', onMsg); window.removeEventListener('savoiria:pause-video', onPause); };
  }, []);

  const listen = () => {
    try { frameRef.current?.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: 1 }), '*'); } catch {}
  };

  const choose = (l: Lang) => {
    if (l === lang) return;
    if (videoRef.current) timeRef.current = videoRef.current.currentTime;
    setStart(Math.floor(timeRef.current));
    setLang(l);
    try { localStorage.setItem(KEY, l); } catch {}
  };

  const base = lang === 'fr' && fr ? fr : en;
  const idLocal = ORDINATEUR_LOCAL ? idYoutube(base) : null;
  const local = idLocal && !absentes.includes(idLocal) ? idLocal : null;
  const src = `${base}${base.includes('?') ? '&' : '?'}enablejsapi=1${autoload && start === 0 ? '' : '&autoplay=1'}&start=${start}${lang === 'fr' ? '&hl=fr' : ''}`;

  return (
    <div className="space-y-2">
      {fr && (
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex rounded-xl bg-muted p-1 text-xs font-bold" role="group" aria-label="Langue de la vidéo">
            {(['fr', 'en'] as Lang[]).map((l) => (
              <button key={l} type="button" onClick={() => choose(l)} aria-pressed={lang === l}
                className={`rounded-lg px-3 py-1.5 ${lang === l ? 'bg-card text-blue-700 dark:text-blue-300 shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                {l === 'fr' ? '🇫🇷 Français' : '🇬🇧 English (original)'}
              </button>
            ))}
          </div>
          <span className="hidden sm:inline text-[11px] text-muted-foreground">La vidéo reprend au même moment</span>
        </div>
      )}
      <div className="aspect-video bg-black border border-border/80 rounded-2xl overflow-hidden shadow-soft-sm">
        {on && local ? (
          <video key={local} ref={videoRef} controls playsInline preload="metadata" className="w-full h-full"
            src={`/api/videos/${local}.mp4`} title={title}
            onLoadedMetadata={(e) => {
              const v = e.currentTarget;
              if (start > 0) v.currentTime = start;
              if (!(autoload && start === 0)) v.play().catch(() => {});
            }}
            onTimeUpdate={(e) => { timeRef.current = e.currentTarget.currentTime; }}
            onError={() => setAbsentes((a) => [...a, local])}>
            <track kind="subtitles" srcLang="fr" label="Français" src={`/api/videos/${local}.fr.vtt`} />
            <track kind="subtitles" srcLang="en" label="English" src={`/api/videos/${local}.en.vtt`} />
          </video>
        ) : on ? (
          <iframe key={src} ref={frameRef} src={src} onLoad={listen} className="w-full h-full" allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" title={title} />
        ) : (
          <button onClick={() => setOn(true)} className="w-full h-full flex flex-col items-center justify-center gap-3 text-white bg-gradient-to-br from-slate-900 to-slate-800">
            <span className="w-16 h-16 rounded-full bg-primary flex items-center justify-center shadow-lg"><Play className="w-7 h-7 ml-1" /></span>
            <span className="text-sm font-bold">Lancer la vidéo {lang === 'fr' && fr ? 'en français' : 'en anglais'}</span>
            <span className="text-xs text-white/60">{local ? 'Enregistrée sur cet ordinateur — sans Internet' : 'Consomme des données — préférez le Wi-Fi'}</span>
          </button>
        )}
      </div>
      {fr && lang === 'fr' && (
        <p className="text-[11px] text-muted-foreground">Version française de CS50 (Harvard University, David J. Malan), traduite et doublée par SavoirIA avec Moon2⁺Studio. Licence CC BY-NC-SA 4.0.</p>
      )}
    </div>
  );
}
