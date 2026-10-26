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
VOIX_URL="https://huggingface.co/rhasspy/piper-voices/resolve/main/fr/fr_FR/tom/medium"
VOIX="fr_FR-tom-medium"
etape() { echo; echo "==> $*"; }

if [[ $EUID -ne 0 ]]; then
  echo "Lancez ce script avec sudo."; exit 1
fi
export DEBIAN_FRONTEND=noninteractive
mkdir -p "$DOSSIER"

# ---------------------------------------------------------------------
etape "1/5  Outils audio et de compilation"
apt-get update -y
apt-get install -y build-essential cmake git curl alsa-utils pulseaudio-utils \
  python3 python3-venv

# ---------------------------------------------------------------------
etape "2/5  Les oreilles : Whisper (modèle $WHISPER, multilingue)"
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
etape "3/5  La bouche : Piper (voix française d'homme)"
if ! [ -x "$DOSSIER/piper-venv/bin/piper" ]; then
  python3 -m venv "$DOSSIER/piper-venv"
  "$DOSSIER/piper-venv/bin/pip" install --quiet --upgrade pip
  "$DOSSIER/piper-venv/bin/pip" install --quiet piper-tts
fi
mkdir -p "$DOSSIER/voix"
# Voix d'homme pour Socrate : « tom » (qualité moyenne), sinon « gilles » (secours)
BASE="https://huggingface.co/rhasspy/piper-voices/resolve/main/fr/fr_FR"
for V in "tom/medium/fr_FR-tom-medium" "gilles/low/fr_FR-gilles-low"; do
  if curl -fL -o "$DOSSIER/voix/socrate.onnx.tmp" "$BASE/$V.onnx" \
     && curl -fL -o "$DOSSIER/voix/socrate.onnx.json" "$BASE/$V.onnx.json"; then
    mv "$DOSSIER/voix/socrate.onnx.tmp" "$DOSSIER/voix/socrate.onnx"
    echo "   Voix choisie : $(basename "$V")"; break
  fi
done
[ -f "$DOSSIER/voix/socrate.onnx" ] || { echo "   [ERREUR] Voix d'homme introuvable"; exit 1; }

# ---------------------------------------------------------------------
etape "4/5  Commande « socrate-vocal » (version Terminal, secours)"
cat > /usr/local/bin/socrate-vocal <<EOF
#!/usr/bin/env bash
# Socrate vocal hors ligne : Whisper -> Gemma 4 -> Piper
MODELE="\${MODELE:-$MODELE}"
WHISPER_BIN="$DOSSIER/whisper/build/bin/whisper-cli"
WHISPER_MODELE="$DOSSIER/whisper/models/ggml-$WHISPER.bin"
PIPER="$DOSSIER/piper-venv/bin/piper"
VOIX="$DOSSIER/voix/socrate.onnx"
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

# ---------------------------------------------------------------------
etape "5/5  Application « Socrate » (fenêtre simple, gros bouton micro)"
mkdir -p "$DOSSIER/socrate"
cat > "$DOSSIER/socrate/serveur.py" <<'SOCRATE_FIN'
#!/usr/bin/env python3
"""Socrate hors ligne — petit serveur local (SavoirIA).

Écoute sur http://127.0.0.1:8765
  GET  /               -> l'interface simple (index.html)
  GET  /sante          -> {"ok": true, "modele": ...}  (le site SavoirIA s'en sert pour détecter Socrate local)
  POST /accueil        -> {"audio"}  + préchauffe le cerveau en arrière-plan
  POST /demander-flux  -> corps JSON {"texte"} ou {"audio": wav base64}
                          réponse en flux (une ligne JSON par événement) :
                          {"type":"question","texte"} puis {"type":"phrase","texte","audio"}… puis {"type":"fin"}
  POST /demander       -> même chose en une seule réponse {"question","reponse","audio"} (compatibilité)
Chaîne : Whisper (oreilles) -> Gemma via Ollama (cerveau) -> Piper (voix).
Aucune connexion Internet nécessaire.
"""
import base64
import json
import os
import re
import subprocess
import tempfile
import threading
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

