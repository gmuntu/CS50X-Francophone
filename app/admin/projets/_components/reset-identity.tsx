'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ResetIdentity({ userId, allowed }: { userId: string; allowed: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  if (allowed) return <p className="mt-2 text-xs font-bold text-amber-600">Nouvel enregistrement autorisé : l'étudiant peut refaire son empreinte.</p>;
  return (
    <button disabled={busy} onClick={async () => { setBusy(true); await fetch('/api/admin/identite', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }) }).catch(() => {}); setBusy(false); router.refresh(); }}
      className="mt-2 rounded-lg border border-border px-3 py-1.5 text-xs font-bold">Autoriser un nouvel enregistrement de l'empreinte</button>
  );
}
