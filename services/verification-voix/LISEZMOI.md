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
# dans ce dossier, sur le serveur (processeur Intel/AMD : « uname -m » doit répondre x86_64)
echo "CLE_SERVICE=$(openssl rand -hex 32)" > .env && chmod 600 .env
docker compose up -d --build
curl http://127.0.0.1:8770/sante      # doit répondre « ok »
```

La même clé est ensuite mise dans Vercel (variable `VOIX_IDENTITE_CLE`).

### Accès depuis SavoirIA : tunnel Cloudflare séparé

Le service a son propre tunnel Cloudflare (`savoiria-tunnel-voix`), qui ne touche ni au proxy ni aux autres tunnels du serveur :

1. Dans Cloudflare Zero Trust, créer un tunnel dédié, puis copier son jeton **directement dans le serveur** (jamais dans un message) :
   `umask 077 && read -rs -p "Jeton : " T && echo "TUNNEL_TOKEN=$T" > .env.tunnel && unset T`
2. Protéger d'abord `voix.<domaine>` par une application Cloudflare Access, avec une seule règle : action « Service Auth », pour un jeton de service. Jamais « Allow » avec « Everyone ». SavoirIA envoie alors `CF-Access-Client-Id` et `CF-Access-Client-Secret` (variables Vercel), en plus de la clé `CLE_SERVICE`.
3. Dans le tunnel, nom public `voix.<domaine>` vers `http://verification-voix:8770`, avec l'option **« Protect with Access »** activée (nom d'équipe et identifiant de l'application Access). Le tunnel refuse alors lui-même toute demande sans jeton Access valide, même si l'application Access est un jour supprimée ou mal réglée.
4. Lancer, seulement une fois `.env.tunnel` créé (sinon le tunnel redémarre en boucle) : `docker compose --profile tunnel up -d`.
5. Vérifier depuis n'importe quel ordinateur que `curl -i https://voix.<domaine>/sante`, **sans** les en-têtes Access, est refusé (403, ou redirection vers une page de connexion Cloudflare).

Trois règles dans tous les cas :
- **ne jamais ouvrir le port 8770 directement sur Internet**, ni en HTTP simple : la signature vocale est une donnée biométrique ;
- devant le service, **n'accepter que SavoirIA** : c'est Cloudflare Access qui bloque les inconnus, pour qu'ils ne puissent pas occuper le service sans la clé. Cloudflare n'offre pas de limite du nombre total de connexions. On peut ajouter une règle de limite de débit sur `voix.<domaine>` si l'offre du compte le permet. Le service lui-même n'accepte que 16 connexions à la fois, coupe une connexion silencieuse après 10 s et toute demande qui n'est pas arrivée en entier après 15 s ;
- **SavoirIA ne montre jamais le score ni les chiffres entendus à l'élève**, seulement « réussi » ou « à revoir par un formateur ». Il ne les écrit pas non plus dans ses journaux.

## Protections contre la triche

- **Défi court (10 s au plus) :** juste le temps de lire les chiffres.
- **Presque rien d'autre que les chiffres :** 2 mots en plus au maximum.
- **Ressemblance mesurée sur tout l'enregistrement et sur chaque morceau de 2,5 s, même chuchoté :** si une autre voix parle à un moment, au début, au milieu ou à la fin, le morceau où elle parle fait échouer la vérification.
- **Trop peu de voix pour conclure :** jamais « même personne ». Le résultat est « doute » (un formateur regarde), sauf si la voix entendue est nettement différente.
- **Whisper n'entend pas la voix vraiment trop basse :** une voix sous le seuil de silence ne peut pas servir à lire les chiffres. Une voix juste au-dessus, qui parle par à-coups, donne au pire « doute » : un formateur regarde.

## Essai

Avec un dossier d'enregistrements WAV 16 kHz (voir l'en-tête de `tester.py`) :

```bash
CLE_SERVICE=... python -I tester.py <dossier>
```

Mesures sur un Mac M1, avec 1 seul processeur et 6 voix de synthèse :
- 72 vérifications : aucun imposteur accepté, aucun vrai étudiant refusé ;
- 3 cas classés « doute », donc envoyés à un formateur : 2 imposteurs et 1 vrai étudiant ;
- 1 s par vérification ;
- chiffres lus par un autre avant, après ou au milieu d'un vieil enregistrement de l'étudiant : refusé (voix différente) ;
- chiffres lus tout bas par un complice, suivis d'un mot de l'étudiant : refusé ;
- chiffres lus très bas (sous le seuil de comparaison) par un complice : refusés, car Whisper n'entend que ce qui a pu être comparé ;
- autre voix avec un long silence au milieu : « différente » ;
- vrai étudiant qui laisse du silence avant d'arrêter l'enregistrement : accepté (le silence au début et à la fin est retiré) ;
- connexion qui envoie sa demande au compte-gouttes : coupée après 15 s ;
- 10 demandes simultanées : 4 traitées, 6 reçoivent « occupé » tout de suite ;
- environ 680 Mo de mémoire.

**Le modèle de voix a été entraîné sur des voix chinoises, et l'essai ne porte que sur 6 voix de synthèse. Ces résultats ne prouvent donc pas encore grand-chose : les seuils (`SEUIL_MEME`, `SEUIL_DOUTE`) devront être réglés sur de vraies voix pendant le pilote.** Il faudra aussi surveiller le bruit de fond des vrais micros (ventilateur, rue), qui peut faire baisser le score d'un étudiant honnête. Une voix imitée par une IA n'est pas détectée : c'est pour cela qu'un formateur décide toujours en cas de doute.
