#!/usr/bin/env bash
# =====================================================================
#  SavoirIA LOCAL — tout le site SavoirIA sur l'ordinateur, sans Internet.
#  L'IA du site (Socrate, voix, micro, génération des contenus) passe par
#  Gemma 4 (Ollama), Whisper et Piper installés sur la machine.
#
#  Prérequis : savoiria-poste.sh et savoiria-voix.sh déjà installés.
#  Utilisation (une fois, avec Internet) :
#     curl -fsSL https://www.savoiria.online/savoiria-local.sh | sudo bash
#  Mise à jour ensuite : automatique chaque jour dès qu'Internet est là
#  (ou à la main : sudo savoiria-maj).
# =====================================================================
set -euo pipefail

MODELE="${MODELE:-gemma4:e2b}"
DEPOT="https://github.com/gmuntu/CS50X-Francophone.git"
DOSSIER="/opt/savoiria"
SITE_DIR="$DOSSIER/site"
PORT=3000
LOCAL_URL="http://localhost:$PORT"
etape() { echo; echo "==> $*"; }

[[ $EUID -eq 0 ]] || { echo "Lancez ce script avec sudo."; exit 1; }
command -v ollama >/dev/null || { echo "Installez d'abord savoiria-poste.sh"; exit 1; }
[ -f "$DOSSIER/voix/socrate.onnx" ] || { echo "Installez d'abord savoiria-voix.sh"; exit 1; }
export DEBIAN_FRONTEND=noninteractive

