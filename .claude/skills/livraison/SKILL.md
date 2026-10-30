---
name: livraison
description: Livre une modification de SavoirIA proprement — vérifie la branche, installe, construit, vérifie les types, fait relire la sécurité par l'agent relecteur-securite, puis commite, pousse et donne le lien de la Pull Request. À utiliser quand le propriétaire demande de livrer, envoyer ou préparer une PR.
---

# Livraison d'une modification SavoirIA

Le propriétaire ne connaît pas le code. À chaque étape, dis-lui en une phrase simple, en français, ce que tu fais. Si une étape échoue, arrête-toi, explique pourquoi en français simple, et ne pousse rien.

## 1. Vérifier la branche

- Lance `git branch --show-current`. Si c'est `main`, ne continue pas sur `main` : propose un nom de nouvelle branche (`feat/…`, `fix/…` ou `docs/…`), crée-la avec `git checkout -b`, les changements non commités suivent.
- Lance `git status --short` et `git diff --stat main...HEAD`, puis résume au propriétaire, en une ou deux phrases, ce que la branche change.

## 2. Installer et construire

- Lance `npm install`.
- Lance le build **sans accès à la base de données**, pour ne jamais modifier la vraie base :
  `env -u DATABASE_URL -u VERCEL_ENV npm run build`
- Si le build échoue : arrête-toi et explique l'erreur.

## 3. Vérifier les types

Le build ne vérifie pas les erreurs de types (`ignoreBuildErrors: true` dans `next.config.js`). Lance donc `npx tsc --noEmit -p .`.
- Ne signale comme bloquantes que les erreurs situées dans les fichiers modifiés par la branche (`git diff --name-only main...HEAD`). Les autres existaient déjà : mentionne-les seulement en une ligne.

## 4. Ranger

Le build et `tsc` modifient tout seuls des fichiers générés. Annule-les pour qu'ils n'entrent pas dans la PR :
`git checkout -- next-env.d.ts tsconfig.tsbuildinfo`
Si `npm install` a modifié `package-lock.json` alors que la branche ne touche pas aux bibliothèques, demande au propriétaire s'il faut l'inclure.

## 5. Relecture sécurité (obligatoire, avant tout envoi)

Commite d'abord les changements en attente (message clair en français), pour que le relecteur voie tout dans `git diff main...HEAD`. Ne pousse pas encore.

Appelle ensuite l'agent `relecteur-securite` avec l'outil Agent (`subagent_type: "relecteur-securite"`), en lui donnant le nom de la branche et le résumé de l'étape 1. Attends son rapport, puis :

- `VERDICT : BLOQUANT` → **ne pousse pas**. Explique chaque problème grave au propriétaire en français simple et propose une correction. Après correction, reprends à l'étape 2.
- `VERDICT : À VÉRIFIER` → résume les points au propriétaire et demande-lui s'il veut corriger d'abord ou envoyer quand même. Attends sa réponse.
- `VERDICT : RAS` → continue.

## 6. Envoyer

- Lance `git push -u origin <branche>`.
- Donne le lien de la Pull Request :
  `https://github.com/gmuntu/CS50X-Francophone/compare/main...<branche>?expand=1`

## 7. Compte rendu

Termine par un résumé court en français simple :
- ce que la branche change ;
- résultat du build et de la vérification des types ;
- résultat de la relecture sécurité ;
- ce qu'il reste à faire au propriétaire (ouvrir et fusionner la PR, puis revenir sur `main` avec `git pull`).
