// Rattache chaque élève à sa formation dans la table InscriptionFormation, puis vérifie que rien n'a été perdu.
// - N'écrit QUE dans InscriptionFormation : la table des comptes (User) n'est jamais modifiée.
// - Peut être relancé sans risque : il n'ajoute que ce qui manque.
// - Règle : un élève sans aucune inscription est un élève d'avant les formations multiples, donc un élève de CS50x.
// - Pendant la transition (tant que l'admin écrit encore sur le compte), l'inscription CS50x est recopiée du compte
//   à chaque déploiement. À couper (RECOPIER_DEPUIS_LE_COMPTE = false) quand l'admin validera par formation.
import { PrismaClient } from '@prisma/client';

export const FORMATION_HISTORIQUE = 'cs50x';
const RECOPIER_DEPUIS_LE_COMPTE = true;

// Statut du compte -> statut de l'inscription.
const STATUT = `CASE u.status::text WHEN 'ACTIVE' THEN 'VALIDEE' WHEN 'SUSPENDED' THEN 'SUSPENDUE' ELSE 'EN_ATTENTE' END`;

export async function rattacherInscriptions(prisma) {
  // 1. Élèves sans aucune inscription : inscription CS50x copiée de leur compte.
  const ajoutees = await prisma.$executeRawUnsafe(`
    INSERT INTO "InscriptionFormation"
      ("id", "userId", "formation", "statut", "studentType", "university", "paymentStatus", "paymentMethod", "paymentAmount", "courseSessionId", "valideeLe", "createdAt", "updatedAt")
    SELECT 'ins' || md5(u.id || '${FORMATION_HISTORIQUE}'), u.id, '${FORMATION_HISTORIQUE}', ${STATUT},
           u."studentType", u.university, u."paymentStatus", u."paymentMethod", u."paymentAmount", u."courseSessionId",
           CASE WHEN u.status::text = 'ACTIVE' THEN u."createdAt" END, u."createdAt", now()
    FROM "User" u
    WHERE u.role::text = 'STUDENT'
      AND NOT EXISTS (SELECT 1 FROM "InscriptionFormation" i WHERE i."userId" = u.id)
    ON CONFLICT ("userId", "formation") DO NOTHING`);

  // 2. Transition : l'inscription CS50x suit le compte (validation ou paiement modifiés dans l'admin depuis le dernier déploiement).
  let recopiees = 0;
  if (RECOPIER_DEPUIS_LE_COMPTE) {
    recopiees = await prisma.$executeRawUnsafe(`
      UPDATE "InscriptionFormation" i SET
        "statut" = ${STATUT}, "studentType" = u."studentType", "university" = u.university,
        "paymentStatus" = u."paymentStatus", "paymentMethod" = u."paymentMethod", "paymentAmount" = u."paymentAmount",
        "courseSessionId" = u."courseSessionId",
        "valideeLe" = CASE WHEN u.status::text = 'ACTIVE' THEN COALESCE(i."valideeLe", now()) END,
        "updatedAt" = now()
      FROM "User" u
      WHERE u.id = i."userId" AND i."formation" = '${FORMATION_HISTORIQUE}' AND u.role::text = 'STUDENT'
        AND (i."statut", i."studentType", i.university, i."paymentStatus", i."paymentMethod", i."paymentAmount", i."courseSessionId")
            IS DISTINCT FROM (${STATUT}, u."studentType", u.university, u."paymentStatus", u."paymentMethod", u."paymentAmount", u."courseSessionId")`);
  }
  return { ajoutees: Number(ajoutees), recopiees: Number(recopiees) };
}

const nombres = (lignes) => Object.fromEntries(lignes.map((l) => [String(l.cle), Number(l.n)]));

/**
 * Compare les comptes et les inscriptions : aucun élève sans inscription, et pour les élèves de CS50x,
 * même nombre, mêmes statuts, mêmes paiements que sur leur compte.
 * (Un élève inscrit seulement à une autre formation n'a pas d'inscription CS50x : c'est normal.)
 */
