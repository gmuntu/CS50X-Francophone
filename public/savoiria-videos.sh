#!/usr/bin/env bash
# =====================================================================
#  SavoirIA LOCAL — copie les vidéos des cours sur l'ordinateur, pour les
#  regarder sans Internet (cours, problèmes, Agora, tuteur).
#
#  Prérequis : savoiria-local.sh déjà installé.
#  Utilisation (avec Internet, environ 10 à 15 Go) :
#     sudo bash savoiria-videos.sh
#  Relancé ensuite par savoiria-maj : seules les vidéos nouvelles sont téléchargées.
#  Pour ne jamais télécharger de vidéos sur cet ordinateur (forfait limité) :
#     sudo touch /var/lib/savoiria/.sans-videos
#  Les vidéos peuvent aussi venir d'une clé USB : il suffit de les copier dans
#  /opt/savoiria/videos (fichiers <identifiant>.mp4).
# =====================================================================
set -euo pipefail

DOSSIER="/opt/savoiria"
SITE_DIR="$DOSSIER/site"
VIDEOS="$DOSSIER/videos"
QUALITE="${QUALITE:-480}"
OUTIL="$DOSSIER/ytdlp-venv/bin/yt-dlp"

[[ $EUID -eq 0 ]] || { echo "Lancez ce script avec sudo."; exit 1; }
[ -d "$SITE_DIR/config" ] || { echo "Installez d'abord savoiria-local.sh"; exit 1; }
[ -f /var/lib/savoiria/.sans-videos ] && { echo "Vidéos désactivées sur cet ordinateur (/var/lib/savoiria/.sans-videos)."; exit 0; }
export DEBIAN_FRONTEND=noninteractive

echo "==> 1/3  Outils (ffmpeg, yt-dlp)"
command -v ffmpeg >/dev/null || apt-get install -y ffmpeg
if ! [ -x "$OUTIL" ]; then
  python3 -m venv "$DOSSIER/ytdlp-venv"
  "$DOSSIER/ytdlp-venv/bin/pip" install --quiet --upgrade pip
fi
# YouTube change souvent : yt-dlp doit être à jour pour continuer à fonctionner.
"$DOSSIER/ytdlp-venv/bin/pip" install --quiet --upgrade yt-dlp || true
install -d -o savoiria -g savoiria -m 755 "$VIDEOS"

echo "==> 2/3  Liste des vidéos des cours"
# Identifiants YouTube cités dans la configuration du site : …/embed/<id> et yt('<id>').
IDS=$(grep -hoE "(embed/|yt\(')[A-Za-z0-9_-]{11}" "$SITE_DIR"/config/*.ts | grep -oE '[A-Za-z0-9_-]{11}$' | awk '!vu[$0]++')
TOTAL=$(echo "$IDS" | grep -c . || true)
echo "   $TOTAL vidéos"

echo "==> 3/3  Téléchargement (seulement celles qui manquent)"
OK=0; ECHECS=0
for ID in $IDS; do
  [[ "$ID" =~ ^[A-Za-z0-9_-]{11}$ ]] || continue
  if [ -f "$VIDEOS/$ID.mp4" ]; then OK=$((OK+1)); continue; fi
  # Téléchargé par le compte du site, jamais par l'administrateur
  if sudo -u savoiria "$OUTIL" --js-runtimes node -q --no-progress --no-warnings \
       -f "bv*[height<=$QUALITE][vcodec^=avc1]+ba[ext=m4a]/b[height<=$QUALITE][ext=mp4]" \
       --merge-output-format mp4 --write-subs --sub-langs "fr,en" --convert-subs vtt \
       -P "$VIDEOS" -P "temp:$VIDEOS/.temp" -o "%(id)s.%(ext)s" "https://www.youtube.com/watch?v=$ID"; then
    echo "   [OK] $ID"; OK=$((OK+1))
  else
    echo "   [ÉCHEC] $ID (nouvel essai à la prochaine mise à jour)"; ECHECS=$((ECHECS+1))
  fi
done
rm -rf "$VIDEOS/.temp"
chmod -R a+rX "$VIDEOS"

echo
echo "Vidéos sur cet ordinateur : $OK / $TOTAL ($(du -sh "$VIDEOS" | cut -f1))"
[ "$ECHECS" -eq 0 ] || echo "$ECHECS vidéo(s) à réessayer : relancez sudo bash savoiria-videos.sh"
