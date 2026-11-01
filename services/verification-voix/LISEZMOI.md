# Service de vérification vocale SavoirIA

Une petite boîte (conteneur Docker) qui répond à deux questions :

1. **`/signature`** : à partir d'un enregistrement, fabriquer la signature vocale de l'étudiant (512 nombres).
2. **`/verifier`** : cette voix correspond-elle à la signature ? La personne a-t-elle lu les bons chiffres ?

Le service **ne garde rien** : pas de voix, pas de signature, pas de texte, aucun contenu dans les journaux. C'est SavoirIA qui :
- tire les chiffres au hasard ;
- vérifie que chaque défi ne sert qu'une fois ;
- mesure le délai ;
- garde la signature chiffrée ;
- décide. En cas de doute, la décision revient à un formateur.

| Résultat `voix` | Sens |
|---|---|
| `meme` | même personne |
| `doute` | à faire examiner par un formateur |
| `differente` | voix différente (examen par un formateur, jamais de sanction automatique) |

## Modèles (libres, sans Internet une fois installés)

- **Voix :** ERes2Net (3D-Speaker), via sherpa-onnx.
- **Chiffres lus :** Whisper base int8, via sherpa-onnx.

Les modèles sont téléchargés à la construction de la boîte, et leurs empreintes SHA-256 sont vérifiées. Les versions des bibliothèques Python sont figées, avec leurs empreintes.

## Limites de sécurité (docker-compose.yml)

- 1 Go de mémoire et 1 processeur au plus : le service ne peut pas gêner les autres applications du serveur.
- Une seule vérification à la fois, 4 demandes au plus en attente. Au-delà, « occupé » tout de suite : SavoirIA réessaie quelques secondes plus tard.
- Port ouvert seulement sur le serveur lui-même (`127.0.0.1:8770`).
- Chaque demande doit porter la clé secrète `CLE_SERVICE`.
- Système de fichiers en lecture seule, aucun privilège, utilisateur sans droits.

## Installation sur le serveur (guidée pas à pas avec le propriétaire)

```bash
# dans ce dossier, sur le serveur
echo "CLE_SERVICE=$(openssl rand -hex 32)" > .env && chmod 600 .env
docker compose up -d --build
curl http://127.0.0.1:8770/sante      # doit répondre « ok »
```

La même clé est ensuite mise dans Vercel (variable `VOIX_IDENTITE_CLE`).

Pour que SavoirIA en ligne puisse joindre le service, il faudra le rendre accessible en HTTPS par le proxy déjà présent sur le serveur (Traefik, nginx…). Cela se décidera à l'installation, avec trois règles :
- **ne jamais ouvrir le port 8770 directement sur Internet**, ni en HTTP simple : la signature vocale est une donnée biométrique ;
- dans le proxy, fixer **des délais courts et une limite de connexions par adresse**, pour qu'un inconnu ne puisse pas occuper le service sans la clé ;
- **SavoirIA ne montre jamais le score ni les chiffres entendus à l'élève**, seulement « réussi » ou « à revoir par un formateur ». Il ne les écrit pas non plus dans ses journaux.

## Protections contre la triche

- **Défi court (10 s au plus) :** juste le temps de lire les chiffres.
- **Presque rien d'autre que les chiffres :** 2 mots en plus au maximum.
- **Ressemblance mesurée sur tout l'enregistrement et sur chaque moitié :** un vieil enregistrement de l'étudiant suivi des chiffres lus par quelqu'un d'autre échoue.

## Essai

Avec un dossier d'enregistrements WAV 16 kHz (voir l'en-tête de `tester.py`) :

```bash
CLE_SERVICE=... python -I tester.py <dossier>
```

Mesures sur un Mac M1, avec 1 seul processeur et 6 voix de synthèse :
- 72 vérifications sur 72 correctes : aucun imposteur accepté, aucun vrai étudiant refusé ;
- 2 imposteurs classés « doute », donc envoyés à un formateur ;
- 0,8 s par vérification ;
- « Vieil enregistrement + chiffres lus par un autre » : refusé (chiffres en trop, voix différente) ;
- 10 demandes simultanées : 4 traitées, 6 reçoivent « occupé » tout de suite ;
- environ 680 Mo de mémoire.

**Le modèle de voix a été entraîné sur des voix chinoises, et l'essai ne porte que sur 6 voix de synthèse. Ces résultats ne prouvent donc pas encore grand-chose : les seuils (`SEUIL_MEME`, `SEUIL_DOUTE`) devront être réglés sur de vraies voix pendant le pilote.** Une voix imitée par une IA n'est pas détectée : c'est pour cela qu'un formateur décide toujours en cas de doute.