DOSSIER = os.environ.get("SAVOIRIA_DOSSIER", "/opt/savoiria")
MODELE = os.environ.get("MODELE", "gemma4:e2b")
WHISPER_BIN = f"{DOSSIER}/whisper/build/bin/whisper-cli"
WHISPER_MODELE = os.environ.get("WHISPER_MODELE", f"{DOSSIER}/whisper/models/ggml-base.bin")
PIPER = f"{DOSSIER}/piper-venv/bin/piper"
VOIX = f"{DOSSIER}/voix/socrate.onnx"
PAGE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "index.html")
PORT = int(os.environ.get("PORT", "8765"))
OLLAMA = "http://127.0.0.1:11434/api/generate"

# Sites autorisés à parler au Socrate local (le site SavoirIA et les tests locaux)
ORIGINES = {
    "https://www.savoiria.online", "https://savoiria.online",
    "http://localhost:3000", "http://127.0.0.1:8765",
}

CONSIGNE = (
    "Tu es Socrate, le tuteur bienveillant de SavoirIA, pour des étudiants qui "
    "débutent en informatique. Réponds en français simple, en 3 phrases maximum, "
    "sans liste, sans symbole ni code compliqué. Utilise une image de la vie "
    "courante, puis termine par une petite question pour faire réfléchir l'étudiant."
)
FIN_PHRASE = re.compile(r"(.+?[.!?…])(\s+|$)", re.S)


def transcrire(wav: bytes) -> str:
    with tempfile.TemporaryDirectory() as d:
        chemin = os.path.join(d, "q.wav")
        with open(chemin, "wb") as f:
            f.write(wav)
        r = subprocess.run(
            [WHISPER_BIN, "-m", WHISPER_MODELE, "-l", "fr", "-nt", "-np", "-f", chemin],
            capture_output=True, text=True, timeout=180,
        )
        return " ".join(r.stdout.split()).strip()


def parler(texte: str) -> str:
    texte = texte.strip()
    if not texte:
        return ""
    with tempfile.TemporaryDirectory() as d:
        sortie = os.path.join(d, "r.wav")
        subprocess.run([PIPER, "--model", VOIX, "--output_file", sortie],
                       input=texte, capture_output=True, text=True, timeout=120)
        if not os.path.exists(sortie):
            return ""
        with open(sortie, "rb") as f:
            return base64.b64encode(f.read()).decode()


def prechauffer():
    """Charge le cerveau en mémoire pour que la 1re réponse soit aussi rapide que les autres."""
    try:
        corps = json.dumps({"model": MODELE, "prompt": "", "keep_alive": "30m"}).encode()
        req = urllib.request.Request(OLLAMA, data=corps, headers={"Content-Type": "application/json"})
        urllib.request.urlopen(req, timeout=300).read()
    except Exception:
        pass


def penser_en_flux(question: str, contexte: str = ""):
    """Renvoie la réponse de Gemma phrase par phrase, dès que chaque phrase est complète."""
    consigne = CONSIGNE + (f"\nContexte de la leçon en cours : {contexte[:1500]}" if contexte else "")
    corps = json.dumps({
        "model": MODELE, "system": consigne, "prompt": question,
        "stream": True, "think": False, "keep_alive": "30m",
        "options": {"num_predict": 180},
    }).encode()
    req = urllib.request.Request(OLLAMA, data=corps, headers={"Content-Type": "application/json"})
    tampon = ""
    with urllib.request.urlopen(req, timeout=300) as r:
        for ligne in r:
            if not ligne.strip():
                continue
            morceau = json.loads(ligne)
            tampon += morceau.get("response", "")
            while True:
                m = FIN_PHRASE.match(tampon)
                if not m or len(m.group(1).strip()) < 8:
                    break
                yield m.group(1).strip()
                tampon = tampon[m.end():]
            if morceau.get("done"):
                break
    if tampon.strip():
        yield tampon.strip()


