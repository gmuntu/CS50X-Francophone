'use client';

import { useState } from 'react';
import { Play } from 'lucide-react';

/** La vidéo ne se charge qu'au clic : la page s'ouvre vite et ne consomme pas de données pour rien. */
export default function LiteVideo({ src, title }: { src: string; title?: string }) {
  const [on, setOn] = useState(false);
  if (on) {
    return (
      <iframe
        src={src + (src.includes('?') ? '&' : '?') + 'autoplay=1'}
        className="w-full h-full"
        allowFullScreen
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        title={title}
      />
    );
  }
  return (
    <button onClick={() => setOn(true)} className="w-full h-full flex flex-col items-center justify-center gap-3 text-white bg-gradient-to-br from-slate-900 to-slate-800">
      <span className="w-16 h-16 rounded-full bg-primary flex items-center justify-center shadow-lg">
        <Play className="w-7 h-7 ml-1" />
      </span>
      <span className="text-sm font-bold">Lancer la vidéo</span>
      <span className="text-xs text-white/60">Consomme des données — préférez le Wi-Fi</span>
    </button>
  );
}
