'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RunButton() {
  const router = useRouter();
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true); setMsg('');
    const d = await fetch('/api/cron/rappel-whatsapp', { method: 'POST' }).then((r) => r.json()).catch(() => ({ errors: ['Erreur réseau'] }));
    setMsg(d?.error || `${d?.sent ?? 0} rappel(s) envoyé(s)${d?.errors?.length ? ' · ' + d.errors.join(' ; ') : ''}`);
    setBusy(false);
    router.refresh();
  };
  return (
    <div className="text-right">
      <button disabled={busy} onClick={run} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Envoi…' : 'Envoyer les rappels maintenant'}</button>
      {msg && <p className="mt-1 text-xs text-muted-foreground max-w-xs">{msg}</p>}
    </div>
  );
}
