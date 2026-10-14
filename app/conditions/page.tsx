import LegalPage from '@/components/legal-page';
import { LEGAL } from '@/lib/legal';

export const metadata = { title: "Conditions d'utilisation · SavoirIA" };

export default function ConditionsPage() {
  const mail = <a className="font-semibold text-blue-700 dark:text-blue-300 underline" href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>;
  return (
    <LegalPage title="Conditions d'utilisation" updated={LEGAL.updated}
      summary="SavoirIA est un accompagnement indépendant en français. Utilisez-le pour apprendre, respectez les autres, et vérifiez ce que dit l'IA.">
      <h2>1. Le service</h2>
      <p>SavoirIA propose des formations en ligne en français : résumés, podcasts, quiz, tuteur Socrate (intelligence artificielle) à l'écrit, à l'oral et sur WhatsApp, et un mode hors ligne. Le service peut évoluer, être amélioré ou interrompu temporairement.</p>

      <h2>2. Votre compte</h2>
      <ul>
        <li>Une personne = un compte. Les informations fournies doivent être exactes.</li>
        <li>Gardez votre mot de passe secret ; vous êtes responsable de ce qui est fait avec votre compte.</li>
        <li>Les codes testeurs donnent un accès temporaire, jusqu'à la date indiquée.</li>
        <li>Âge : {LEGAL.minAge} ans et plus, ou plus jeune avec l'accord d'un parent ou tuteur légal.</li>
      </ul>

      <h2>3. Socrate et l'intelligence artificielle</h2>
      <p>Socrate est une IA : il peut se tromper. Ses réponses servent à apprendre et ne remplacent ni un enseignant, ni un avis professionnel (juridique, médical, financier…). Vérifiez les informations importantes. Des limites d'utilisation quotidiennes peuvent s'appliquer.</p>

      <h2>4. Contenus et licences</h2>
      <ul>
        <li>CS50x : cours de l'Université Harvard (David J. Malan), sous licence Creative Commons BY-NC-SA 4.0, traduit et accompagné en français par SavoirIA, pour un usage non commercial.</li>
        <li>Les formations créées par SavoirIA (ex. « L'essentiel de l'IA ») appartiennent à SavoirIA ; usage personnel uniquement, pas de revente ni de copie massive.</li>
        <li>SavoirIA n'est affilié ni à l'Université Harvard / CS50, ni à Google, Microsoft, Amazon Web Services ou CompTIA. Les marques citées appartiennent à leurs propriétaires.</li>
      </ul>

      <h2>5. Attestations et certificats</h2>
      <p>L'attestation SavoirIA prouve que vous avez réussi une formation sur la plateforme. Elle ne remplace pas les certificats officiels (CS50, Google, Microsoft…), délivrés par ces organismes selon leurs propres conditions et tarifs. La triche peut entraîner l'annulation d'une attestation.</p>

      <h2>6. Ce qui est interdit</h2>
      <ul>
        <li>Tricher (quiz, projets), partager ou revendre son compte.</li>
        <li>Publier ou envoyer des contenus illégaux, haineux, harcelants ou trompeurs.</li>
        <li>Tenter d'abuser du service : robots, envois massifs, contournement des limites, attaques.</li>
      </ul>

      <h2>7. Suspension et fermeture</h2>
      <p>Nous pouvons suspendre un compte qui ne respecte pas ces conditions. Vous pouvez fermer votre compte à tout moment en écrivant à {mail}.</p>

      <h2>8. Responsabilité</h2>
      <p>SavoirIA fait de son mieux pour offrir un service fiable et des contenus exacts, sans pouvoir garantir l'absence d'erreurs ou d'interruptions, ni la réussite à un examen. Dans la mesure permise par la loi, SavoirIA n'est pas responsable des dommages indirects liés à l'utilisation du service.</p>

      <h2>9. Droit applicable et contact</h2>
      <p>Ces conditions sont régies par le droit applicable au lieu d'exploitation du service ({LEGAL.location}), sous réserve des droits impératifs dont vous bénéficiez dans votre pays. Questions : {mail}.</p>
    </LegalPage>
  );
}
