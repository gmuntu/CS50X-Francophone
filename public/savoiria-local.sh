#!/usr/bin/env bash
# =====================================================================
#  SavoirIA LOCAL — tout le site SavoirIA sur l'ordinateur, sans Internet.
#  L'IA du site (Socrate, voix, micro, génération des contenus) passe par
#  Gemma 4 (Ollama), Whisper, Pocket TTS (voix naturelle) et Piper (secours) installés sur la machine.
#
#  Prérequis : savoiria-poste.sh et savoiria-voix.sh déjà installés.
#  Utilisation (une fois, avec Internet) :
#     curl -fsSL https://www.savoiria.online/savoiria-local.sh | sudo bash
#  (la clé de synchronisation est demandée à l'écran : elle ne reste pas dans l'historique)
#  Mise à jour ensuite : automatique chaque jour dès qu'Internet est là
#  (ou à la main : sudo savoiria-maj).
# =====================================================================
set -euo pipefail

MODELE="${MODELE:-gemma4:e2b}"
# Clé de synchronisation du contenu (la même que CONTENU_SYNC_CLE sur Vercel)
CONTENU_SYNC_CLE="${CONTENU_SYNC_CLE:-$(cat /var/lib/savoiria/.contenu-cle 2>/dev/null || true)}"
# Clé de l'ordinateur d'école (Administration > Partenaires > Nouvel ordinateur d'école) :
# comptes des élèves de l'école sur ce poste et envoi de leurs résultats au site.
POSTE_CLE="${POSTE_CLE:-$(cat /var/lib/savoiria/.poste-cle 2>/dev/null || true)}"
DEPOT="https://github.com/gmuntu/CS50X-Francophone.git"
# Les ordinateurs n'installent que les versions validées : étiquettes « poste-v1 », « poste-v2 »…
ETIQUETTES='poste-v*'
DOSSIER="/opt/savoiria"
SITE_DIR="$DOSSIER/site"
PORT=3000
LOCAL_URL="http://localhost:$PORT"
etape() { echo; echo "==> $*"; }

[[ $EUID -eq 0 ]] || { echo "Lancez ce script avec sudo."; exit 1; }
command -v ollama >/dev/null || { echo "Installez d'abord savoiria-poste.sh"; exit 1; }
[ -f "$DOSSIER/voix/socrate.onnx" ] || { echo "Installez d'abord savoiria-voix.sh"; exit 1; }
export DEBIAN_FRONTEND=noninteractive
if [ -z "$CONTENU_SYNC_CLE" ] && [ -r /dev/tty ]; then
  read -rsp "Clé de synchronisation du contenu (Entrée pour passer) : " CONTENU_SYNC_CLE </dev/tty; echo
fi
if [ -z "$POSTE_CLE" ] && [ -r /dev/tty ]; then
  read -rsp "Clé de l'ordinateur d'école (Entrée pour passer) : " POSTE_CLE </dev/tty; echo
fi
# Une clé d'ordinateur d'école commence toujours par « poste_ » (souvent, c'est l'autre clé qui a été collée deux fois).
while [ -n "$POSTE_CLE" ] && [[ "$POSTE_CLE" != poste_* ]]; do
  [ -r /dev/tty ] || { echo "Clé de l'ordinateur d'école invalide (elle commence par poste_)."; exit 1; }
  echo "Ce n'est pas une clé d'ordinateur d'école : elle commence toujours par « poste_ »."
  read -rsp "Clé de l'ordinateur d'école (Entrée pour passer) : " POSTE_CLE </dev/tty; echo
done
[ -n "$CONTENU_SYNC_CLE" ] && [ "$CONTENU_SYNC_CLE" = "$POSTE_CLE" ] && { echo "Les deux clés sont identiques : recommencez."; exit 1; }
install -d -m 700 /root/savoiria

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
[ -d "$SITE_DIR/.git" ] || git clone "$DEPOT" "$SITE_DIR"
chown -R savoiria:savoiria "$SITE_DIR"
G() { sudo -u savoiria git -C "$SITE_DIR" "$@"; }
G fetch --tags --force origin
VERSION=$(G tag -l "$ETIQUETTES" --sort=-v:refname | head -1)
if [ -n "$VERSION" ]; then G checkout -q --force "$VERSION"; else G checkout -q --force origin/main; fi
echo "   Version installée : ${VERSION:-main}"
# Copie de l'installateur de la voix appartenant à l'administrateur : savoiria-maj le lance avec tous
# les droits, il ne doit donc jamais venir du dossier du site (que le compte du site peut modifier).
install -d -m 755 /usr/local/lib/savoiria/voix
for F in installer.sh serveur_pocket.py requirements-pocket.txt; do
  [ -f "$SITE_DIR/scripts/poste-voix/$F" ] && install -m 644 "$SITE_DIR/scripts/poste-voix/$F" /usr/local/lib/savoiria/voix/
