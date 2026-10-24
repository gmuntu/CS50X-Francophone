#!/usr/bin/env bash
# =====================================================================
#  SavoirIA — préparation d'un poste étudiant (Ubuntu 24.04 LTS)
#
#  Installe :
#   1. Les outils du cours CS50 (C, Python, SQL), utilisables SANS Internet
#   2. Socrate hors ligne : Ollama + le modèle Gemma 4 (Google)
#   3. Le compte « etudiant » qui ouvre SavoirIA automatiquement
#
#  Utilisation (une seule fois, avec Internet) :
#     sudo bash savoiria-poste.sh            -> poste normal
#     sudo bash savoiria-poste.sh --kiosque  -> SavoirIA en plein écran, verrouillé
#
#  Le modèle se choisit avec la variable MODELE (par défaut gemma4:e2b,
#  le plus léger ; gemma4:e4b est meilleur mais demande 16 Go de RAM) :
#     sudo MODELE=gemma4:e4b bash savoiria-poste.sh
# =====================================================================
set -euo pipefail

MODELE="${MODELE:-gemma4:e2b}"
SITE="https://www.savoiria.online"
ETUDIANT="etudiant"
KIOSQUE=0
[[ "${1:-}" == "--kiosque" ]] && KIOSQUE=1

etape() { echo; echo "==> $*"; }

if [[ $EUID -ne 0 ]]; then
  echo "Lancez ce script avec sudo :  sudo bash $0"; exit 1
fi

# ---------------------------------------------------------------------
etape "1/6  Mise à jour du système"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y

# ---------------------------------------------------------------------
etape "2/6  Outils de programmation CS50 (hors ligne)"
apt-get install -y build-essential clang make gdb valgrind \
  python3 python3-pip python3-venv sqlite3 git curl wget unzip \
  ca-certificates

# Bibliothèque CS50 pour le C (get_int, get_string…)
if ! [ -f /usr/local/include/cs50.h ] && ! [ -f /usr/include/cs50.h ]; then
  TMP=$(mktemp -d)
  git clone --depth 1 https://github.com/cs50/libcs50.git "$TMP/libcs50"
  make -C "$TMP/libcs50" install
  rm -rf "$TMP"
  ldconfig
fi

# Bibliothèque CS50 pour Python
pip3 install --break-system-packages --quiet cs50

# Raccourci « make » comme dans CS50 : clang avec la bibliothèque cs50
cat > /etc/profile.d/cs50.sh <<'EOF'
export CC="clang"
export CFLAGS="-ferror-limit=1 -gdwarf-4 -ggdb3 -O0 -std=c11 -Wall -Werror -Wextra -Wno-gnu-folding-constant -Wno-sign-compare -Wno-unused-parameter -Wno-unused-variable -Wshadow"
export LDLIBS="-lcrypt -lcs50 -lm"
EOF

# ---------------------------------------------------------------------
etape "3/6  Socrate hors ligne : Ollama + $MODELE"
if ! command -v ollama >/dev/null 2>&1; then
  curl -fsSL https://ollama.com/install.sh | sh
fi

# Autoriser le site SavoirIA à parler au Socrate local de l'ordinateur
mkdir -p /etc/systemd/system/ollama.service.d
cat > /etc/systemd/system/ollama.service.d/savoiria.conf <<EOF
[Service]
Environment="OLLAMA_ORIGINS=$SITE,https://savoiria.online,http://localhost:*"
Environment="OLLAMA_KEEP_ALIVE=30m"
EOF
systemctl daemon-reload
systemctl enable --now ollama
systemctl restart ollama
sleep 3

echo "Téléchargement du modèle (environ 2 à 7 Go, patience)…"
ollama pull "$MODELE"

# ---------------------------------------------------------------------
etape "4/6  Navigateur Chromium"
if ! command -v chromium >/dev/null 2>&1 && ! command -v chromium-browser >/dev/null 2>&1; then
  snap install chromium
fi
NAV=$(command -v chromium || command -v chromium-browser || echo /snap/bin/chromium)

# ---------------------------------------------------------------------
etape "5/6  Compte étudiant « $ETUDIANT »"
if ! id "$ETUDIANT" >/dev/null 2>&1; then
  adduser --disabled-password --gecos "Étudiant SavoirIA" "$ETUDIANT"
  echo "$ETUDIANT:savoiria" | chpasswd
  echo "   Mot de passe provisoire : savoiria (à changer)"
fi

# Connexion automatique au démarrage (GNOME / GDM)
if [ -f /etc/gdm3/custom.conf ]; then
  sed -i '/^AutomaticLogin/d' /etc/gdm3/custom.conf
  sed -i "/^\[daemon\]/a AutomaticLoginEnable=true\nAutomaticLogin=$ETUDIANT" /etc/gdm3/custom.conf
fi

# Dossier de travail CS50
HOME_ET="/home/$ETUDIANT"
mkdir -p "$HOME_ET/cs50" "$HOME_ET/.config/autostart" "$HOME_ET/.local/share/applications"

if [[ $KIOSQUE -eq 1 ]]; then
  OPTIONS="--kiosk --noerrdialogs --disable-infobars"
else
  OPTIONS="--app=$SITE --start-maximized"
fi

# Ouvre SavoirIA à chaque démarrage
cat > "$HOME_ET/.config/autostart/savoiria.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=SavoirIA
Exec=$NAV $OPTIONS $SITE
X-GNOME-Autostart-enabled=true
EOF

# Icônes sur le bureau / dans le menu
cat > "$HOME_ET/.local/share/applications/savoiria.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=SavoirIA
Comment=Cours, Agora et Socrate
Exec=$NAV --app=$SITE --start-maximized
Icon=applications-science
Categories=Education;
EOF

cat > "$HOME_ET/.local/share/applications/cs50-terminal.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=Terminal CS50
Comment=Écrire et compiler ses programmes
Exec=gnome-terminal --working-directory=$HOME_ET/cs50
Icon=utilities-terminal
Categories=Education;Development;
EOF

chown -R "$ETUDIANT:$ETUDIANT" "$HOME_ET"

# ---------------------------------------------------------------------
etape "6/6  Vérifications"
OK=1
echo '#include <cs50.h>
#include <stdio.h>
int main(void){ printf("bonjour, monde\n"); }' > /tmp/test_cs50.c
if clang /tmp/test_cs50.c -lcs50 -o /tmp/test_cs50 && /tmp/test_cs50 | grep -q bonjour; then
  echo "   [OK] Compilation C avec la bibliothèque CS50"
else
  echo "   [ERREUR] Compilation C"; OK=0
fi
python3 -c "import cs50" && echo "   [OK] CS50 pour Python" || { echo "   [ERREUR] CS50 Python"; OK=0; }
sqlite3 --version >/dev/null && echo "   [OK] SQLite"
if ollama list | grep -q "${MODELE%%:*}"; then
  echo "   [OK] Socrate hors ligne ($MODELE)"
  echo "   Test rapide :"
  ollama run "$MODELE" "Réponds en une phrase, en français : qu'est-ce qu'une variable en programmation ?" || true
else
  echo "   [ERREUR] Modèle $MODELE absent"; OK=0
fi

echo
if [[ $OK -eq 1 ]]; then
  echo "Poste SavoirIA prêt. Redémarrez l'ordinateur : il ouvrira SavoirIA automatiquement."
else
  echo "Certaines étapes ont échoué : envoyez une capture de cet écran."
fi
