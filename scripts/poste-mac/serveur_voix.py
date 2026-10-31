# Serveur de voix SavoirIA (test sur Mac) : Qwen3-TTS en français.
# Voix « Ryan » pour Socrate (homme), « Vivian » pour l'étudiante (femme).
# POST /tts  {"texte": "...", "voix": "homme" | "femme"}  ->  audio WAV.   GET /sante -> "ok".
# N'écoute que cet ordinateur (127.0.0.1). Une seule voix fabriquée à la fois.
import io, json, os, threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import numpy as np, soundfile as sf
from mlx_audio.tts.utils import load_model

PORT = int(os.environ.get("PORT", "8766"))
MODELE = os.environ.get("VOIX_MODELE", "mlx-community/Qwen3-TTS-12Hz-0.6B-CustomVoice-8bit")
VOIX = {"homme": os.environ.get("VOIX_HOMME", "Ryan"), "femme": os.environ.get("VOIX_FEMME", "Vivian")}
TEXTE_MAX = 2000          # caractères par demande
JETONS_MAX = 12 * 120     # 12 jetons par seconde -> 2 minutes d'audio au plus

modele = load_model(MODELE)
verrou = threading.Lock()


def sans_silence_final(audio: np.ndarray, taux: int) -> np.ndarray:
    """Coupe le silence en fin d'audio (en gardant un petit quart de seconde)."""
    fort = np.nonzero(np.abs(audio) > 0.01)[0]
    return audio[: min(len(audio), fort[-1] + int(0.25 * taux))] if len(fort) else audio


def fabriquer(texte: str, voix: str) -> bytes:
    with verrou:
        morceaux, taux = [], getattr(modele, "sample_rate", 24000)
        for r in modele.generate_custom_voice(text=texte, speaker=VOIX[voix], language="french", max_tokens=JETONS_MAX):
            morceaux.append(np.array(r.audio))
            taux = getattr(r, "sample_rate", taux)
    audio = sans_silence_final(np.concatenate(morceaux), taux) if morceaux else np.zeros(1)
    tampon = io.BytesIO()
    sf.write(tampon, audio, taux, format="WAV", subtype="PCM_16")
    return tampon.getvalue()


class Gestion(BaseHTTPRequestHandler):
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
        try:
            taille = int(self.headers.get("Content-Length") or 0)
            if taille > 20_000:
                return self._repondre(413, b"trop long", "text/plain")
            donnees = json.loads(self.rfile.read(taille) or b"{}")
            texte = str(donnees.get("texte", "")).strip()[:TEXTE_MAX]
            voix = "femme" if donnees.get("voix") == "femme" else "homme"
            if not texte:
                return self._repondre(400, b"texte vide", "text/plain")
            self._repondre(200, fabriquer(texte, voix), "audio/wav")
        except Exception:
            self._repondre(500, b"erreur", "text/plain")


if __name__ == "__main__":
    print(f"Voix SavoirIA : {MODELE} ({VOIX['homme']} / {VOIX['femme']}) sur http://127.0.0.1:{PORT}", flush=True)
    ThreadingHTTPServer(("127.0.0.1", PORT), Gestion).serve_forever()
