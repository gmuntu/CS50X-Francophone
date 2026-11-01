# Service de vérification vocale SavoirIA.
#
# Deux questions, rien d'autre :
#   POST /signature  {"audio": WAV base64}                         -> signature vocale (512 nombres)
#   POST /verifier   {"audio", "signature": [...], "chiffres": "739148"}
#                    -> la voix correspond-elle à la signature ? a-t-on lu les bons chiffres ?
#   GET  /sante      -> "ok"
#
# Il ne garde RIEN : ni voix, ni signature, ni texte, ni journal du contenu.
# C'est SavoirIA qui tire les chiffres, mesure le délai, garde la signature (chiffrée) et décide.
# Chaque demande doit porter la clé secrète (Authorization: Bearer ...).
# Une seule vérification à la fois, 4 demandes au plus en attente : au-delà, réponse 503 « occupé ».
# 16 connexions ouvertes au plus ; une connexion silencieuse est coupée après 10 s.

import base64, hmac, io, json, math, os, re, threading, wave
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import numpy as np
import sherpa_onnx

PORT = int(os.environ.get("PORT", "8770"))
HOTE = os.environ.get("HOTE", "127.0.0.1")
CLE = os.environ.get("CLE_SERVICE", "")
FILS = int(os.environ.get("FILS", "1"))  # processeurs utilisés pour le calcul
MODELES = os.environ.get("MODELES", "/modeles")
# Seuils de ressemblance (0 à 1), à régler sur de vraies voix pendant le pilote.
SEUIL_MEME = float(os.environ.get("SEUIL_MEME", "0.50"))
SEUIL_DOUTE = float(os.environ.get("SEUIL_DOUTE", "0.35"))

CORPS_MAX = 1_500_000      # octets par demande
DUREE_MIN, DUREE_MAX = 1.0, 20.0  # secondes d'audio (signature)
FENETRE = 2.5             # secondes : taille des morceaux comparés un par un
DEFI_MAX = 10.0            # secondes d'audio pour un défi : juste le temps de lire les chiffres
MOTS_EN_TROP = 2           # mots tolérés en plus des chiffres (« euh », « et »…)
EN_ATTENTE_MAX = 4         # demandes acceptées en même temps ; au-delà, « occupé » tout de suite
DIMENSION = 512

if len(CLE) < 32:
    raise SystemExit("CLE_SERVICE manquante ou trop courte (32 caractères au moins).")

voix = sherpa_onnx.SpeakerEmbeddingExtractor(sherpa_onnx.SpeakerEmbeddingExtractorConfig(
    model=f"{MODELES}/voix.onnx", num_threads=FILS))
oreilles = sherpa_onnx.OfflineRecognizer.from_whisper(
    encoder=f"{MODELES}/whisper-encoder.int8.onnx", decoder=f"{MODELES}/whisper-decoder.int8.onnx",
    tokens=f"{MODELES}/whisper-tokens.txt", language="fr", task="transcribe", num_threads=FILS)
assert voix.dim == DIMENSION
verrou = threading.Lock()
compteur = threading.Lock()
en_cours = 0


class Refus(Exception):
    def __init__(self, code: int, message: str):
        self.code, self.message = code, message


def lire_wav(b64: str, duree_max: float = DUREE_MAX) -> tuple[np.ndarray, int]:
    """WAV PCM 16 bits mono (8 à 48 kHz) -> échantillons entre -1 et 1."""
    try:
        brut = base64.b64decode(b64, validate=True)
        with wave.open(io.BytesIO(brut)) as w:
            if w.getnchannels() != 1 or w.getsampwidth() != 2 or not 8000 <= w.getframerate() <= 48000:
                raise Refus(400, "audio : WAV mono 16 bits attendu")
            taux = w.getframerate()
            if w.getnframes() > duree_max * taux:
                raise Refus(400, "audio trop long")
            donnees = w.readframes(w.getnframes())
    except Refus:
        raise
    except Exception:
        raise Refus(400, "audio illisible")
    a = np.frombuffer(donnees, dtype="<i2").astype(np.float32) / 32768.0
    if len(a) < DUREE_MIN * taux:
        raise Refus(400, "audio trop court")
    if float(np.sqrt(np.mean(a ** 2))) < 0.003:
        raise Refus(400, "audio silencieux")
    return a, taux


def signature_de(a: np.ndarray, taux: int) -> np.ndarray:
    s = voix.create_stream()
    s.accept_waveform(taux, a)
    s.input_finished()
    e = np.array(voix.compute(s), dtype=np.float32)
    return e / (np.linalg.norm(e) or 1.0)


MOTS = {"zéro": "0", "zero": "0", "un": "1", "une": "1", "deux": "2", "trois": "3", "quatre": "4",
        "cinq": "5", "six": "6", "sept": "7", "huit": "8", "neuf": "9"}


def chiffres_entendus(a: np.ndarray, taux: int) -> tuple[str, int]:
    """Ce que la personne a lu, réduit aux chiffres (« sept, trois » ou « 7 3 » -> « 73 »),
    et le nombre de mots qui ne sont pas des chiffres."""
    s = oreilles.create_stream()
    s.accept_waveform(taux, a)
    oreilles.decode_stream(s)
    mots = re.findall(r"[^\W\d_]+|\d+", s.result.text.lower())
    chiffres = "".join(MOTS.get(m, m if m.isdigit() else "") for m in mots)
    return chiffres, sum(1 for m in mots if m not in MOTS and not m.isdigit())


