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
- Une seule vérification à la fois. Les autres attendent, puis reçoivent « occupé » après 20 s.
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

Pour que SavoirIA en ligne puisse joindre le service, il faudra le rendre accessible en HTTPS par le proxy déjà présent sur le serveur. Cela se décidera à l'installation.

## Essai

Avec un dossier d'enregistrements WAV 16 kHz (voir l'en-tête de `tester.py`) :

```bash
CLE_SERVICE=... python -I tester.py <dossier>
```

Mesures sur un Mac M1, avec 1 seul processeur et 6 voix de synthèse :
- 72 vérifications sur 72 correctes : aucun imposteur accepté, aucun vrai étudiant refusé ;
- 4 imposteurs classés « doute », donc envoyés à un formateur ;
- 0,6 s par vérification ;
- 10 demandes simultanées traitées en 5 s ;
- environ 680 Mo de mémoire.

**Les seuils (`SEUIL_MEME`, `SEUIL_DOUTE`) devront être réglés sur de vraies voix pendant le pilote.**