done
SECRET_FICHIER=/var/lib/savoiria/.secret
[ -f "$SECRET_FICHIER" ] || { head -c 32 /dev/urandom | base64 > "$SECRET_FICHIER"; chmod 600 "$SECRET_FICHIER"; chown savoiria "$SECRET_FICHIER"; }
( umask 077; cat > "$SITE_DIR/.env" ) <<EOF
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
# Contenu pédagogique récupéré du serveur en ligne à chaque mise à jour
SAVOIRIA_SERVEUR=https://www.savoiria.online
CONTENU_SYNC_CLE=$CONTENU_SYNC_CLE
# Ordinateur d'école : élèves de l'école et envoi de leurs résultats (vide = compte commun seulement)
POSTE_CLE=$POSTE_CLE
SYNCHRO_ETAT=/var/lib/savoiria/synchro-ecole.json
EOF
mkdir -p /var/lib/savoiria && [ -n "$CONTENU_SYNC_CLE" ] && { echo "$CONTENU_SYNC_CLE" > /var/lib/savoiria/.contenu-cle; chmod 600 /var/lib/savoiria/.contenu-cle; }
[ -n "$POSTE_CLE" ] && { ( umask 077; echo "$POSTE_CLE" > /var/lib/savoiria/.poste-cle ); chown root:root /var/lib/savoiria/.poste-cle; }
chown -R savoiria:savoiria "$SITE_DIR"
# Secrets lisibles par le service seul : le compte étudiant ne peut ni lire .env ni le code.
chmod 600 "$SITE_DIR/.env"
chmod 750 "$SITE_DIR"

# ---------------------------------------------------------------------
etape "5/7  Construction du site (5 à 15 minutes)"
sudo -u savoiria bash -c "cd '$SITE_DIR' && npm ci --no-audit --no-fund && npx prisma generate && npx prisma db push --skip-generate && npx tsx --require dotenv/config scripts/importer-contenu.ts; npm run build"

# Compte étudiant local (actif tout de suite) : mot de passe propre à cet ordinateur
# head lit 512 octets puis s'arrête, tr lit jusqu'au bout : pas de « tube cassé » (code 141) avec pipefail
MDP_WEB=$(head -c 512 /dev/urandom | tr -dc 'a-hjkmnp-z2-9' | cut -c1-10)
sudo -u savoiria MDP_WEB="$MDP_WEB" bash -c "cd '$SITE_DIR' && node -e \"
const { PrismaClient } = require('@prisma/client'); const bcrypt = require('bcryptjs');
const p = new PrismaClient();
(async () => {
  const hash = await bcrypt.hash(process.env.MDP_WEB, 12);
  const u = await p.user.findUnique({ where: { email: 'etudiant@savoiria.local' } });
  if (!u) {
    await p.user.create({ data: { email: 'etudiant@savoiria.local', name: 'Étudiant SavoirIA', firstName: 'Étudiant',
      password: hash, role: 'STUDENT', status: 'ACTIVE', paymentStatus: 'EXEMPTED' } });
    console.log('NOUVEAU');
  } else if (u.password && await bcrypt.compare('savoiria2026', u.password)) {
    // Ancien mot de passe commun à tous les postes : remplacé
    await p.user.update({ where: { id: u.id }, data: { password: hash } });
    console.log('NOUVEAU');
  }
  await p.\\\$disconnect();
})().catch((e) => { console.error(e.message); process.exit(0); });
\"" | grep -q NOUVEAU \
  && { echo "Site local etudiant@savoiria.local : $MDP_WEB" >> /root/savoiria/mots-de-passe.txt; chmod 600 /root/savoiria/mots-de-passe.txt; } || true

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
# Met à jour SavoirIA (code + contenu des cours) quand Internet est disponible.
# Verrou commun avec savoiria-synchro : jamais les deux en même temps.
exec 9>/run/lock/savoiria.lock; flock 9
curl -fsI --max-time 10 https://www.savoiria.online >/dev/null 2>&1 || { echo "Pas d'Internet : mise à jour plus tard."; exit 0; }
cd "$SITE_DIR"
G() { sudo -u savoiria git -C "$SITE_DIR" "\$@"; }
AVANT=\$(G rev-parse HEAD)
# Seulement une version validée (étiquette $ETIQUETTES), jamais le travail en cours
G fetch --tags --force origin || true
VERSION=\$(G tag -l '$ETIQUETTES' --sort=-v:refname | head -1)
[ -n "\$VERSION" ] && G checkout -q --force "\$VERSION"
AUDIO_AVANT=\$(ls public/hors-ligne-audio 2>/dev/null | wc -l)
sudo -u savoiria bash -c "npm ci --no-audit --no-fund && npx prisma generate && npx prisma db push --skip-generate && npx tsx --require dotenv/config scripts/importer-contenu.ts"
AUDIO_APRES=\$(ls public/hors-ligne-audio 2>/dev/null | wc -l)
if [ "\$(G rev-parse HEAD)" != "\$AVANT" ] || [ "\$AUDIO_APRES" != "\$AUDIO_AVANT" ] || [ ! -d .next ]; then
  sudo -u savoiria bash -c "npm run build" && systemctl restart savoiria-site