# ---------------------------------------------------------------------
etape "1/7  Node.js 22 et PostgreSQL"
if ! command -v node >/dev/null || [ "$(node -v | cut -d. -f1 | tr -d v)" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
apt-get install -y postgresql git curl

# ---------------------------------------------------------------------
etape "2/7  Voix de l'étudiante (podcasts à deux voix)"
if ! [ -f "$DOSSIER/voix/etudiante.onnx" ]; then
  B="https://huggingface.co/rhasspy/piper-voices/resolve/main/fr/fr_FR/siwis/medium"
  curl -fL -o "$DOSSIER/voix/etudiante.onnx" "$B/fr_FR-siwis-medium.onnx"
  curl -fL -o "$DOSSIER/voix/etudiante.onnx.json" "$B/fr_FR-siwis-medium.onnx.json"
fi
chmod -R a+rX "$DOSSIER/voix"

# ---------------------------------------------------------------------
etape "3/7  Base de données locale"
id savoiria >/dev/null 2>&1 || useradd --system --create-home --home-dir /var/lib/savoiria --shell /usr/sbin/nologin savoiria
MDP_FICHIER=/var/lib/savoiria/.db-mdp
[ -f "$MDP_FICHIER" ] || { head -c 24 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' > "$MDP_FICHIER"; chmod 600 "$MDP_FICHIER"; chown savoiria "$MDP_FICHIER"; }
MDP=$(cat "$MDP_FICHIER")
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='savoiria'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE ROLE savoiria LOGIN PASSWORD '$MDP';"
sudo -u postgres psql -c "ALTER ROLE savoiria PASSWORD '$MDP';" >/dev/null
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='savoiria'" | grep -q 1 \
  || sudo -u postgres createdb -O savoiria savoiria

# ---------------------------------------------------------------------
etape "4/7  Code de SavoirIA"
if [ -d "$SITE_DIR/.git" ]; then
  git -C "$SITE_DIR" fetch --depth 1 origin main && git -C "$SITE_DIR" reset --hard origin/main
else
  git clone --depth 1 "$DEPOT" "$SITE_DIR"
fi
SECRET_FICHIER=/var/lib/savoiria/.secret
[ -f "$SECRET_FICHIER" ] || { head -c 32 /dev/urandom | base64 > "$SECRET_FICHIER"; chmod 600 "$SECRET_FICHIER"; chown savoiria "$SECRET_FICHIER"; }
cat > "$SITE_DIR/.env" <<EOF
# SavoirIA LOCAL : l'IA tourne sur cet ordinateur (Gemma + Whisper + Piper)
DATABASE_URL="postgresql://savoiria:$MDP@localhost:5432/savoiria"
NEXTAUTH_URL="$LOCAL_URL"
AUTH_URL="$LOCAL_URL"
NEXTAUTH_SECRET="$(cat "$SECRET_FICHIER")"
AUTH_SECRET="$(cat "$SECRET_FICHIER")"
AUTH_TRUST_HOST=true
SAVOIRIA_LOCAL=1
NEXT_PUBLIC_SAVOIRIA_LOCAL=1
SAVOIRIA_DOSSIER=$DOSSIER
MODELE=$MODELE
# Les clés Google ne servent pas : les appels sont envoyés vers l'IA locale.
GEMINI_API_KEY=local
GOOGLE_TTS_API_KEY=local
EOF
chown -R savoiria:savoiria "$SITE_DIR"

# ---------------------------------------------------------------------
etape "5/7  Construction du site (5 à 15 minutes)"
sudo -u savoiria bash -c "cd '$SITE_DIR' && npm ci --no-audit --no-fund && npm run build"

# Compte étudiant local (actif tout de suite)
sudo -u savoiria bash -c "cd '$SITE_DIR' && node -e \"
const { PrismaClient } = require('@prisma/client'); const bcrypt = require('bcryptjs');
const p = new PrismaClient();
(async () => {
  const hash = await bcrypt.hash('savoiria2026', 12);
  await p.user.upsert({ where: { email: 'etudiant@savoiria.local' },
    update: {}, create: { email: 'etudiant@savoiria.local', name: 'Étudiant SavoirIA', firstName: 'Étudiant',
      password: hash, role: 'STUDENT', status: 'ACTIVE', paymentStatus: 'EXEMPTED' } });
  await p.\\\$disconnect();
})().catch((e) => { console.error(e.message); process.exit(0); });
\""

# ---------------------------------------------------------------------
etape "6/7  Démarrage automatique du site"
cat > /etc/systemd/system/savoiria-site.service <<EOF
[Unit]
Description=SavoirIA (local, hors ligne)
After=network.target postgresql.service ollama.service
Wants=postgresql.service ollama.service

[Service]
User=savoiria
WorkingDirectory=$SITE_DIR
ExecStart=/usr/bin/npm run start -- -p $PORT -H 127.0.0.1
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# Mise à jour : code + reconstruction, quand Internet est disponible
cat > /usr/local/bin/savoiria-maj <<EOF
#!/usr/bin/env bash
curl -fsI --max-time 10 https://github.com >/dev/null 2>&1 || { echo "Pas d'Internet : mise à jour plus tard."; exit 0; }
cd "$SITE_DIR"
AVANT=\$(git rev-parse HEAD)
git fetch --depth 1 origin main && git reset --hard origin/main
[ "\$(git rev-parse HEAD)" = "\$AVANT" ] && { echo "SavoirIA est déjà à jour."; exit 0; }
chown -R savoiria:savoiria "$SITE_DIR"
sudo -u savoiria bash -c "npm ci --no-audit --no-fund && npm run build" && systemctl restart savoiria-site
ollama pull "$MODELE" >/dev/null 2>&1 || true
echo "SavoirIA mis à jour."
EOF
chmod +x /usr/local/bin/savoiria-maj
cat > /etc/systemd/system/savoiria-maj.service <<'EOF'
[Unit]
Description=Mise à jour de SavoirIA quand Internet est disponible
[Service]
Type=oneshot
ExecStart=/usr/local/bin/savoiria-maj
EOF
cat > /etc/systemd/system/savoiria-maj.timer <<'EOF'
[Unit]
Description=Vérifie chaque jour les mises à jour de SavoirIA
[Timer]
OnBootSec=10min
OnUnitActiveSec=6h
Persistent=true
[Install]
WantedBy=timers.target
EOF
systemctl daemon-reload
systemctl enable --now savoiria-site savoiria-maj.timer

# ---------------------------------------------------------------------
etape "7/7  SavoirIA s'ouvre sur l'ordinateur (et non plus sur Internet)"
for H in /home/*; do
  for F in "$H/.config/autostart/savoiria.desktop" "$H/.local/share/applications/savoiria.desktop"; do
    [ -f "$F" ] && sed -i "s#https://www.savoiria.online#$LOCAL_URL#g; s#https://savoiria.online#$LOCAL_URL#g" "$F"
  done
done

# Micro autorisé d'office pour SavoirIA local (pas de fenêtre de permission pour l'étudiant)
for D in /etc/chromium-browser/policies/managed /etc/chromium/policies/managed; do
  mkdir -p "$D"
  cat > "$D/savoiria-local.json" <<EOF
{ "AudioCaptureAllowedUrls": ["$LOCAL_URL", "http://127.0.0.1:$PORT"] }
EOF
done

echo; echo "==> Vérifications"
for i in $(seq 1 60); do curl -fs "$LOCAL_URL" >/dev/null 2>&1 && break; sleep 2; done
curl -fs "$LOCAL_URL" >/dev/null && echo "   [OK] SavoirIA tourne sur cet ordinateur : $LOCAL_URL" || echo "   [ERREUR] Le site ne répond pas (journalctl -u savoiria-site)"
systemctl is-active --quiet ollama && echo "   [OK] Gemma (cerveau)" || echo "   [ERREUR] Ollama"
echo
echo "Compte étudiant : etudiant@savoiria.local  /  mot de passe : savoiria2026 (à changer)"
echo "Redémarrez : SavoirIA s'ouvrira tout seul, sans Internet."
