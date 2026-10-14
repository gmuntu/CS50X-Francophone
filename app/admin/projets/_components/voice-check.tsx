'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// Comparaison à l'oreille : empreinte vocale contre voix de la défense.
export default function VoiceCheck({ id, refUrl, defenseUrl, match }: { id: string; refUrl?: string | null; defenseUrl?: string | null; match?: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const set = async (voiceMatch: 'MATCH' | 'MISMATCH') => {
    setBusy(true);
    await fetch('/api/admin/projets', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, voiceMatch }) }).catch(() => {});
    setBusy(false);
    router.refresh();
  };
  return (
    <div className={`mt-3 rounded-xl border p-3 ${match === 'MISMATCH' ? 'border-red-300 bg-red-50 dark:bg-red-950/30' : 'border-border'}`}>
      <p className="text-sm font-bold mb-2">🎙️ Vérification de la voix {match === 'MATCH' ? '· ✓ même voix' : match === 'MISMATCH' ? '· ✗ voix différente' : ''}</p>
      <div className="grid gap-2 sm:grid-cols-2 text-xs">
        <div><p className="text-muted-foreground mb-1">Empreinte</p>{refUrl ? <audio controls preload="none" src={refUrl} className="w-full" /> : <p>— pas encore enregistrée</p>}</div>
        <div><p className="text-muted-foreground mb-1">Défense orale</p>{defenseUrl ? <audio controls preload="none" src={defenseUrl} className="w-full" /> : <p>— pas encore enregistrée</p>}</div>
      </div>
      {refUrl && defenseUrl && (
        <div className="mt-2 flex flex-wrap gap-2">
          <button disabled={busy} onClick={() => set('MATCH')} className={`rounded-lg px-3 py-1.5 text-xs font-bold border ${match === 'MATCH' ? 'bg-blue-600 text-white border-blue-600' : 'border-border'}`}>Même voix ✓</button>
          <button disabled={busy} onClick={() => set('MISMATCH')} className={`rounded-lg px-3 py-1.5 text-xs font-bold border ${match === 'MISMATCH' ? 'bg-red-600 text-white border-red-600' : 'border-border'}`}>Voix différente ✗</button>
        </div>
      )}
    </div>
  );
}