fi
ollama pull "$MODELE" >/dev/null 2>&1 || true
# Voix naturelle : vérifiée, puis préparation des podcasts nouveaux. Copie de l'administrateur seulement ;
# une nouvelle version de la voix s'installe en relançant savoiria-local.sh.
[ -f /usr/local/lib/savoiria/voix/installer.sh ] && { bash /usr/local/lib/savoiria/voix/installer.sh || true; }
echo "SavoirIA est à jour."
EOF
chmod +x /usr/local/bin/savoiria-maj
# Synchronisation de l'école (toutes les 15 min, seulement avec Internet et une clé de poste)
cat > /usr/local/bin/savoiria-synchro <<EOF
#!/usr/bin/env bash
exec 9>/run/lock/savoiria.lock; flock -n 9 || exit 0   # mise à jour en cours : on attend le prochain passage
grep -q '^POSTE_CLE=.' "$SITE_DIR/.env" || exit 0
[ -f "$SITE_DIR/scripts/synchro-ecole.ts" ] || exit 0
curl -fsI --max-time 10 https://www.savoiria.online >/dev/null 2>&1 || exit 0
sudo -u savoiria bash -c "cd '$SITE_DIR' && npx tsx --require dotenv/config scripts/synchro-ecole.ts"
EOF
chmod +x /usr/local/bin/savoiria-synchro
cat > /etc/systemd/system/savoiria-synchro.service <<'EOF'
[Unit]
Description=Synchronisation des élèves de l'école avec SavoirIA en ligne
[Service]
Type=oneshot
ExecStart=/usr/local/bin/savoiria-synchro
EOF
cat > /etc/systemd/system/savoiria-synchro.timer <<'EOF'
[Unit]
Description=Synchronise l'école toutes les 15 minutes quand Internet est là
[Timer]
OnBootSec=3min
OnUnitActiveSec=15min
Persistent=true
[Install]
WantedBy=timers.target
EOF
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
systemctl enable --now savoiria-site savoiria-maj.timer savoiria-synchro.timer
# Voix naturelle du poste (Pocket TTS) ; si elle échoue, Piper reste la voix du poste
[ -f /usr/local/lib/savoiria/voix/installer.sh ] && bash /usr/local/lib/savoiria/voix/installer.sh || echo "   (voix naturelle : se réinstallera à la prochaine mise à jour)"
# Première synchronisation de l'école tout de suite : les élèves peuvent se connecter avec leur compte
[ -n "$POSTE_CLE" ] && { /usr/local/bin/savoiria-synchro && echo "   [OK] Élèves de l'école reçus" || echo "   [ATTENTION] Synchronisation de l'école à vérifier (journalctl -u savoiria-synchro)"; }

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
echo "Mots de passe de cet ordinateur (gardez-les) :"
cat /root/savoiria/mots-de-passe.txt
echo "Redémarrez : SavoirIA s'ouvrira tout seul, sans Internet."