export async function verifierInscriptions(prisma) {
  const eleves = `FROM "User" u WHERE u.role::text = 'STUDENT'`;
  const inscrits = `FROM "InscriptionFormation" i JOIN "User" u ON u.id = i."userId" WHERE u.role::text = 'STUDENT' AND i."formation" = '${FORMATION_HISTORIQUE}'`;
  // Comptes des élèves de CS50x (ceux qui ont une inscription CS50x).
  const elevesCs50x = `${eleves} AND EXISTS (SELECT 1 FROM "InscriptionFormation" c WHERE c."userId" = u.id AND c."formation" = '${FORMATION_HISTORIQUE}')`;
  const q = (sql) => prisma.$queryRawUnsafe(sql);
  const total = Number((await q(`SELECT count(*)::int AS n ${eleves}`))[0].n);
  const totalCs50x = Number((await q(`SELECT count(*)::int AS n ${elevesCs50x}`))[0].n);
  const sansInscription = Number((await q(`SELECT count(*)::int AS n ${eleves} AND NOT EXISTS (SELECT 1 FROM "InscriptionFormation" i WHERE i."userId" = u.id)`))[0].n);
  const rapport = {
    eleves: total,
    elevesSansInscription: sansInscription,
    elevesCs50x: totalCs50x,
    inscriptionsCs50x: Number((await q(`SELECT count(*)::int AS n ${inscrits}`))[0].n),
    statutsComptes: nombres(await q(`SELECT ${STATUT} AS cle, count(*)::int AS n ${elevesCs50x} GROUP BY 1`)),
    statutsInscriptions: nombres(await q(`SELECT i."statut" AS cle, count(*)::int AS n ${inscrits} GROUP BY 1`)),
    paiementsComptes: nombres(await q(`SELECT u."paymentStatus" AS cle, count(*)::int AS n ${elevesCs50x} GROUP BY 1`)),
    paiementsInscriptions: nombres(await q(`SELECT i."paymentStatus" AS cle, count(*)::int AS n ${inscrits} GROUP BY 1`)),
    montantComptes: Number((await q(`SELECT COALESCE(sum(u."paymentAmount"), 0)::float AS n ${elevesCs50x}`))[0].n),
    montantInscriptions: Number((await q(`SELECT COALESCE(sum(i."paymentAmount"), 0)::float AS n ${inscrits}`))[0].n),
    // Élève par élève : une inscription CS50x qui ne correspond pas exactement à son compte.
    ecarts: Number((await q(`SELECT count(*)::int AS n ${inscrits}
      AND (i."statut", i."studentType", i.university, i."paymentStatus", i."paymentMethod", i."paymentAmount", i."courseSessionId")
          IS DISTINCT FROM (${STATUT}, u."studentType", u.university, u."paymentStatus", u."paymentMethod", u."paymentAmount", u."courseSessionId")`))[0].n),
  };
  const pareil = (a, b) => JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort());
  const erreurs = [];
  if (rapport.elevesSansInscription !== 0) erreurs.push(`${rapport.elevesSansInscription} élève(s) sans inscription`);
  if (RECOPIER_DEPUIS_LE_COMPTE) {
    if (rapport.inscriptionsCs50x !== totalCs50x) erreurs.push(`${totalCs50x} élèves de CS50x mais ${rapport.inscriptionsCs50x} inscriptions CS50x`);
    if (!pareil(rapport.statutsComptes, rapport.statutsInscriptions)) erreurs.push('les statuts ne correspondent pas');
    if (!pareil(rapport.paiementsComptes, rapport.paiementsInscriptions)) erreurs.push('les statuts de paiement ne correspondent pas');
    if (Math.abs(rapport.montantComptes - rapport.montantInscriptions) > 0.01) erreurs.push('les montants ne correspondent pas');
    if (rapport.ecarts !== 0) erreurs.push(`${rapport.ecarts} inscription(s) différente(s) du compte`);
  }
  return { rapport, erreurs };
}

/** Rattachement + vérification, avec un compte rendu dans le journal du déploiement. Renvoie false si quelque chose manque. */
export async function rattacherEtVerifier() {
  const prisma = new PrismaClient();
  try {
    const comptesAvant = await prisma.$queryRawUnsafe(`SELECT count(*)::int AS n, COALESCE(max("updatedAt"), 'epoch') AS maj FROM "User"`);
    let { ajoutees, recopiees } = await rattacherInscriptions(prisma);
    const comptesApres = await prisma.$queryRawUnsafe(`SELECT count(*)::int AS n, COALESCE(max("updatedAt"), 'epoch') AS maj FROM "User"`);
    let { rapport, erreurs } = await verifierInscriptions(prisma);
    // Le site reste en ligne pendant le déploiement : une inscription ou une validation arrivée entre les deux
    // étapes crée un écart passager. On recommence une fois avant de conclure.
    if (erreurs.length) {
      const encore = await rattacherInscriptions(prisma);
      ajoutees += encore.ajoutees; recopiees += encore.recopiees;
      ({ rapport, erreurs } = await verifierInscriptions(prisma));
    }
    console.log(`[inscriptions] ${ajoutees} inscription(s) CS50x ajoutée(s), ${recopiees} mise(s) à jour depuis le compte.`);
    console.log(`[inscriptions] Comptes : ${comptesAvant[0].n} avant, ${comptesApres[0].n} après (table des comptes non modifiée : ${String(comptesAvant[0].maj) === String(comptesApres[0].maj) ? 'oui' : 'NON'}).`);
    console.log('[inscriptions] Vérification :', JSON.stringify(rapport));
    if (erreurs.length) { console.error('[inscriptions] ÉCART : ' + erreurs.join(' ; ')); return false; }
    console.log('[inscriptions] Tout correspond : même nombre d\'élèves, mêmes statuts, mêmes paiements.');
    return true;
  } finally {
    await prisma.$disconnect();
  }
}

// Lancé à la main : node scripts/rattacher-inscriptions.mjs
if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit((await rattacherEtVerifier()) ? 0 : 1);
}
