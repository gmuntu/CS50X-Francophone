'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Header from '@/components/header';
import Footer from '@/components/footer';
import IdentityEnroll from '@/components/identity/identity-enroll';

export default function MonEmpreintePage() {
  const { data: session, status } = useSession();
  const [profile, setProfile] = useState<any>(undefined);
  const load = () => fetch('/api/identite').then((r) => r.json()).then((d) => setProfile(d?.profile ?? null)).catch(() => setProfile(null));
  useEffect(() => { if (status === 'authenticated') load(); }, [status]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-10">
        {status === 'unauthenticated' && <p>Connectez-vous pour créer votre empreinte. <Link href="/auth/login" className="text-blue-600 underline">Connexion</Link></p>}
        {profile === undefined && status !== 'unauthenticated' && <p className="text-muted-foreground">Chargement…</p>}
        {profile && !profile.resetAllowed && (
          <div className="rounded-2xl border-2 border-blue-600 bg-card p-6">
            <p className="text-lg font-extrabold text-blue-700 dark:text-blue-300">✓ Empreinte créée et verrouillée</p>
            <p className="text-sm text-muted-foreground">Créée le {new Date(profile.createdAt).toLocaleDateString('fr-FR')}. En cas de problème de caméra ou de micro, contactez un formateur.</p>
            <Link href="/formations" className="mt-4 inline-block rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white">Continuer mes formations</Link>
          </div>
        )}
        {(profile === null || profile?.resetAllowed) && <IdentityEnroll name={session?.user?.name || ''} onDone={load} />}
      </main>
      <Footer />
    </div>
  );
}
