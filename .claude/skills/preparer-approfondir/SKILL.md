---
name: preparer-approfondir
description: Prépare le cours « Approfondir le sujet » d'une semaine CS50x (content/approfondir/semaine-N.json) à partir de documents sous licence libre, avec validation du propriétaire avant tout import.
---

# Préparer « Approfondir le sujet » pour une semaine

Le propriétaire ne connaît pas le code : parle-lui en français simple et bref.
Argument : un numéro de leçon (adresse /courses/cs50x/lessons/<N>), ou un groupe de semaines.

## 1. Lire le cours de la semaine
- Résumé SavoirIA en base, **en lecture seule** (table VideoSummary : overview, keyConcepts, timelineBreakdown) ;
  ne jamais écrire dans la base.
- `config/course-modules.ts` (titre, sujets), `content/course-sources/semaine<N>.txt` s'il existe, transcriptions.
- En tirer 5 à 8 notions clés à comprendre.

## 2. Chercher les documents
- Garder au plus 10 documents (12 si le propriétaire en ajoute), les plus pertinents pour ces notions, de préférence en français.
- **Licences acceptées** : CC BY, CC BY-SA, CC0, domaine public (vérifier la mention sur la page même du document).
- Licence « NC » (pas d'usage commercial, ex. CS50 en CC BY-NC-SA) : la signaler à part, ne pas l'utiliser sans accord.
- Écarter tout document sans licence claire. **Jamais de téléchargement YouTube.**

## 3. Validation (obligatoire)
- Montrer la liste (titre, URL, auteur, licence, notions couvertes) au propriétaire, par groupe de 3 semaines.
- **Ne rien importer avant son accord.**

## 4. Extraire et produire le fichier
- Seulement les passages utiles (explication, exemple, schéma, comparaison), reformulés brièvement en français,
  avec leur page d'origine (numéro de page d'un PDF, ou « § Section » d'une page web).
- Écrire `content/approfondir/semaine-<N>.json` au format de `lib/approfondir/types.ts`
  (documents avec titre, url, auteur, licence, licenceUrl ; notions avec page, schéma, différences, passages, infographie).
- Ajouter l'import dans `lib/approfondir/contenus.ts` (FICHIERS).
- Lancer `npm test` (le test vérifie chaque fichier : licence, auteur, page).

## 5. Sauvegarder
- Un commit par semaine terminée (« Approfondir : semaine N »), pour ne rien perdre.
- Dire au propriétaire où on s'est arrêté.
- Les fichiers font partie du site : ils entrent automatiquement dans la prochaine poste-vN (hors ligne).
