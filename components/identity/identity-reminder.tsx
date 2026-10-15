'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

// Bandeau : rappelle aux étudiants de créer leur empreinte SavoirIA (une seule fois).
export default function IdentityReminder() {
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    fetch('/api/identite').then((r) => (r.ok ? r.json() : null)).then((d) => { if (d && (!d.profile || d.profile.resetAllowed)) setMissing(true); }).catch(() => {});
  }, []);
  if (!missing) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 p-4">
      <p className="text-sm"><b>🤳 Créez votre empreinte SavoirIA</b> (1 minute, une seule fois) : elle prouve que c'est bien vous qui passez vos examens.</p>
      <Link href="/mon-empreinte" className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white">Créer mon empreinte</Link>
    </div>
  );
}
