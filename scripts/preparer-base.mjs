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
let pousse = false;
for (let essai = 1; essai <= 3; essai++) {
  try {
    execSync('npx prisma db push --skip-generate', { stdio: 'inherit' });
    pousse = true;
    break;
  } catch {
    console.error(`[base] Essai ${essai} échoué (base en sommeil ?)`);
    if (essai < 3) execSync('sleep 5');
  }
}
if (!pousse) {
  console.error('[base] ERREUR : la base n\'a pas pu être mise à jour. Build arrêté pour éviter un site cassé.');
  process.exit(1);
}

// Formations multiples : chaque élève est rattaché à sa formation, puis on vérifie que rien n'a été perdu.
// N'écrit que dans la nouvelle table ; un écart arrête le build (l'ancien site reste en ligne, les comptes sont intacts).
const { rattacherEtVerifier } = await import('./rattacher-inscriptions.mjs');
try {
  if (!(await rattacherEtVerifier())) process.exit(1);
} catch (e) {
  console.error('[inscriptions] ERREUR pendant le rattachement :', e?.message ?? e);
  process.exit(1);
}
process.exit(0);
