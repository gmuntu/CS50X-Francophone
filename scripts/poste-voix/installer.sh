#!/usr/bin/env bash
# =====================================================================
#  SavoirIA — voix naturelle d'un ordinateur d'école (Ubuntu) : Kyutai Pocket TTS
#    Socrate = voix « javert », l'étudiante = voix « estelle » (CC0), modèle CC BY 4.0.
#  Lancé par savoiria-local.sh et par savoiria-maj ; ne refait rien si c'est déjà installé.
#  Ce script tourne en administrateur : il est lancé depuis sa copie /usr/local/lib/savoiria/voix
#  (appartenant à l'administrateur, posée par savoiria-local.sh), jamais depuis le dossier du site.
#  Téléchargement une seule fois avec Internet (environ 1 Go), ensuite tout marche hors ligne.
#  Si quelque chose échoue, le poste garde Piper : il n'est jamais muet.
# =====================================================================
set -euo pipefail

DOSSIER=/opt/savoiria
SITE_DIR="$DOSSIER/site"
ICI="$(cd "$(dirname "$0")" && pwd)"
VENV="$DOSSIER/pocket-venv"
MODELES="$DOSSIER/pocket-modeles"
CACHE=/var/cache/savoiria-voix
PORT=8766
POCKET=4.0.1

[[ $EUID -eq 0 ]] || { echo "Lancez ce script avec sudo."; exit 1; }
# Redémarrer la voix seulement si quelque chose a changé (jamais au milieu d'une réponse sans raison)
CHANGE=0
id savoiria >/dev/null 2>&1 || { echo "Installez d'abord savoiria-local.sh"; exit 1; }

# 1. Le programme (versions figées). Torch « processeur seul » : 10 fois plus léger que celui des cartes graphiques.
if [ "$("$VENV/bin/pip" show pocket-tts 2>/dev/null | awk '/^Version/{print $2}')" != "$POCKET" ]; then
  curl -fsI --max-time 10 https://pypi.org >/dev/null 2>&1 || { echo "   Pas d'Internet : voix naturelle installée plus tard."; exit 0; }
  echo "   Installation de Pocket TTS (quelques minutes)…"
  CHANGE=1
  rm -rf "$VENV"
  python3 -m venv "$VENV"
  # Chaque fichier est vérifié par son empreinte : une bibliothèque piégée sur Internet serait refusée.
  "$VENV/bin/pip" install --quiet --require-hashes --no-deps -r "$ICI/requirements-pocket.txt" \
    --index-url https://download.pytorch.org/whl/cpu --extra-index-url https://pypi.org/simple
fi

install -d -o savoiria -g savoiria -m 755 "$MODELES"
[ -L "$CACHE" ] && rm -f "$CACHE"   # jamais un raccourci vers un autre dossier
install -d -o savoiria -g savoiria -m 700 "$CACHE"
cmp -s "$ICI/serveur_pocket.py" "$DOSSIER/serveur_pocket.py" || CHANGE=1
install -m 644 "$ICI/serveur_pocket.py" "$DOSSIER/serveur_pocket.py"

# 2. Le modèle français et les deux voix : téléchargés une fois, puis vérifiés SANS Internet.
CHARGER="from pocket_tts import TTSModel; m = TTSModel.load_model(language='french'); [m.get_state_for_audio_prompt(v) for v in ('javert', 'estelle')]"
hors_ligne() { sudo -u savoiria env HF_HOME="$MODELES" HF_HUB_OFFLINE=1 "$VENV/bin/python" -c "$CHARGER" >/dev/null 2>&1; }
if ! hors_ligne; then
  sudo -u savoiria env HF_HOME="$MODELES" "$VENV/bin/python" -c "$CHARGER" >/dev/null 2>&1 || true
  hors_ligne || { echo "   [ATTENTION] Voix naturelle non téléchargée : le poste garde Piper."; exit 0; }
fi

# 3. Le serveur de voix, toujours prêt (comme Gemma)
UNITE=$(mktemp)
cat > "$UNITE" <<EOF
[Unit]
Description=SavoirIA voix naturelle (Pocket TTS, hors ligne)
After=network.target

[Service]
User=savoiria
Environment=HF_HOME=$MODELES
Environment=HF_HUB_OFFLINE=1
Environment=PORT=$PORT
Environment=VOIX_CACHE=$CACHE
ExecStart=$VENV/bin/python $DOSSIER/serveur_pocket.py
Restart=always
# Isolé : rien d'autre à écrire que son cache, aucun accès réseau hors de cet ordinateur
NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=yes
PrivateTmp=yes
ReadWritePaths=$CACHE
IPAddressDeny=any
IPAddressAllow=localhost
# Gemma et le site passent avant si la mémoire manque
MemoryMax=2500M
Nice=5

[Install]
WantedBy=multi-user.target
EOF

cmp -s "$UNITE" /etc/systemd/system/savoiria-voix.service || CHANGE=1
install -m 644 "$UNITE" /etc/systemd/system/savoiria-voix.service; rm -f "$UNITE"

# 4. Préparation des podcasts sans MP3, en arrière-plan (les élèves passent avant)
cat > /etc/systemd/system/savoiria-podcasts.service <<EOF
[Unit]
Description=SavoirIA : préparation des podcasts avec la voix du poste
After=savoiria-voix.service

[Service]
Type=oneshot
User=savoiria
WorkingDirectory=$SITE_DIR
ExecStart=/usr/bin/npx tsx --require dotenv/config scripts/preparer-podcasts.ts
Nice=10
EOF
systemctl daemon-reload
systemctl enable savoiria-voix >/dev/null 2>&1
if [ $CHANGE = 1 ] || ! systemctl is-active --quiet savoiria-voix; then systemctl restart savoiria-voix; fi

# 5. Le site utilise la voix naturelle
for i in $(seq 1 60); do curl -fs "http://127.0.0.1:$PORT/sante" >/dev/null 2>&1 && break; sleep 2; done
if ! curl -fs "http://127.0.0.1:$PORT/sante" >/dev/null 2>&1; then
  echo "   [ATTENTION] La voix naturelle ne démarre pas (journalctl -u savoiria-voix) : le poste garde Piper."; exit 0
fi
if ! grep -q '^VOIX_LOCALE_URL=' "$SITE_DIR/.env"; then
  # Écrit par le compte du site lui-même (l'administrateur ne suit pas de raccourci posé dans le dossier du site)
  sudo -u savoiria sh -c 'echo "VOIX_LOCALE_URL=http://127.0.0.1:$1" >> "$2"' _ "$PORT" "$SITE_DIR/.env"
  systemctl restart savoiria-site 2>/dev/null || true
fi
systemctl start --no-block savoiria-podcasts
echo "   [OK] Voix naturelle (Socrate : javert, l'étudiante : estelle)"
