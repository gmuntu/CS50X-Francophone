import LegalPage from '@/components/legal-page';
import { LEGAL } from '@/lib/legal';

export const metadata = { title: 'Politique de confidentialité · SavoirIA' };

export default function ConfidentialitePage() {
  const mail = <a className="font-semibold text-blue-700 dark:text-blue-300 underline" href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>;
  return (
    <LegalPage title="Politique de confidentialité" updated={LEGAL.updated}
      summary="nous collectons le minimum pour vous former. Nous ne vendons jamais vos données. Vous pouvez demander à tout moment de les consulter, de les corriger ou de les supprimer.">
      <h2>1. Qui sommes-nous ?</h2>
      <p>Le service SavoirIA est exploité par {LEGAL.operator} ({LEGAL.location}). Pour toute question sur vos données : {mail}.</p>

      <h2>2. Ce que nous collectons et pourquoi</h2>
      <table><thead><tr><th>Donnée</th><th>Pourquoi</th></tr></thead><tbody>
        <tr><td>Prénom, nom, courriel, mot de passe (enregistré chiffré, jamais en clair)</td><td>Créer et protéger votre compte, vous écrire (mot de passe oublié, avis)</td></tr>
        <tr><td>Pays, type d'élève, établissement (s'il y a lieu)</td><td>Adapter la formation, gérer les partenariats avec les établissements</td></tr>
        <tr><td>Photo de vérification</td><td>Confirmer votre identité, notamment pour les attestations</td></tr>
        <tr><td>Numéro de téléphone (facultatif)</td><td>Utiliser Socrate par WhatsApp ou SMS</td></tr>
        <tr><td>Progression, résultats de quiz, exercices et projets</td><td>Suivre votre formation, ouvrir les semaines suivantes, délivrer l'attestation</td></tr>
        <tr><td>Vos questions à Socrate (texte et voix)</td><td>Vous répondre. Les enregistrements de voix servent seulement à la réponse et ne sont pas conservés par SavoirIA.</td></tr>
        <tr><td>Empreinte SavoirIA (3 photos du visage et 15 s de voix), photos et voix prises pendant l'examen oral (avec votre accord)</td><td>Vérifier que c'est bien vous qui passez les examens, par comparaison avec votre empreinte. Stockées chez Vercel, supprimées 6 mois après la fin de la formation.</td></tr>
        <tr><td>Demandes « Me prévenir »</td><td>Vous avertir de l'ouverture d'une formation</td></tr>
      </tbody></table>

      <h2>3. Avec qui vos données sont partagées</h2>
      <p>Uniquement avec les services nécessaires au fonctionnement de SavoirIA :</p>
      <ul>
        <li><b>Google (Gemini, synthèse et reconnaissance vocale)</b> : réponses de Socrate, voix des podcasts, compréhension de vos questions orales.</li>
        <li><b>Twilio</b> : messages WhatsApp et SMS avec Socrate.</li>
        <li><b>Vercel</b> et <b>Neon</b> : hébergement du site et de la base de données.</li>
        <li><b>Resend</b> : envoi des courriels.</li>
      </ul>
      <p>Ces services peuvent traiter des données hors de votre pays (notamment aux États-Unis et en Europe). Nous ne vendons ni ne louons vos données, et nous ne faisons pas de publicité.</p>

      <h2>4. Le mode hors ligne</h2>
      <p>Les semaines que vous enregistrez restent sur votre appareil (téléphone ou ordinateur). Elles sont effacées quand vous vous déconnectez ou les retirez.</p>

      <h2>5. Combien de temps nous gardons vos données</h2>
      <p>Tant que votre compte est actif. Si vous supprimez votre compte, vos données sont effacées dans un délai de 30 jours, sauf obligation légale de les conserver. Les comptes testeurs expirent à la date prévue.</p>

      <h2>6. Vos droits</h2>
      <p>Vous pouvez demander l'accès à vos données, leur correction, leur suppression, ou retirer votre consentement (par exemple au service WhatsApp). Écrivez à {mail} ; nous répondons dans un délai de 30 jours.</p>

      <h2>7. Âge minimum</h2>
      <p>SavoirIA s'adresse aux personnes de {LEGAL.minAge} ans et plus. Les plus jeunes peuvent l'utiliser avec l'accord et l'accompagnement d'un parent ou d'un tuteur légal.</p>

      <h2>8. Sécurité</h2>
      <p>Connexion chiffrée (HTTPS), mots de passe chiffrés, accès administrateur limité. Aucun système n'est parfait : prévenez-nous à {mail} si vous constatez un problème.</p>

      <h2>9. Modifications</h2>
      <p>Nous pouvons mettre à jour cette politique. La date en haut de page indique la dernière version ; en cas de changement important, nous vous préviendrons.</p>
    </LegalPage>
  );
}
