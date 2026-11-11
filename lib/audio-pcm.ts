// Outils micro partagés par le tuteur (assistant de cours, « Approfondir le sujet »). Navigateur seulement.

/**
 * Convertit un enregistrement (webm sur Android/Chrome, mp4 sur iPhone) en PCM 16 kHz mono (base64),
 * un format que Google et Whisper comprennent quel que soit l'appareil.
 */
export async function enregistrementVersPcm16(blob: Blob): Promise<string> {
  const AC: any = (window as any).AudioContext || (window as any).webkitAudioContext;
  const ctx = new AC();
  try {
    const buf = await blob.arrayBuffer();
    // Forme « rappel » : compatible avec les anciens Safari.
    const decoded: AudioBuffer = await new Promise((res, rej) => ctx.decodeAudioData(buf, res, rej));
    const rate = 16000;
    const off = new OfflineAudioContext(1, Math.ceil(decoded.duration * rate), rate);
    const src = off.createBufferSource();
    src.buffer = decoded;
    src.connect(off.destination);
    src.start();
    const out = (await off.startRendering()).getChannelData(0);
    const bytes = new Uint8Array(out.length * 2);
    const view = new DataView(bytes.buffer);
    for (let i = 0; i < out.length; i++) view.setInt16(i * 2, Math.max(-1, Math.min(1, out[i])) * 0x7fff, true);
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(binary);
  } finally {
    ctx.close?.();
  }
}

/** Lit un son base64 (WAV ou MP3) et attend la fin. */
export function jouerBase64(b64: string): Promise<void> {
  return new Promise((ok) => {
    if (!b64) return ok();
    const a = new Audio((b64.startsWith('UklGR') ? 'data:audio/wav;base64,' : 'data:audio/mpeg;base64,') + b64);
    a.onended = () => ok();
    a.onerror = () => ok();
    a.play().catch(() => ok());
  });
}
