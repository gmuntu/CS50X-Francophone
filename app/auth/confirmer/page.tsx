'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Clock, Loader2, MailCheck, TriangleAlert } from 'lucide-react';
import { BrandMark, BrandName } from '@/components/brand-logo';

type Etat = 'attente' | 'envoi' | 'ok' | 'expire' | 'invalide' | 'erreur';

function Confirmer() {
  const params = useSearchParams();
  const jeton = params?.get('jeton') || '';
  const [etat, setEtat] = useState<Etat>('attente');

  // Le compte n'est créé qu'au clic sur le bouton (et non à l'ouverture du lien),
  // pour qu'un antivirus de messagerie qui « visite » le lien ne confirme rien à la place de l'élève.
  const confirmer = async () => {
    setEtat('envoi');
    try {
      const res = await fetch('/api/signup/confirmer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jeton }),
      });
      const data = await res.json().catch(() => ({}));
      setEtat(data?.resultat === 'ok' ? 'ok' : data?.resultat === 'expire' ? 'expire' : data?.resultat === 'invalide' ? 'invalide' : 'erreur');
    } catch {
      setEtat('erreur');
    }
  };

  const bouton = 'inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60';

  // Arrivée juste après l'inscription : pas de jeton, on explique seulement quoi faire.
  if (!jeton) {
    return (
      <>
        <MailCheck className="mx-auto h-12 w-12 text-primary" />
        <h1 className="mt-4 text-2xl font-extrabold text-foreground">Consultez vos courriels</h1>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          Si cette adresse n&apos;a pas encore de compte, nous venons de vous envoyer un lien de confirmation, valable 24 heures.
          Ouvrez-le pour terminer votre inscription. Pensez à regarder dans les courriers indésirables.
        </p>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          Votre dossier sera ensuite validé par l&apos;administration.
        </p>
        <Link href="/auth/login" className="mt-6 inline-block text-sm font-bold text-primary hover:underline">Aller à la page de connexion</Link>
      </>
    );
  }

  if (etat === 'ok') {
    return (
      <>
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
        <h1 className="mt-4 text-2xl font-extrabold text-foreground">Adresse confirmée</h1>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          Votre dossier est enregistré. Il doit maintenant être validé par l&apos;administration : vous pourrez vous connecter dès que ce sera fait.
        </p>
        <Link href="/auth/login" className={`${bouton} mt-6`}>Aller à la page de connexion</Link>
      </>
    );
  }

  if (etat === 'expire' || etat === 'invalide') {
    return (
      <>
        <Clock className="mx-auto h-12 w-12 text-amber-500" />
        <h1 className="mt-4 text-2xl font-extrabold text-foreground">
          {etat === 'expire' ? 'Ce lien a expiré' : 'Ce lien n’est plus valable'}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          {etat === 'expire'
            ? 'Un lien de confirmation est valable 24 heures. Recommencez votre inscription pour en recevoir un nouveau.'
            : 'Il a peut-être déjà été utilisé, ou un lien plus récent vous a été envoyé. Si votre adresse est déjà confirmée, votre dossier attend la validation de l’administration.'}
        </p>
        <Link href="/auth/signup" className={`${bouton} mt-6`}>Recommencer l&apos;inscription</Link>
        <Link href="/auth/login" className="mt-4 inline-block text-sm font-bold text-primary hover:underline">Aller à la page de connexion</Link>
      </>
    );
  }

  return (
    <>
      <MailCheck className="mx-auto h-12 w-12 text-primary" />
      <h1 className="mt-4 text-2xl font-extrabold text-foreground">Confirmez votre inscription</h1>
      <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
        Appuyez sur le bouton pour confirmer votre adresse et terminer votre inscription à SavoirIA.
      </p>
      {etat === 'erreur' && (
        <p role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-left text-sm text-red-500">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          Une erreur est survenue. Vérifiez votre connexion et réessayez.
        </p>
      )}
      <button type="button" onClick={confirmer} disabled={etat === 'envoi'} className={`${bouton} mt-6`}>
        {etat === 'envoi' ? <><Loader2 className="h-4 w-4 animate-spin" /> Confirmation…</> : 'Confirmer mon inscription'}
      </button>
    </>
  );
}

export default function PageConfirmer() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-lg">
        <Link href="/" className="mb-6 inline-flex items-center gap-2">
          <BrandMark className="h-10 w-10" />
          <BrandName className="text-lg font-extrabold text-foreground" />
        </Link>
        <Suspense fallback={<Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />}>
          <Confirmer />
        </Suspense>
      </div>
    </div>
  );
}
