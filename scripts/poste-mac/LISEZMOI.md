# Voix naturelle et micro hors ligne sur Mac

Pour un Mac **Apple Silicon** (M1, M2…) qui fait tourner SavoirIA **sans Internet** (mode `SAVOIRIA_LOCAL=1`, avec Gemma 4 dans Ollama).

| Rôle | Outil | Sans Internet |
|---|---|---|
| Socrate parle (voix « Ryan ») | Qwen3-TTS via mlx-audio | ✅ |
| L'étudiante des podcasts parle (voix « Vivian ») | Qwen3-TTS via mlx-audio | ✅ |
| Socrate comprend le micro | Whisper (whisper.cpp) | ✅ |

## Installation (une fois, avec Internet)

```bash
bash scripts/poste-mac/installer-voix.sh
```

- Environ **4,5 Go** à télécharger (voix et modèle Whisper « base »). Le téléchargement de Whisper reprend tout seul si la connexion coupe.
- Pour une meilleure reconnaissance du micro : `WHISPER_TAILLE=small bash scripts/poste-mac/installer-voix.sh` (470 Mo au lieu de 148).
- À la fin, le script affiche **trois lignes à ajouter dans `.env.local`**, puis il faut reconstruire le site (`npm run build`) et le relancer.

Le serveur de voix démarre ensuite tout seul à chaque ouverture de session. Il **n'écoute que le Mac lui-même** (`127.0.0.1:8766`), n'accepte que des demandes JSON adressées à cette adresse, fabrique une voix à la fois (réponse « occupé » après 30 s d'attente), refuse les textes de plus de 2 000 caractères et n'écrit aucun texte d'élève dans ses journaux.

Les téléchargements sont contrôlés : versions Python figées (`requirements-voix.txt`), modèle de voix figé à une version précise, et empreinte SHA-256 du modèle Whisper vérifiée (un fichier abîmé ou modifié est refusé).

## Vérifier

```bash
curl http://127.0.0.1:8766/sante        # doit répondre « ok »
```

Dans SavoirIA : « lire à voix haute » une réponse de Socrate (voix Ryan), lancer un podcast (Ryan et Vivian), puis « Parler avec Socrate » au micro.

## Arrêter ou désinstaller

```bash
launchctl bootout gui/$(id -u)/online.savoiria.voix     # arrête le serveur de voix
rm ~/Library/LaunchAgents/online.savoiria.voix.plist     # plus de démarrage automatique
rm -rf ~/savoiria-voix                                    # supprime voix et modèles
```

## Limites

- **Mac Apple Silicon seulement** : mlx-audio ne fonctionne pas sur les PC Ubuntu des postes. Pour eux, il faudra une autre solution (et mesurer sa vitesse sans carte graphique).
- Les voix « Ryan » et « Vivian » ne sont pas des voix françaises d'origine : un léger accent est possible.
- Si le serveur de voix ne répond pas, SavoirIA se rabat sur Piper (s'il est installé), puis sur la voix du navigateur.
