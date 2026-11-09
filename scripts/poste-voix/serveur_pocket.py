# Serveur de voix naturelle d'un ordinateur d'école SavoirIA (Ubuntu, sans carte graphique).
# Moteur : Kyutai Pocket TTS (modèle CC BY 4.0), en français.
# Voix « javert » pour Socrate (homme), « estelle » pour l'étudiante (femme) : toutes deux CC0.
#
# POST /tts  {"texte": "...", "voix": "homme" | "femme", "garder": bool, "prepa": bool}  ->  audio WAV.
#   garder : la voix fabriquée est gardée sur le disque (podcasts) ; une 2e demande identique est immédiate.
#   prepa  : préparation à l'avance ; elle cède toujours la place aux demandes des élèves.
# GET /sante -> "ok".
# N'écoute que cet ordinateur (127.0.0.1). Une seule voix fabriquée à la fois.
import hashlib, io, json, os, threading, wave
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import numpy as np
from pocket_tts import TTSModel

PORT = int(os.environ.get("PORT", "8766"))
CACHE = os.environ.get("VOIX_CACHE", "/var/cache/savoiria-voix")
CACHE_MAX = int(os.environ.get("VOIX_CACHE_MO", "2000")) * 1024 * 1024
VOIX = {"homme": os.environ.get("VOIX_HOMME", "javert"), "femme": os.environ.get("VOIX_FEMME", "estelle")}
TEXTE_MAX = 2000  # caractères par demande

modele = TTSModel.load_model(language="french")
ETATS = {k: modele.get_state_for_audio_prompt(v) for k, v in VOIX.items()}
os.makedirs(CACHE, mode=0o700, exist_ok=True)
ATTENTE_PREPA = 600  # une préparation qui attend plus de 10 min abandonne (elle reprendra plus tard)

# Un seul calcul à la fois. Les demandes des élèves passent avant la préparation à l'avance.
cond = threading.Condition()
occupe = False
eleves_en_attente = 0


class Occupe(Exception):
    pass


def cle(texte: str, voix: str) -> str:
    return hashlib.sha256(f"{voix}\n{' '.join(texte.split())}".encode()).hexdigest()


def en_wav(audio: np.ndarray, taux: int) -> bytes:
    pcm = (np.clip(audio, -1, 1) * 32767).astype("<i2").tobytes()
    tampon = io.BytesIO()
    with wave.open(tampon, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(taux); w.writeframes(pcm)
    return tampon.getvalue()


def faire_place(besoin: int) -> None:
    """Cache plein : on retire les répliques les plus anciennes (elles seront refaites au besoin)."""
    fichiers = sorted((e for e in os.scandir(CACHE) if e.is_file()), key=lambda e: e.stat().st_mtime)
    total = sum(e.stat().st_size for e in fichiers)
    for e in fichiers:
        if total + besoin <= CACHE_MAX:
            break
        total -= e.stat().st_size
        try:
            os.remove(e.path)
        except OSError:
            pass


def fabriquer(texte: str, voix: str, prepa: bool) -> bytes:
    global occupe, eleves_en_attente
    with cond:
        if prepa:
            # La préparation attend qu'aucun élève n'attende ; elle ne bloque jamais quelqu'un.
            if not cond.wait_for(lambda: not occupe and eleves_en_attente == 0, timeout=ATTENTE_PREPA):
                raise Occupe()
        else:
            eleves_en_attente += 1
            try:
                # Au-delà de 60 s d'attente, on répond « occupé » (le site prend alors Piper).
                if not cond.wait_for(lambda: not occupe, timeout=60):
                    raise Occupe()
            finally:
                eleves_en_attente -= 1
        occupe = True
    try:
        audio = modele.generate_audio(ETATS[voix], texte).numpy().reshape(-1)
    finally:
        with cond:
            occupe = False
            cond.notify_all()
    return en_wav(audio, modele.sample_rate)


HOTES = {f"127.0.0.1:{PORT}", f"localhost:{PORT}"}


class Gestion(BaseHTTPRequestHandler):
    timeout = 30  # une connexion silencieuse ne bloque pas le serveur

    def log_message(self, *args):  # pas de texte d'élève dans les journaux
        pass

    def _repondre(self, code: int, corps: bytes, type_: str):
        self.send_response(code)
        self.send_header("Content-Type", type_)
        self.send_header("Content-Length", str(len(corps)))
        self.end_headers()
        self.wfile.write(corps)

    def do_GET(self):
        if self.path == "/sante":
            return self._repondre(200, b"ok", "text/plain")
        self._repondre(404, b"", "text/plain")

    def do_POST(self):
        if self.path != "/tts":
            return self._repondre(404, b"", "text/plain")
        # Seulement des demandes JSON adressées à cet ordinateur (pas une page web quelconque).
        if self.headers.get("Host") not in HOTES or not (self.headers.get("Content-Type") or "").startswith("application/json"):
            return self._repondre(403, b"interdit", "text/plain")
        try:
            taille = int(self.headers.get("Content-Length") or 0)
            if taille <= 0 or taille > 20_000:
                return self._repondre(413, b"taille invalide", "text/plain")
            donnees = json.loads(self.rfile.read(taille) or b"{}")
            texte = str(donnees.get("texte", "")).strip()[:TEXTE_MAX]
            voix = "femme" if donnees.get("voix") == "femme" else "homme"
            if not texte:
                return self._repondre(400, b"texte vide", "text/plain")
            fichier = os.path.join(CACHE, cle(texte, voix) + ".wav")
            if os.path.isfile(fichier):
                with open(fichier, "rb") as f:
                    return self._repondre(200, f.read(), "audio/wav")
            wav = fabriquer(texte, voix, bool(donnees.get("prepa")))
            if donnees.get("garder") and len(wav) <= CACHE_MAX:
                faire_place(len(wav))
                provisoire = fichier + ".part"
                with open(provisoire, "wb") as f:
                    f.write(wav)
                os.replace(provisoire, fichier)
            self._repondre(200, wav, "audio/wav")
        except Occupe:
            self._repondre(503, b"occupe", "text/plain")
        except Exception:
            self._repondre(500, b"erreur", "text/plain")


if __name__ == "__main__":
    print(f"Voix SavoirIA : Pocket TTS ({VOIX['homme']} / {VOIX['femme']}) sur http://127.0.0.1:{PORT}", flush=True)
    ThreadingHTTPServer(("127.0.0.1", PORT), Gestion).serve_forever()
