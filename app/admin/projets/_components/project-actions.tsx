'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ProjectActions({ id, canValidate }: { id: string; canValidate: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const act = async (status: 'VALIDATED' | 'REDO') => {
    setBusy(true);
    await fetch('/api/admin/projets', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) }).catch(() => {});
    setBusy(false);
    router.refresh();
  };
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <button disabled={busy || !canValidate} onClick={() => act('VALIDATED')} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-40">✓ Valider le projet</button>
      <button disabled={busy} onClick={() => act('REDO')} className="rounded-lg border border-border px-4 py-2 text-sm font-bold">Demander une 2e défense</button>
    </div>
  );
}
