#!/usr/bin/env bash
# =====================================================================
#  SavoirIA — voix naturelle et micro hors ligne sur un Mac Apple Silicon
#
#  Installe, pour SavoirIA en mode hors ligne (SAVOIRIA_LOCAL=1) :
#   - la bouche  : Qwen3-TTS (mlx-audio), voix « Ryan » (Socrate) et « Vivian » (l'étudiante)
#   - les oreilles : Whisper (whisper.cpp) et son modèle français
#   - le démarrage automatique du serveur de voix à l'ouverture de session
#  Tout fonctionne ensuite SANS Internet. Voir scripts/poste-mac/LISEZMOI.md.
#
#  Utilisation (une seule fois, avec Internet, sans sudo) :
#     bash scripts/poste-mac/installer-voix.sh
#  Variables possibles : SAVOIRIA_VOIX_DOSSIER (défaut ~/savoiria-voix),
#                        WHISPER_TAILLE (base par défaut, ou small : plus précis, 470 Mo)
# =====================================================================
set -euo pipefail

DOSSIER="${SAVOIRIA_VOIX_DOSSIER:-$HOME/savoiria-voix}"
WHISPER_TAILLE="${WHISPER_TAILLE:-base}"
MODELE_VOIX="mlx-community/Qwen3-TTS-12Hz-0.6B-CustomVoice-8bit"
PORT=8766
ICI="$(cd "$(dirname "$0")" && pwd)"
etape() { echo; echo "== $1"; }

etape "1/5  Vérifications"
[ "$(uname -s)" = "Darwin" ] && [ "$(uname -m)" = "arm64" ] || { echo "Ce script est fait pour un Mac Apple Silicon (M1, M2…)."; exit 1; }
command -v brew >/dev/null || { echo "Installez d'abord Homebrew : https://brew.sh"; exit 1; }
case "$WHISPER_TAILLE" in base|small) ;; *) echo "WHISPER_TAILLE doit valoir base ou small"; exit 1 ;; esac
PY=""
for p in python3.13 python3.12 python3.11 python3; do
  if command -v "$p" >/dev/null && "$p" -c 'import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)'; then PY="$p"; break; fi
done
[ -n "$PY" ] || { echo "Python 3.10 ou plus récent est nécessaire (brew install python)."; exit 1; }
mkdir -p "$DOSSIER"

etape "2/5  Voix naturelle (Qwen3-TTS) — environ 4 Go à télécharger"
[ -x "$DOSSIER/venv/bin/python" ] || "$PY" -m venv "$DOSSIER/venv"
"$DOSSIER/venv/bin/pip" install -q --upgrade pip
"$DOSSIER/venv/bin/pip" install -q "mlx-audio==0.6.3" soundfile
install -m 644 "$ICI/serveur_voix.py" "$DOSSIER/serveur_voix.py"
# Téléchargement du modèle maintenant, pour que tout marche ensuite sans Internet.
"$DOSSIER/venv/bin/python" -I -c "from mlx_audio.tts.utils import load_model; load_model('$MODELE_VOIX')"

etape "3/5  Oreilles (Whisper, modèle $WHISPER_TAILLE)"
brew list whisper-cpp >/dev/null 2>&1 || brew install whisper-cpp
mkdir -p "$DOSSIER/whisper/build/bin" "$DOSSIER/whisper/models"
ln -sf "$(brew --prefix)/bin/whisper-cli" "$DOSSIER/whisper/build/bin/whisper-cli"
MODELE_WHISPER="$DOSSIER/whisper/models/ggml-$WHISPER_TAILLE.bin"
if [ ! -s "$MODELE_WHISPER" ]; then
  # Reprend là où il s'est arrêté si la connexion coupe.
  for essai in 1 2 3 4 5 6 7 8 9 10; do
    curl -fL -C - --retry 3 -o "$MODELE_WHISPER.part" \
      "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-$WHISPER_TAILLE.bin" && break
    echo "   Connexion coupée, nouvel essai ($essai)…"; sleep 5
  done
  mv "$MODELE_WHISPER.part" "$MODELE_WHISPER"
fi

etape "4/5  Démarrage automatique du serveur de voix"
PLIST="$HOME/Library/LaunchAgents/online.savoiria.voix.plist"
mkdir -p "$HOME/Library/LaunchAgents"
cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>online.savoiria.voix</string>
  <key>ProgramArguments</key><array>
    <string>$DOSSIER/venv/bin/python</string><string>-I</string><string>$DOSSIER/serveur_voix.py</string>
  </array>
  <key>EnvironmentVariables</key><dict>
    <key>PORT</key><string>$PORT</string>
    <key>HF_HUB_OFFLINE</key><string>1</string>
  </dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardErrorPath</key><string>$DOSSIER/serveur_voix.log</string>
</dict></plist>
EOF
launchctl bootout "gui/$(id -u)/online.savoiria.voix" >/dev/null 2>&1 || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
for _ in $(seq 1 90); do curl -fs "http://127.0.0.1:$PORT/sante" >/dev/null 2>&1 && break; sleep 1; done

etape "5/5  Vérification"
curl -fs "http://127.0.0.1:$PORT/sante" >/dev/null && echo "   [OK] Voix naturelle (Ryan / Vivian)" || echo "   [ERREUR] Serveur de voix : voir $DOSSIER/serveur_voix.log"
[ -x "$DOSSIER/whisper/build/bin/whisper-cli" ] && [ -s "$MODELE_WHISPER" ] && echo "   [OK] Whisper ($WHISPER_TAILLE)" || echo "   [ERREUR] Whisper"
cat <<EOF

Ajoutez ces lignes au fichier .env.local de SavoirIA, puis reconstruisez le site (npm run build) :
VOIX_LOCALE_URL=http://127.0.0.1:$PORT
SAVOIRIA_DOSSIER=$DOSSIER
WHISPER_MODELE=$MODELE_WHISPER
EOF
