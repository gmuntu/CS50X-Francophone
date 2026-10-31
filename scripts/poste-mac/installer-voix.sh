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
REVISION_VOIX="049ef77fe8816b536193c0c25f9a214d17921282"   # version testée, figée
# Empreintes SHA-256 officielles des modèles Whisper (huggingface.co/ggerganov/whisper.cpp)
EMPREINTE_base="60ed5bc3dd14eea856493d334349b405782ddcaf0028d4b5df4088345fba2efe"
EMPREINTE_small="1be3a9b2063867b937e64e2ec7483364a79917e157fa98c5d94b5c1fffea987b"
PORT=8766
ICI="$(cd "$(dirname "$0")" && pwd)"
etape() { echo; echo "== $1"; }

etape "1/5  Vérifications"
[ "$(uname -s)" = "Darwin" ] && [ "$(uname -m)" = "arm64" ] || { echo "Ce script est fait pour un Mac Apple Silicon (M1, M2…)."; exit 1; }
command -v brew >/dev/null || { echo "Installez d'abord Homebrew : https://brew.sh"; exit 1; }
case "$WHISPER_TAILLE" in base|small) ;; *) echo "WHISPER_TAILLE doit valoir base ou small"; exit 1 ;; esac
case "$DOSSIER" in *[\&\<\>\"]*) echo "Le chemin du dossier ne doit contenir ni &, ni <, ni >, ni guillemet."; exit 1 ;; esac
PY=""
for p in python3.13 python3.12 python3.11 python3; do
  if command -v "$p" >/dev/null && "$p" -c 'import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)'; then PY="$p"; break; fi
done
[ -n "$PY" ] || { echo "Python 3.10 ou plus récent est nécessaire (brew install python)."; exit 1; }
mkdir -p "$DOSSIER" && chmod 700 "$DOSSIER"   # réservé à ce compte (journal, modèles)

etape "2/5  Voix naturelle (Qwen3-TTS) — environ 4 Go à télécharger"
[ -x "$DOSSIER/venv/bin/python" ] || "$PY" -m venv "$DOSSIER/venv"
# Versions exactes testées (requirements-voix.txt), pas « la dernière du jour ».
"$DOSSIER/venv/bin/pip" install -q -r "$ICI/requirements-voix.txt"
install -m 644 "$ICI/serveur_voix.py" "$DOSSIER/serveur_voix.py"
# Téléchargement du modèle de voix maintenant (version figée), pour que tout marche ensuite sans Internet.
"$DOSSIER/venv/bin/python" -I -c "from huggingface_hub import snapshot_download; snapshot_download('$MODELE_VOIX', revision='$REVISION_VOIX', local_dir='$DOSSIER/modele-voix')"
"$DOSSIER/venv/bin/python" -I -c "from mlx_audio.tts.utils import load_model; load_model('$DOSSIER/modele-voix')" >/dev/null

etape "3/5  Oreilles (Whisper, modèle $WHISPER_TAILLE)"
brew list whisper-cpp >/dev/null 2>&1 || brew install whisper-cpp
mkdir -p "$DOSSIER/whisper/build/bin" "$DOSSIER/whisper/models"
ln -sf "$(brew --prefix)/bin/whisper-cli" "$DOSSIER/whisper/build/bin/whisper-cli"
MODELE_WHISPER="$DOSSIER/whisper/models/ggml-$WHISPER_TAILLE.bin"
EMPREINTE_ATTENDUE="$(eval echo "\$EMPREINTE_$WHISPER_TAILLE")"
empreinte() { shasum -a 256 "$1" | cut -d' ' -f1; }
if [ ! -s "$MODELE_WHISPER" ] || [ "$(empreinte "$MODELE_WHISPER")" != "$EMPREINTE_ATTENDUE" ]; then
  rm -f "$MODELE_WHISPER"
  # Reprend là où il s'est arrêté si la connexion coupe.
  ok=""
  for essai in 1 2 3 4 5 6 7 8 9 10; do
    if curl -fL -C - --retry 3 -o "$MODELE_WHISPER.part" \
      "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-$WHISPER_TAILLE.bin"; then ok=1; break; fi
    echo "   Connexion coupée, nouvel essai ($essai)…"; sleep 5
  done
  [ -n "$ok" ] || { echo "   [ERREUR] Téléchargement de Whisper impossible. Relancez le script avec une meilleure connexion."; exit 1; }
  if [ "$(empreinte "$MODELE_WHISPER.part")" != "$EMPREINTE_ATTENDUE" ]; then
    rm -f "$MODELE_WHISPER.part"
    echo "   [ERREUR] Fichier Whisper abîmé ou modifié (empreinte incorrecte) : supprimé. Relancez le script."; exit 1
  fi
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
    <key>VOIX_MODELE</key><string>$DOSSIER/modele-voix</string>
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
[ -x "$DOSSIER/whisper/build/bin/whisper-cli" ] && [ "$(empreinte "$MODELE_WHISPER")" = "$EMPREINTE_ATTENDUE" ] && echo "   [OK] Whisper ($WHISPER_TAILLE)" || echo "   [ERREUR] Whisper"
cat <<EOF

Ajoutez ces lignes au fichier .env.local de SavoirIA, puis reconstruisez le site (npm run build) :
VOIX_LOCALE_URL=http://127.0.0.1:$PORT
SAVOIRIA_DOSSIER=$DOSSIER
WHISPER_MODELE=$MODELE_WHISPER
EOF
