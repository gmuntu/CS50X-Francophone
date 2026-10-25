#!/usr/bin/env bash
# =====================================================================
#  SavoirIA — Socrate VOCAL hors ligne (Ubuntu)
#
#  Ajoute à un poste SavoirIA déjà préparé :
#   - les oreilles : Whisper (whisper.cpp), reconnaissance vocale en français
#   - la bouche    : Piper, synthèse vocale française naturelle
#   - la commande « socrate-vocal » : on parle, Socrate (Gemma 4) répond à voix haute
#  Tout fonctionne SANS Internet une fois installé.
#
#  Utilisation (une seule fois, avec Internet) :
#     curl -fsSL https://www.savoiria.online/savoiria-voix.sh | sudo bash
#
#  Variables possibles :
#     MODELE=gemma4:e2b       (cerveau, déjà installé par savoiria-poste.sh)
#     WHISPER=base            (base = rapide ; small = plus précis, plus lent)
# =====================================================================
set -euo pipefail

MODELE="${MODELE:-gemma4:e2b}"
WHISPER="${WHISPER:-base}"
DOSSIER="/opt/savoiria"
VOIX_URL="https://huggingface.co/rhasspy/piper-voices/resolve/main/fr/fr_FR/siwis/medium"
VOIX="fr_FR-siwis-medium"
etape() { echo; echo "==> $*"; }

if [[ $EUID -ne 0 ]]; then
  echo "Lancez ce script avec sudo."; exit 1
fi
export DEBIAN_FRONTEND=noninteractive
mkdir -p "$DOSSIER"

# ---------------------------------------------------------------------
etape "1/4  Outils audio et de compilation"
apt-get update -y
apt-get install -y build-essential cmake git curl alsa-utils pulseaudio-utils \
  python3 python3-venv

# ---------------------------------------------------------------------
etape "2/4  Les oreilles : Whisper (modèle $WHISPER, multilingue)"
if ! [ -x "$DOSSIER/whisper/build/bin/whisper-cli" ]; then
  rm -rf "$DOSSIER/whisper"
  git clone --depth 1 https://github.com/ggml-org/whisper.cpp.git "$DOSSIER/whisper"
  cmake -S "$DOSSIER/whisper" -B "$DOSSIER/whisper/build" -DCMAKE_BUILD_TYPE=Release
  cmake --build "$DOSSIER/whisper/build" -j"$(nproc)" --config Release
fi
if ! [ -f "$DOSSIER/whisper/models/ggml-$WHISPER.bin" ]; then
  bash "$DOSSIER/whisper/models/download-ggml-model.sh" "$WHISPER"
fi

# ---------------------------------------------------------------------
etape "3/4  La bouche : Piper (voix française $VOIX)"
if ! [ -x "$DOSSIER/piper-venv/bin/piper" ]; then
  python3 -m venv "$DOSSIER/piper-venv"
  "$DOSSIER/piper-venv/bin/pip" install --quiet --upgrade pip
  "$DOSSIER/piper-venv/bin/pip" install --quiet piper-tts
fi
mkdir -p "$DOSSIER/voix"
for f in "$VOIX.onnx" "$VOIX.onnx.json"; do
  [ -f "$DOSSIER/voix/$f" ] || curl -fL -o "$DOSSIER/voix/$f" "$VOIX_URL/$f"
done

# ---------------------------------------------------------------------
etape "4/4  Commande « socrate-vocal »"
cat > /usr/local/bin/socrate-vocal <<EOF
#!/usr/bin/env bash
# Socrate vocal hors ligne : Whisper -> Gemma 4 -> Piper
MODELE="\${MODELE:-$MODELE}"
WHISPER_BIN="$DOSSIER/whisper/build/bin/whisper-cli"
WHISPER_MODELE="$DOSSIER/whisper/models/ggml-$WHISPER.bin"
PIPER="$DOSSIER/piper-venv/bin/piper"
VOIX="$DOSSIER/voix/$VOIX.onnx"
TMP=\$(mktemp -d)
trap 'rm -rf "\$TMP"' EXIT

consigne="Tu es Socrate, le tuteur bienveillant de SavoirIA. Réponds en français simple, en 3 phrases maximum, sans liste ni symbole. Guide l'étudiant par une question plutôt que de donner toute la réponse."

