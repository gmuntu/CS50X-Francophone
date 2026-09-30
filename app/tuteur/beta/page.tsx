import { redirect } from 'next/navigation';

/** Ancienne adresse de test : redirige vers l'Agora. */
export default function TuteurBetaRedirect() {
  redirect('/agora');
}
