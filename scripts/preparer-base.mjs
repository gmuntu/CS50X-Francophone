// Mise à jour du schéma de la base au moment du build.
// - Production seulement : les versions de test (Preview) ne touchent plus la vraie base.
// - Jamais de suppression de données (pas de --accept-data-loss) : un changement dangereux arrête le build.
// - Le contenu de départ (seed) n'est plus relancé à chaque build : « npm run db:seed » à la main.
import { execSync } from 'node:child_process';

const env = process.env.VERCEL_ENV;
if (env && env !== 'production') {
  console.log(`[base] Déploiement ${env} : schéma de la base non modifié.`);
  process.exit(0);
}
if (!process.env.DATABASE_URL) {
  console.log('[base] Pas de DATABASE_URL : étape ignorée.');
  process.exit(0);
}
for (let essai = 1; essai <= 3; essai++) {
  try {
    execSync('npx prisma db push --skip-generate', { stdio: 'inherit' });
    process.exit(0);
  } catch {
    console.error(`[base] Essai ${essai} échoué (base en sommeil ?)`);
    if (essai < 3) execSync('sleep 5');
  }
}
console.error('[base] ERREUR : la base n\'a pas pu être mise à jour. Build arrêté pour éviter un site cassé.');
process.exit(1);