parler() {
  echo "\$1" | "\$PIPER" --model "\$VOIX" --output_file "\$TMP/r.wav" >/dev/null 2>&1 \\
    && aplay -q "\$TMP/r.wav" 2>/dev/null
}

clear
echo "=============================================="
echo "   Socrate vocal — SavoirIA (hors ligne)"
echo "=============================================="
parler "Bonjour, je suis Socrate. Pose-moi ta question."

while true; do
  echo
  read -r -p "Appuie sur Entrée pour parler (ou tape q puis Entrée pour quitter) " r
  [[ "\$r" == "q" ]] && { parler "À bientôt !"; break; }
  echo "Je t'écoute… appuie sur Entrée quand tu as fini."
  arecord -q -f S16_LE -r 16000 -c 1 "\$TMP/q.wav" &
  pid=\$!
  read -r
  kill -INT "\$pid" 2>/dev/null; wait "\$pid" 2>/dev/null || true

  echo "Je transcris…"
  question=\$("\$WHISPER_BIN" -m "\$WHISPER_MODELE" -l fr -nt -np -f "\$TMP/q.wav" 2>/dev/null | tr -s ' \n' ' ' | sed 's/^ *//;s/ *\$//')
  if [ -z "\$question" ]; then
    echo "Je n'ai rien entendu."; parler "Je n'ai pas bien entendu, peux-tu répéter ?"; continue
  fi
  echo "Toi : \$question"

  echo "Socrate réfléchit…"
  reponse=\$(python3 - "\$MODELE" "\$consigne" "\$question" <<'PY'
import json, sys, urllib.request
modele, consigne, question = sys.argv[1:4]
corps = json.dumps({"model": modele, "system": consigne, "prompt": question,
                    "stream": False, "think": False,
                    "options": {"num_predict": 160}}).encode()
try:
    req = urllib.request.Request("http://localhost:11434/api/generate", data=corps,
                                 headers={"Content-Type": "application/json"})
    print(json.load(urllib.request.urlopen(req, timeout=300)).get("response", "").strip())
except Exception:
    print("Désolé, je n'arrive pas à réfléchir pour le moment.")
PY
)
  echo "Socrate : \$reponse"
  parler "\$reponse"
done
EOF
chmod +x /usr/local/bin/socrate-vocal

# Icône « Socrate vocal » pour le compte étudiant (et l'utilisateur courant)
for H in /home/etudiant "${SUDO_USER:+/home/$SUDO_USER}"; do
  [ -n "$H" ] && [ -d "$H" ] || continue
  mkdir -p "$H/.local/share/applications"
  cat > "$H/.local/share/applications/socrate-vocal.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=Socrate vocal
Comment=Parler à Socrate, même sans Internet
Exec=gnome-terminal -- socrate-vocal
Icon=audio-input-microphone
Categories=Education;
EOF
  chown -R "$(stat -c %U "$H")":"$(stat -c %G "$H")" "$H/.local"
done

# ---------------------------------------------------------------------
echo; echo "==> Vérifications"
OK=1
[ -x "$DOSSIER/whisper/build/bin/whisper-cli" ] && echo "   [OK] Whisper (oreilles)" || { echo "   [ERREUR] Whisper"; OK=0; }
if echo "Bonjour, je suis Socrate." | "$DOSSIER/piper-venv/bin/piper" --model "$DOSSIER/voix/$VOIX.onnx" --output_file /tmp/test_voix.wav >/dev/null 2>&1; then
  echo "   [OK] Piper (bouche) — écoute du test :"; aplay -q /tmp/test_voix.wav 2>/dev/null || true
else
  echo "   [ERREUR] Piper"; OK=0
fi
command -v ollama >/dev/null && echo "   [OK] Gemma (cerveau)" || { echo "   [ERREUR] Ollama absent : lancez d'abord savoiria-poste.sh"; OK=0; }
echo
[ $OK -eq 1 ] && echo "Socrate vocal prêt ! Lancez « socrate-vocal » dans le Terminal, ou l'icône Socrate vocal." \
             || echo "Certaines étapes ont échoué : envoyez le texte de cet écran."