def score_voix(ref: np.ndarray, a: np.ndarray, taux: int) -> float:
    """Ressemblance avec la signature, sur tout l'enregistrement ET sur des fenêtres de 2,5 s
    décalées d'1 s : si une autre voix parle à un moment (au début, au milieu ou à la fin),
    la fenêtre où elle parle fait baisser le score."""
    scores = [float(ref @ signature_de(a, taux))]
    fenetre, pas = int(FENETRE * taux), int(1.0 * taux)
    for debut in range(0, max(1, len(a) - fenetre + 1), pas):
        morceau = a[debut:debut + fenetre]
        if float(np.sqrt(np.mean(morceau ** 2))) >= 0.01:  # on ignore les silences
            scores.append(float(ref @ signature_de(morceau, taux)))
    return min(scores)


def lire_signature(v) -> np.ndarray:
    if not isinstance(v, list) or len(v) != DIMENSION or not all(
            isinstance(x, (int, float)) and not isinstance(x, bool) and math.isfinite(x) and -10 <= x <= 10 for x in v):
        raise Refus(400, "signature invalide")
    e = np.array(v, dtype=np.float32)
    return e / (np.linalg.norm(e) or 1.0)


def avec_verrou(calcul):
    if not verrou.acquire(timeout=20):
        raise Refus(503, "occupe")
    try:
        return calcul()
    finally:
        verrou.release()


def traiter(chemin: str, d: dict) -> dict:
    if chemin == "/signature":
        a, taux = lire_wav(str(d.get("audio", "")))
        e = avec_verrou(lambda: signature_de(a, taux))
        return {"signature": [round(float(x), 6) for x in e], "duree": round(len(a) / taux, 2)}
    if chemin == "/verifier":
        attendu = str(d.get("chiffres", ""))
        if not re.fullmatch(r"\d{4,10}", attendu):
            raise Refus(400, "chiffres invalides")
        ref = lire_signature(d.get("signature"))
        a, taux = lire_wav(str(d.get("audio", "")), DEFI_MAX)
        score, (lus, en_trop) = avec_verrou(lambda: (score_voix(ref, a, taux), chiffres_entendus(a, taux)))
        return {
            # Les bons chiffres, et presque rien d'autre : pas de long enregistrement ajouté avant ou après.
            "chiffres_ok": lus == attendu and en_trop <= MOTS_EN_TROP,
            "chiffres_entendus": lus[:20],
            "score": round(score, 3),
            "voix": "meme" if score >= SEUIL_MEME else "doute" if score >= SEUIL_DOUTE else "differente",
        }
    raise Refus(404, "introuvable")


class Gestion(BaseHTTPRequestHandler):
    timeout = 10  # une connexion silencieuse ne bloque pas le service

    def log_message(self, *args):  # aucun contenu dans les journaux
        pass

    def _repondre(self, code: int, corps: dict | str):
        b = (json.dumps(corps) if isinstance(corps, dict) else corps).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json" if isinstance(corps, dict) else "text/plain")
        self.send_header("Content-Length", str(len(b)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(b)

    def do_GET(self):
        self._repondre(200, "ok") if self.path == "/sante" else self._repondre(404, "introuvable")

    def do_POST(self):
        global en_cours
        if not hmac.compare_digest((self.headers.get("Authorization") or "").encode(), f"Bearer {CLE}".encode()):
            return self._repondre(401, {"erreur": "cle"})
        # Trop de demandes en même temps : « occupé » tout de suite, avant de lire l'audio en mémoire.
        with compteur:
            if en_cours >= EN_ATTENTE_MAX:
                return self._repondre(503, {"erreur": "occupe"})
            en_cours += 1
        try:
            self._traiter_post()
        finally:
            with compteur:
                en_cours -= 1

    def _traiter_post(self):
        if not (self.headers.get("Content-Type") or "").startswith("application/json"):
            return self._repondre(415, {"erreur": "json attendu"})
        try:
            taille = int(self.headers.get("Content-Length") or 0)
        except ValueError:
            taille = -1
        if not 0 < taille <= CORPS_MAX:
            return self._repondre(413, {"erreur": "taille invalide"})
        try:
            d = json.loads(self.rfile.read(taille))
            if not isinstance(d, dict):
                raise Refus(400, "json invalide")
            self._repondre(200, traiter(self.path, d))
        except Refus as r:
            self._repondre(r.code, {"erreur": r.message})
        except Exception:
            self._repondre(500, {"erreur": "erreur"})


class Serveur(ThreadingHTTPServer):
    """Au plus 16 connexions ouvertes : les suivantes sont fermées tout de suite."""
    daemon_threads = True
    places = threading.BoundedSemaphore(16)

    def process_request(self, request, client_address):
        if not self.places.acquire(blocking=False):
            self.shutdown_request(request)
            return
        super().process_request(request, client_address)

    def process_request_thread(self, request, client_address):
        try:
            super().process_request_thread(request, client_address)
        finally:
            self.places.release()


if __name__ == "__main__":
    print(f"Vérification vocale SavoirIA sur http://{HOTE}:{PORT} ({FILS} processeur(s))", flush=True)
    Serveur((HOTE, PORT), Gestion).serve_forever()
