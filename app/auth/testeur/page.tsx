'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { FlaskConical, Loader2 } from 'lucide-react';

function TesterSignup() {
  const params = useSearchParams();
  const [form, setForm] = useState({
    code: params.get('code') ?? '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    dialCode: '+',
    phone: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/signup-testeur', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? 'Inscription impossible.');
        return;
      }
      // Compte actif tout de suite : connexion automatique.
      const login = await signIn('credentials', { email: form.email.trim().toLowerCase(), password: form.password, redirect: false });
      window.location.href = login?.error ? '/auth/login' : '/dashboard';
    } catch {
      setError('Erreur réseau, réessayez.');
    } finally {
      setLoading(false);
    }
  };

  const input = 'w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary';
  const label = 'block text-xs font-bold text-muted-foreground mb-1.5';

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
      <form onSubmit={submit} className="w-full max-w-md bg-card border border-border rounded-2xl p-6 sm:p-8 space-y-4 shadow-sm">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <FlaskConical className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-foreground">Accès testeur Savoiria</h1>
          <p className="text-sm text-muted-foreground">Entrez le code reçu de l'équipe. Votre compte est actif immédiatement, jusqu'à la fin du test.</p>
        </div>

        <div>
          <label className={label}>Code testeur</label>
          <input required value={form.code} onChange={set('code')} placeholder="TEST-XXXX-XXXX" className={`${input} font-mono uppercase tracking-wider`} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Prénom</label>
            <input required value={form.firstName} onChange={set('firstName')} className={input} />
          </div>
          <div>
            <label className={label}>Nom</label>
            <input required value={form.lastName} onChange={set('lastName')} className={input} />
          </div>
        </div>
        <div>
          <label className={label}>Courriel</label>
          <input required type="email" value={form.email} onChange={set('email')} className={input} />
        </div>
        <div>
          <label className={label}>Mot de passe (10 caractères minimum)</label>
          <input required type="password" minLength={10} value={form.password} onChange={set('password')} className={input} />
        </div>
        <div>
          <label className={label}>Téléphone (facultatif, pour tester le tuteur WhatsApp)</label>
          <div className="flex gap-2">
            <input value={form.dialCode} onChange={set('dialCode')} placeholder="+243" inputMode="tel" className={`${input} w-24`} />
            <input value={form.phone} onChange={set('phone')} placeholder="812345678" inputMode="tel" className={input} />
          </div>
        </div>

        {error && <p className="text-sm font-semibold text-red-600 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{error}</p>}

        <button disabled={loading} className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50">
          {loading && <Loader2 className="w-4 h-4 animate-spin" />} Commencer le test
        </button>
        <p className="text-xs text-center text-muted-foreground">
          Déjà inscrit ? <Link href="/auth/login" className="text-primary font-semibold">Se connecter</Link>
        </p>
      </form>
    </main>
  );
}

export default function TesterSignupPage() {
  return (
    <Suspense>
      <TesterSignup />
    </Suspense>
  );
}