class Gestion(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, *args):
        pass

    # --- ouverture contrôlée au site SavoirIA (CORS + accès réseau privé de Chrome) ---
    def _entetes_site(self):
        origine = self.headers.get("Origin", "")
        if origine in ORIGINES:
            self.send_header("Access-Control-Allow-Origin", origine)
            self.send_header("Vary", "Origin")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Private-Network", "true")

    def do_OPTIONS(self):
        self.send_response(204)
        self._entetes_site()
        self.send_header("Content-Length", "0")
        self.end_headers()

    def _json(self, code, data):
        corps = json.dumps(data).encode()
        self.send_response(code)
        self._entetes_site()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(corps)))
        self.end_headers()
        self.wfile.write(corps)

    def _lire(self):
        n = int(self.headers.get("Content-Length", "0"))
        return json.loads(self.rfile.read(n) or b"{}")

    def do_GET(self):
        if self.path in ("/", "/index.html"):
            with open(PAGE, "rb") as f:
                corps = f.read()
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(corps)))
            self.end_headers()
            self.wfile.write(corps)
        elif self.path == "/sante":
            self._json(200, {"ok": True, "modele": MODELE, "voix": True})
        else:
            self._json(404, {"erreur": "introuvable"})

    def _question(self, data):
        question = (data.get("texte") or "").strip()
        if not question and data.get("audio"):
            question = transcrire(base64.b64decode(data["audio"]))
        return question

    def do_POST(self):
        if self.path == "/accueil":
            threading.Thread(target=prechauffer, daemon=True).start()
            self._json(200, {"audio": parler("Bonjour, je suis Socrate. Appuie sur le bouton bleu et pose-moi ta question.")})
            return
        if self.path == "/demander-flux":
            self._flux()
            return
        if self.path == "/demander":
            try:
                data = self._lire()
                question = self._question(data)
                if not question:
                    msg = "Je n'ai pas bien entendu. Peux-tu répéter, un peu plus près de l'ordinateur ?"
                    self._json(200, {"question": "", "reponse": msg, "audio": parler(msg)})
                    return
                reponse = " ".join(penser_en_flux(question, data.get("contexte", ""))) or \
                    "Désolé, je n'arrive pas à réfléchir pour le moment. Réessaie dans un instant."
                self._json(200, {"question": question, "reponse": reponse, "audio": parler(reponse)})
            except Exception as e:
                self._json(200, {"question": "", "reponse": "Oups, un petit souci. Réessaie.", "audio": "", "detail": str(e)})
            return
        self._json(404, {"erreur": "introuvable"})

    def _flux(self):
        self.send_response(200)
        self._entetes_site()
        self.send_header("Content-Type", "application/x-ndjson; charset=utf-8")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Transfer-Encoding", "chunked")
        self.end_headers()

        def envoyer(evt):
            ligne = (json.dumps(evt) + "\n").encode()
            self.wfile.write(f"{len(ligne):X}\r\n".encode() + ligne + b"\r\n")
            self.wfile.flush()

        try:
            data = self._lire()
            question = self._question(data)
            if not question:
                msg = "Je n'ai pas bien entendu. Peux-tu répéter, un peu plus près de l'ordinateur ?"
                envoyer({"type": "question", "texte": ""})
                envoyer({"type": "phrase", "texte": msg, "audio": parler(msg)})
            else:
                envoyer({"type": "question", "texte": question})
                rien = True
                for phrase in penser_en_flux(question, data.get("contexte", "")):
                    rien = False
                    envoyer({"type": "phrase", "texte": phrase, "audio": parler(phrase)})
                if rien:
                    msg = "Désolé, je n'arrive pas à réfléchir pour le moment. Réessaie dans un instant."
                    envoyer({"type": "phrase", "texte": msg, "audio": parler(msg)})
        except Exception as e:  # on ne plante jamais devant l'étudiant
            try:
                envoyer({"type": "phrase", "texte": "Oups, un petit souci. Réessaie.", "audio": "", "detail": str(e)})
            except Exception:
                pass
        try:
            envoyer({"type": "fin"})
            self.wfile.write(b"0\r\n\r\n")
            self.wfile.flush()
        except Exception:
            pass


if __name__ == "__main__":
    ThreadingHTTPServer(("127.0.0.1", PORT), Gestion).serve_forever()
