'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';

export default function NotifyButton({ slug }: { slug: string }) {
  const { data: session } = useSession();
  const [state, setState] = useState<'idle' | 'form' | 'sending' | 'done' | 'error'>('idle');
  const [email, setEmail] = useState('');

  const send = async (mail?: string) => {
    setState('sending');
    try {
      const res = await fetch('/api/interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseSlug: slug, email: mail }),
      });
      setState(res.ok ? 'done' : 'error');
    } catch {
      setState('error');
    }
  };

  if (state === 'done') {
    return <p className="mt-auto text-center text-xs font-bold text-green-600 py-2">✓ Nous vous préviendrons</p>;
  }

  if (state === 'form' || (state === 'error' && !session)) {
    return (
      <form
        className="mt-auto flex gap-1.5"
        onSubmit={(e) => { e.preventDefault(); send(email); }}
      >
        <input
          type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="Votre courriel" aria-label="Votre courriel"
          className="min-w-0 flex-1 rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
        />
        <button type="submit" className="rounded-lg bg-blue-600 px-2.5 text-xs font-bold text-white">OK</button>
      </form>
    );
  }

  return (
    <button
      type="button"
      disabled={state === 'sending'}
      onClick={() => (session?.user?.email ? send() : setState('form'))}
      className="mt-auto w-full rounded-lg border border-blue-200 bg-blue-50 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300"
    >
      {state === 'sending' ? 'Envoi…' : state === 'error' ? 'Réessayer' : 'Me prévenir'}
    </button>
  );
}
