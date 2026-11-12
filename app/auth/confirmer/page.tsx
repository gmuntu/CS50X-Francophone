'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Clock, Loader2, MailCheck, TriangleAlert } from 'lucide-react';
import { BrandMark, BrandName } from '@/components/brand-logo';
import PasswordInput from '@/components/password-input';
import { LEGAL } from '@/lib/legal';

type Etat = 'attente' | 'envoi' | 'ok' | 'expire' | 'invalide' | 'motdepasse' | 'age' | 'trop' | 'erreur';

function Confirmer() {
  const params = useSearchParams();
  const jeton = params?.get('jeton') || '';
  const [etat, setEtat] = useState<Etat>('attente');
  const [motDePasse, setMotDePasse] = useState('');

  // Le compte n'est créé qu'au clic sur le bouton (et non à l'ouverture du lien),
  // pour qu'un antivirus de messagerie qui « visite » le lien ne confirme rien à la place de l'élève.
  const confirmer = async (e: React.FormEvent) => {
    e.preventDefault();
    setEtat('envoi');
    try {
      const res = await fetch('/api/signup/confirmer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jeton, motDePasse }),
      });
      const data = await res.json().catch(() => ({}));
      const connus: Etat[] = ['ok', 'expire', 'invalide', 'motdepasse', 'age', 'trop'];
      setEtat(connus.includes(data?.resultat) ? data.resultat : 'erreur');
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
        <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
          Quelques envois par jour au plus pour une même adresse. Rien reçu ? Réessayez demain ou écrivez-nous :{' '}
          <a href={`mailto:${LEGAL.contactEmail}`} className="font-semibold text-primary hover:underline">{LEGAL.contactEmail}</a>.
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

  if (etat === 'age') {
    return (
      <>
        <Clock className="mx-auto h-12 w-12 text-amber-500" />
        <h1 className="mt-4 text-2xl font-extrabold text-foreground">Inscription en ligne impossible</h1>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          Il faut avoir au moins 14 ans pour s&apos;inscrire en ligne. Les plus jeunes s&apos;inscrivent par leur école. Aucun compte n&apos;a été créé.
        </p>
        <Link href="/" className={`${bouton} mt-6`}>Retour à l&apos;accueil</Link>
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

  const messages: Partial<Record<Etat, string>> = {
    motdepasse: 'Ce mot de passe n\u2019est pas celui choisi à l\u2019inscription. Si vous n\u2019avez pas fait cette inscription vous-même, ignorez ce courriel.',
    trop: 'Trop d\u2019essais. Réessayez dans une heure.',
    erreur: 'Une erreur est survenue. Vérifiez votre connexion et réessayez.',
  };

  return (
    <form onSubmit={confirmer}>
      <MailCheck className="mx-auto h-12 w-12 text-primary" />
      <h1 className="mt-4 text-2xl font-extrabold text-foreground">Confirmez votre inscription</h1>
      <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
        Pour prouver que c&apos;est bien vous, saisissez le mot de passe que vous avez choisi à l&apos;inscription.
      </p>
      <div className="mt-5 text-left">
        <label htmlFor="mdp-confirmation" className="mb-1.5 block text-sm font-semibold text-foreground">Mot de passe choisi à l&apos;inscription</label>
        <PasswordInput
          id="mdp-confirmation"
          value={motDePasse}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMotDePasse(e.target.value)}
          autoComplete="current-password"
          required
          className="w-full rounded-xl border border-border bg-muted px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      {messages[etat] && (
        <p role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-left text-sm text-red-500">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          {messages[etat]}
        </p>
      )}
      <button type="submit" disabled={etat === 'envoi' || !motDePasse} className={`${bouton} mt-6`}>
        {etat === 'envoi' ? <><Loader2 className="h-4 w-4 animate-spin" /> Confirmation…</> : 'Confirmer mon inscription'}
      </button>
    </form>
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
