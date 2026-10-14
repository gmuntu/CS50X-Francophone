// Petit utilitaire d'enregistrement audio compatible Chrome, Android et iPhone (Safari).
export function pickAudioType(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  for (const t of ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']) {
    if (MediaRecorder.isTypeSupported?.(t)) return t;
  }
  return '';
}

export function startRecorder(stream: MediaStream) {
  const mimeType = pickAudioType();
  const rec = new MediaRecorder(stream, { ...(mimeType ? { mimeType } : {}), audioBitsPerSecond: 24000 });
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  rec.start(1000);
  const done = () => new Promise<Blob>((resolve) => {
    const finish = () => resolve(new Blob(chunks, { type: rec.mimeType || mimeType || 'audio/webm' }));
    if (rec.state === 'inactive') return finish();
    rec.onstop = finish;
    try { rec.stop(); } catch { finish(); }
  });
  return { done };
}

export async function uploadVoice(course: string, kind: 'reference' | 'defense', audio: Blob, consent = false) {
  const fd = new FormData();
  fd.append('course', course);
  fd.append('kind', kind);
  fd.append('consent', String(consent));
  fd.append('audio', audio, `${kind}.${audio.type.includes('mp4') ? 'm4a' : 'webm'}`);
  const res = await fetch('/api/formations/projet/voix', { method: 'POST', body: fd });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(d?.error || "L'envoi de l'audio a échoué.");
}
