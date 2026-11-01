# Essai du service de vérification vocale, avec un dossier d'enregistrements WAV 16 kHz mono :
#   <voix>-0.wav, <voix>-2.wav, <voix>-3.wav : 3 phrases pour la signature
#   <voix>-1.wav : « sept, trois, neuf, un, quatre, huit »   <voix>-4.wav : « deux, cinq, zéro, six, sept, un »
# Utilisation : CLE_SERVICE=... python -I tester.py <dossier> [adresse du service]
import base64, glob, json, os, sys, time, urllib.error, urllib.request
from concurrent.futures import ThreadPoolExecutor

dossier = sys.argv[1]
URL = sys.argv[2] if len(sys.argv) > 2 else "http://127.0.0.1:8770"
CLE = os.environ["CLE_SERVICE"]
DEFIS = {1: "739148", 4: "250671"}


def appel(chemin, corps, cle=CLE):
    req = urllib.request.Request(URL + chemin, json.dumps(corps).encode(),
                                 {"Content-Type": "application/json", "Authorization": f"Bearer {cle}"})
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or b"{}")


def audio(nom):
    return base64.b64encode(open(f"{dossier}/{nom}.wav", "rb").read()).decode()


def moyenne(sigs):
    s = [sum(x) / len(sigs) for x in zip(*sigs)]
    n = sum(x * x for x in s) ** 0.5
    return [x / n for x in s]


voix = sorted({os.path.basename(f).rsplit("-", 1)[0] for f in glob.glob(f"{dossier}/*.wav")})
t = time.time()
signatures = {v: moyenne([appel("/signature", {"audio": audio(f"{v}-{i}")})[1]["signature"] for i in (0, 2, 3)]) for v in voix}
print(f"Signatures : {len(voix)} voix, {(time.time() - t) / (3 * len(voix)):.2f} s par enregistrement")

bons, fautes, durees = 0, [], []
for v in voix:
    for w in voix:
        for i, chiffres in DEFIS.items():
            t = time.time()
            code, r = appel("/verifier", {"audio": audio(f"{w}-{i}"), "signature": signatures[v], "chiffres": chiffres})
            durees.append(time.time() - t)
            attendu = "meme" if v == w else "differente"
            ok = code == 200 and r["voix"] in ((attendu,) if v == w else ("differente", "doute"))
            bons += ok
            if not ok or r["voix"] == "doute":
                fautes.append(f"{v} contre {w}-{i} : {r}")
print(f"Vérifications : {bons}/{len(durees)} correctes, {sum(durees) / len(durees):.2f} s en moyenne, {max(durees):.2f} s au plus")
for f in fautes:
    print("   à regarder :", f)

v = voix[0]
print("Mauvais chiffres :", appel("/verifier", {"audio": audio(f"{v}-1"), "signature": signatures[v], "chiffres": "111111"})[1])
print("Phrase au lieu des chiffres (enregistrement rejoué) :", appel("/verifier", {"audio": audio(f"{v}-0"), "signature": signatures[v], "chiffres": "739148"})[1])
print("Mauvaise clé :", appel("/verifier", {"audio": audio(f"{v}-1"), "signature": signatures[v], "chiffres": "739148"}, cle="x" * 40))
print("Signature abîmée :", appel("/verifier", {"audio": audio(f"{v}-1"), "signature": [1.0] * 10, "chiffres": "739148"}))
print("Audio illisible :", appel("/signature", {"audio": base64.b64encode(b"pas un son").decode()}))

# Dix étudiants en même temps : ils attendent leur tour, le service ne s'effondre pas.
t = time.time()
with ThreadPoolExecutor(10) as p:
    codes = list(p.map(lambda _: appel("/verifier", {"audio": audio(f"{v}-1"), "signature": signatures[v], "chiffres": "739148"})[0], range(10)))
print(f"10 demandes simultanées : codes {sorted(set(codes))}, toutes traitées en {time.time() - t:.1f} s")