SOCRATE_FIN
cat > "$DOSSIER/socrate/index.html" <<'SOCRATE_FIN'
<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Socrate</title>
<style>
:root{--bleu:#2563eb;--bleu-f:#1d4ed8;--fond:#eef3fb;--carte:#fff;--txt:#0f172a;--gris:#64748b}
*{box-sizing:border-box}
html,body{margin:0;height:100%;font-family:Arial,Helvetica,sans-serif;background:var(--fond);color:var(--txt)}
.app{max-width:760px;margin:0 auto;height:100%;display:flex;flex-direction:column;background:var(--carte)}
.barre{display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid #e2e8f0}
.nom{font-weight:800;font-size:22px}
.badge{background:#fef3c7;color:#92400e;font-size:14px;font-weight:700;border-radius:99px;padding:6px 12px}
.chat{flex:1;overflow-y:auto;padding:18px;display:flex;flex-direction:column;gap:12px}
.m{border-radius:18px;padding:14px 16px;font-size:19px;line-height:1.5;max-width:85%;white-space:pre-wrap}
.s{background:#eff6ff}.u{background:var(--bleu);color:#fff;margin-left:auto}
.reecouter{display:block;margin-top:8px;background:none;border:0;color:var(--bleu-f);font-weight:700;font-size:16px;cursor:pointer;padding:0}
.pied{display:flex;flex-direction:column;align-items:center;padding:18px 16px 22px;border-top:1px solid #e2e8f0}
#micro{width:130px;height:130px;border-radius:50%;border:0;background:var(--bleu);color:#fff;font-size:58px;cursor:pointer;box-shadow:0 8px 24px #2563eb55;transition:.2s}
#micro.ecoute{background:#dc2626;box-shadow:0 0 0 16px #fecaca;animation:p 1.2s infinite}
#micro.attente{background:#94a3b8;box-shadow:none;cursor:wait}
@keyframes p{50%{box-shadow:0 0 0 24px #fecaca88}}
.etat{margin-top:14px;font-size:21px;font-weight:700}
.aide{margin-top:4px;font-size:15px;color:var(--gris)}
.ecrire{display:flex;gap:8px;width:100%;margin-top:14px}
.ecrire input{flex:1;font-size:17px;padding:12px 14px;border:1px solid #cbd5e1;border-radius:14px}
.ecrire button{font-size:17px;padding:0 18px;border:0;border-radius:14px;background:#e2e8f0;font-weight:700;cursor:pointer}
</style></head>
<body><div class="app">
  <div class="barre"><span class="nom">🦉 Socrate</span><span class="badge">✈ Sans Internet</span></div>
  <div class="chat" id="chat">
    <div class="m s">Bonjour ! Je suis Socrate 👋
Appuie sur le bouton bleu et pose-moi ta question.</div>
  </div>
  <div class="pied">
    <button id="micro" aria-label="Parler à Socrate">🎤</button>
    <div class="etat" id="etat">Appuie pour parler</div>
    <div class="aide" id="aide">ou écris ta question ✏️</div>
    <form class="ecrire" id="form"><input id="texte" placeholder="Écris ta question ici…" autocomplete="off"><button>Envoyer</button></form>
  </div>
</div>
<script>
const chat = document.getElementById('chat'), micro = document.getElementById('micro'),
      etat = document.getElementById('etat'), aide = document.getElementById('aide');
let enCours = false, occupe = false, ctx, flux, noeud, morceaux = [];

function ajouter(texte, qui, audio) {
  const d = document.createElement('div'); d.className = 'm ' + qui; d.textContent = texte;
  if (audio) {
    const b = document.createElement('button'); b.className = 'reecouter'; b.textContent = '🔊 Réécouter';
    b.onclick = () => jouer(audio); d.appendChild(b);
  }
  chat.appendChild(d); chat.scrollTop = chat.scrollHeight;
}
function jouer(b64) { if (b64) new Audio('data:audio/wav;base64,' + b64).play().catch(() => {}); }
function afficher(e, a, cl) { etat.textContent = e; aide.textContent = a; micro.className = cl || ''; }

// File d'attente des phrases : Socrate dit chaque phrase dès qu'elle est prête, dans l'ordre
let fileAudio = Promise.resolve();
function enchainer(b64) {
  if (!b64) return;
  fileAudio = fileAudio.then(() => new Promise(fin => {
    const a = new Audio('data:audio/wav;base64,' + b64);
    a.onended = fin; a.onerror = fin; a.play().catch(fin);
  }));
}

async function demander(corps) {
  occupe = true; afficher('Socrate réfléchit…', 'Il va commencer à parler dans un instant 🙂', 'attente');
  let bulle = null, tout = [];
  try {
    const r = await fetch('/demander-flux', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(corps)});
    const lecteur = r.body.getReader(), dec = new TextDecoder(); let reste = '';
    while (true) {
      const {value, done} = await lecteur.read(); if (done) break;
      reste += dec.decode(value, {stream: true});
      const lignes = reste.split('\n'); reste = lignes.pop();
      for (const l of lignes) {
        if (!l.trim()) continue;
        const e = JSON.parse(l);
        if (e.type === 'question' && e.texte && corps.audio) ajouter(e.texte, 'u');
        if (e.type === 'phrase') {
          if (!bulle) { bulle = document.createElement('div'); bulle.className = 'm s'; chat.appendChild(bulle); afficher('Socrate parle…', 'Écoute bien 👂', 'attente'); }
          bulle.textContent = (bulle.textContent ? bulle.textContent + ' ' : '') + e.texte;
          chat.scrollTop = chat.scrollHeight;
          if (e.audio) tout.push(e.audio);
          enchainer(e.audio);
        }
      }
    }
    if (bulle && tout.length) {
      const b = document.createElement('button'); b.className = 'reecouter'; b.textContent = '🔊 Réécouter';
      b.onclick = () => tout.forEach(enchainer); bulle.appendChild(b);
    }
  } catch (e) {
    ajouter("Je n'arrive pas à répondre. Redémarre Socrate depuis son icône.", 's');
  }
  await fileAudio;
  occupe = false; afficher('Appuie pour parler', 'ou écris ta question ✏️');
}

function enWav(echantillons, taux) {
  const n = echantillons.length, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
  const ecrire = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  ecrire(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); ecrire(8, 'WAVE'); ecrire(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, taux, true); v.setUint32(28, taux * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  ecrire(36, 'data'); v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) { const s = Math.max(-1, Math.min(1, echantillons[i])); v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true); }
  let bin = ''; const o = new Uint8Array(buf);
  for (let i = 0; i < o.length; i += 0x8000) bin += String.fromCharCode.apply(null, o.subarray(i, i + 0x8000));
  return btoa(bin);
}

async function commencer() {
  try {
    flux = await navigator.mediaDevices.getUserMedia({audio: {channelCount: 1, echoCancellation: true, noiseSuppression: true}});
  } catch (e) {
    ajouter("Je n'arrive pas à utiliser le micro. Tu peux écrire ta question en bas ✏️", 's'); return;
  }
  ctx = new AudioContext({sampleRate: 16000}); morceaux = [];
  const src = ctx.createMediaStreamSource(flux);
  noeud = ctx.createScriptProcessor(4096, 1, 1);
  noeud.onaudioprocess = e => morceaux.push(new Float32Array(e.inputBuffer.getChannelData(0)));
  src.connect(noeud); noeud.connect(ctx.destination);
  enCours = true; afficher("Je t'écoute…", 'Appuie encore quand tu as fini', 'ecoute');
}

function arreter() {
  enCours = false; noeud.disconnect(); flux.getTracks().forEach(t => t.stop());
  const total = morceaux.reduce((a, m) => a + m.length, 0), tout = new Float32Array(total);
  let i = 0; for (const m of morceaux) { tout.set(m, i); i += m.length; }
  const taux = ctx.sampleRate; ctx.close();
  if (total < taux * 0.5) { afficher('Appuie pour parler', 'Parle un peu plus longtemps 🙂'); return; }
  demander({audio: enWav(tout, taux)});
}

micro.onclick = () => { if (occupe) return; enCours ? arreter() : commencer(); };
document.getElementById('form').onsubmit = e => {
  e.preventDefault(); const t = document.getElementById('texte');
  const q = t.value.trim(); if (!q || occupe) return;
  ajouter(q, 'u'); t.value = ''; demander({texte: q});
};
// Socrate dit bonjour à voix haute à l'ouverture
fetch('/accueil', {method: 'POST'}).then(r => r.json()).then(d => jouer(d.audio)).catch(() => {});
</script>
</body></html>
SOCRATE_FIN
chmod -R a+rX "$DOSSIER"
# Redémarre Socrate s'il tournait déjà, pour prendre la nouvelle version
pkill -f "$DOSSIER/socrate/serveur.py" 2>/dev/null || true
snap connect chromium:audio-record 2>/dev/null || true

# Lanceur : démarre le petit serveur local si besoin, puis ouvre la fenêtre
cat > /usr/local/bin/socrate <<EOF
#!/usr/bin/env bash
if ! curl -fs http://127.0.0.1:8765/sante >/dev/null 2>&1; then
  MODELE="$MODELE" WHISPER_MODELE="$DOSSIER/whisper/models/ggml-$WHISPER.bin" \\
    nohup python3 "$DOSSIER/socrate/serveur.py" >/tmp/socrate-\$USER.log 2>&1 &
  for i in \$(seq 1 20); do curl -fs http://127.0.0.1:8765/sante >/dev/null 2>&1 && break; sleep 0.5; done
fi
NAV=\$(command -v chromium || command -v chromium-browser || echo /snap/bin/chromium)
# Profil séparé (le Chromium « snap » n'écrit que dans ~/snap/chromium)
PROFIL="\$HOME/snap/chromium/common/socrate-app"
case "\$NAV" in /snap/*) ;; *) PROFIL="\$HOME/.config/socrate-app" ;; esac
exec "\$NAV" --app=http://127.0.0.1:8765 --window-size=760,860 \\
  --use-fake-ui-for-media-stream --autoplay-policy=no-user-gesture-required \\
  --user-data-dir="\$PROFIL" --no-first-run >/dev/null 2>&1
EOF
chmod +x /usr/local/bin/socrate

# Script d'épinglage, lancé une fois à la première ouverture de session
cat > /usr/local/bin/socrate-epingler <<'EOF'
#!/bin/sh
gsettings set org.gnome.shell favorite-apps "['socrate.desktop', 'savoiria.desktop', 'firefox_firefox.desktop', 'org.gnome.Nautilus.desktop']"
for f in "$HOME/Desktop/socrate.desktop" "$HOME/Bureau/socrate.desktop"; do
  [ -f "$f" ] && gio set "$f" metadata::trusted true
done
rm -f "$HOME/.config/autostart/socrate-favori.desktop"
EOF
chmod +x /usr/local/bin/socrate-epingler

# Icône « Socrate » : menu + bureau + barre de gauche, pour chaque compte
for H in /home/*; do
  [ -d "$H" ] || continue
  U=$(stat -c %U "$H"); G=$(stat -c %G "$H")
  mkdir -p "$H/.local/share/applications" "$H/.config/autostart"
  rm -f "$H/.local/share/applications/socrate-vocal.desktop"
  cat > "$H/.local/share/applications/socrate.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=Socrate
Comment=Parler à Socrate, ton tuteur, même sans Internet
Exec=/usr/local/bin/socrate
Icon=audio-input-microphone
Categories=Education;
EOF
  for B in "$H/Desktop" "$H/Bureau"; do
    [ -d "$B" ] && cp "$H/.local/share/applications/socrate.desktop" "$B/" && chmod +x "$B/socrate.desktop" && chown "$U:$G" "$B/socrate.desktop"
  done
  cat > "$H/.config/autostart/socrate-favori.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=Socrate favori
Exec=/usr/local/bin/socrate-epingler
X-GNOME-Autostart-enabled=true
EOF
  chown -R "$U:$G" "$H/.local" "$H/.config"
done

# ---------------------------------------------------------------------
echo; echo "==> Vérifications"
OK=1
[ -x "$DOSSIER/whisper/build/bin/whisper-cli" ] && echo "   [OK] Whisper (oreilles)" || { echo "   [ERREUR] Whisper"; OK=0; }
if echo "Bonjour, je suis Socrate." | "$DOSSIER/piper-venv/bin/piper" --model "$DOSSIER/voix/socrate.onnx" --output_file /tmp/test_voix.wav >/dev/null 2>&1; then
  echo "   [OK] Piper (bouche) — écoute du test :"; aplay -q /tmp/test_voix.wav 2>/dev/null || true
else
  echo "   [ERREUR] Piper"; OK=0
fi
command -v ollama >/dev/null && echo "   [OK] Gemma (cerveau)" || { echo "   [ERREUR] Ollama absent : lancez d'abord savoiria-poste.sh"; OK=0; }
echo
[ $OK -eq 1 ] && echo "Socrate prêt ! Cliquez sur l'icône « Socrate » (bureau ou barre de gauche). Redémarrez si l'icône n'apparaît pas." \
             || echo "Certaines étapes ont échoué : envoyez le texte de cet écran."
