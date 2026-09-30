'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * BÊTA — Conversation vocale en direct avec Gemini Live (WebSocket).
 * Tout est protégé par try/catch : une erreur met simplement l'état à « error »
 * et ne fait jamais planter la page ni le lecteur vidéo.
 */
export type LiveStatus = 'idle' | 'connecting' | 'listening' | 'speaking' | 'error';

const WS_URL =
  'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained';

const SYSTEM_PROMPT = `Tu es Socrate, tuteur vocal du cours CS50 en français (plateforme Savoiria).
Tu parles uniquement français, avec des phrases courtes, claires et encourageantes.
Tu guides l'étudiant par des questions plutôt que de donner directement les réponses.
Réponds en 2 à 4 phrases maximum, puis laisse l'étudiant parler.
Appuie-toi sur le contenu de la leçon ci-dessous et cite les moments de la vidéo quand c'est utile.`;

// Capture micro → PCM 16 bits, 16 kHz (format attendu par Gemini Live).
const WORKLET = `
class PcmCapture extends AudioWorkletProcessor {
  constructor() { super(); this.buf = []; this.ratio = sampleRate / 16000; this.pos = 0; }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (!ch) return true;
    for (; this.pos < ch.length; this.pos += this.ratio) {
      const s = Math.max(-1, Math.min(1, ch[Math.floor(this.pos)]));
      this.buf.push(s < 0 ? s * 0x8000 : s * 0x7fff);
    }
    this.pos -= ch.length;
    if (this.buf.length >= 1600) { this.port.postMessage(new Int16Array(this.buf).buffer, []); this.buf = []; }
    return true;
  }
}
registerProcessor('pcm-capture', PcmCapture);`;

function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

function pcm16ToFloat(b64: string) {
  const bin = atob(b64);
  const view = new DataView(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) view.setUint8(i, bin.charCodeAt(i));
  const out = new Float32Array(bin.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = view.getInt16(i * 2, true) / 0x8000;
  return out;
}

export function useGeminiLive(lessonContext: string) {
  const [status, setStatus] = useState<LiveStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const micCtxRef = useRef<AudioContext | null>(null);
  const outCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nextTimeRef = useRef(0);
  const sourcesRef = useRef<AudioBufferSourceNode[]>([]);

  const stopPlayback = useCallback(() => {
    sourcesRef.current.forEach((s) => { try { s.stop(); } catch {} });
    sourcesRef.current = [];
    nextTimeRef.current = 0;
  }, []);

  const stop = useCallback(() => {
    try { wsRef.current?.close(); } catch {}
    wsRef.current = null;
    try { streamRef.current?.getTracks().forEach((t) => t.stop()); } catch {}
    streamRef.current = null;
    try { micCtxRef.current?.close(); } catch {}
    micCtxRef.current = null;
    stopPlayback();
    try { outCtxRef.current?.close(); } catch {}
    outCtxRef.current = null;
    setStatus((s) => (s === 'error' ? s : 'idle'));
  }, [stopPlayback]);

  const fail = useCallback((msg: string) => {
    setError(msg);
    setStatus('error');
    stop();
  }, [stop]);

  const playChunk = useCallback((b64: string) => {
    const ctx = outCtxRef.current;
    if (!ctx) return;
    const data = pcm16ToFloat(b64);
    const buffer = ctx.createBuffer(1, data.length, 24000);
    buffer.copyToChannel(data, 0);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);
    const start = Math.max(ctx.currentTime, nextTimeRef.current);
    src.start(start);
    nextTimeRef.current = start + buffer.duration;
    sourcesRef.current.push(src);
    src.onended = () => {
      sourcesRef.current = sourcesRef.current.filter((s) => s !== src);
      if (sourcesRef.current.length === 0 && wsRef.current) setStatus('listening');
    };
    setStatus('speaking');
  }, []);

  const start = useCallback(async () => {
    if (wsRef.current) return;
    setError(null);
    setStatus('connecting');
    try {
      // 1. Micro (demandé tout de suite, pendant le clic)
      if (!navigator.mediaDevices?.getUserMedia) return fail('Micro non disponible sur ce navigateur.');
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
        });
      } catch {
        return fail("Micro refusé. Autorisez-le dans la barre d'adresse.");
      }
      streamRef.current = stream;
      outCtxRef.current = new AudioContext({ sampleRate: 24000 });

      // 2. Jeton éphémère (la vraie clé reste sur le serveur)
      const tr = await fetch('/api/live-token', { method: 'POST' });
      const tj = await tr.json().catch(() => ({}));
      if (!tr.ok || !tj?.token) return fail('Service vocal indisponible pour le moment.');

      // 3. WebSocket Gemini Live
      const ws = new WebSocket(`${WS_URL}?access_token=${encodeURIComponent(tj.token)}`);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({
          setup: {
            model: `models/${tj.model}`,
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } } },
            },
            systemInstruction: {
              parts: [{ text: `${SYSTEM_PROMPT}\n\n--- CONTENU DE LA LEÇON ---\n${lessonContext || '(résumé non disponible)'}` }],
            },
          },
        }));
      };

      ws.onmessage = async (ev) => {
        try {
          const text = typeof ev.data === 'string' ? ev.data : await (ev.data as Blob).text();
          const msg = JSON.parse(text);
          if (msg.setupComplete) {
            // 4. Envoi continu du micro
            const ctx = new AudioContext();
            micCtxRef.current = ctx;
            const url = URL.createObjectURL(new Blob([WORKLET], { type: 'application/javascript' }));
            await ctx.audioWorklet.addModule(url);
            URL.revokeObjectURL(url);
            const node = new AudioWorkletNode(ctx, 'pcm-capture');
            node.port.onmessage = (e) => {
              if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({
                  realtimeInput: { audio: { data: toBase64(e.data), mimeType: 'audio/pcm;rate=16000' } },
                }));
              }
            };
            ctx.createMediaStreamSource(stream).connect(node);
            setStatus('listening');
            return;
          }
          const sc = msg.serverContent;
          if (sc?.interrupted) { stopPlayback(); setStatus('listening'); }
          for (const p of sc?.modelTurn?.parts ?? []) {
            if (p?.inlineData?.data) playChunk(p.inlineData.data);
          }
        } catch (e) {
          console.warn('Gemini Live message ignoré', e);
        }
      };

      ws.onerror = () => fail('Connexion au tuteur vocal interrompue.');
      ws.onclose = (ev) => {
        if (wsRef.current === ws) {
          if (ev.code !== 1000) fail(ev.reason ? `Session terminée : ${ev.reason.slice(0, 120)}` : 'Session vocale terminée.');
          else stop();
        }
      };
    } catch (e) {
      console.error('useGeminiLive', e);
      fail('Le tuteur vocal a rencontré un problème.');
    }
  }, [fail, lessonContext, playChunk, stop, stopPlayback]);

  useEffect(() => () => stop(), [stop]);

  return { status, error, start, stop };
}
