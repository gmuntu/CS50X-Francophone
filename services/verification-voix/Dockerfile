# Service de vérification vocale SavoirIA : une boîte isolée, sans données, sans Internet une fois construite.
# Image officielle figée par son empreinte (python:3.12-slim-bookworm).
FROM python:3.12-slim-bookworm@sha256:e697c81897302a4c4333bade000d98038fbb21eb064f8ee1fd42d02ebcd9d337

# Modèles téléchargés une seule fois, à la construction, et vérifiés par leur empreinte SHA-256.
ARG VOIX_URL=https://github.com/k2-fsa/sherpa-onnx/releases/download/speaker-recongition-models/3dspeaker_speech_eres2net_base_sv_zh-cn_3dspeaker_16k.onnx
ARG VOIX_SHA=1a331345f04805badbb495c775a6ddffcdd1a732567d5ec8b3d5749e3c7a5e4b
ARG WHISPER_URL=https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-whisper-base.tar.bz2
ARG WHISPER_SHA=911b2083efd7c0dca2ac3b358b75222660dc09fb716d64fbfc417ba6c99ff3de

COPY requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir --require-hashes --only-binary=:all: -r /tmp/requirements.txt

RUN apt-get update && apt-get install -y --no-install-recommends curl bzip2 ca-certificates \
 && mkdir -p /modeles && cd /tmp \
 && curl -fsSL -o voix.onnx "$VOIX_URL" && echo "$VOIX_SHA  voix.onnx" | sha256sum -c - \
 && mv voix.onnx /modeles/voix.onnx \
 && curl -fsSL -o whisper.tar.bz2 "$WHISPER_URL" && echo "$WHISPER_SHA  whisper.tar.bz2" | sha256sum -c - \
 && tar xjf whisper.tar.bz2 \
 && mv sherpa-onnx-whisper-base/base-encoder.int8.onnx /modeles/whisper-encoder.int8.onnx \
 && mv sherpa-onnx-whisper-base/base-decoder.int8.onnx /modeles/whisper-decoder.int8.onnx \
 && mv sherpa-onnx-whisper-base/base-tokens.txt /modeles/whisper-tokens.txt \
 && rm -rf /tmp/* \
 && apt-get purge -y curl bzip2 && apt-get autoremove -y && rm -rf /var/lib/apt/lists/*

COPY serveur.py /app/serveur.py
RUN useradd --system --no-create-home voix
USER voix
ENV HOTE=0.0.0.0 PORT=8770 FILS=1 MODELES=/modeles PYTHONUNBUFFERED=1
EXPOSE 8770
HEALTHCHECK --interval=30s --timeout=5s CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8770/sante', timeout=4)"
CMD ["python", "-I", "/app/serveur.py"]
