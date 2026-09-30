import { prisma } from '@/lib/prisma';

/**
 * Traduction automatique des sous-titres pour le tuteur vocal Socrate.
 * Chaque nuit (tâche weekly-content) : pour chaque public/srt/semaineN.srt
 * pas encore traduit, on regroupe en paragraphes horodatés, on traduit en
 * français avec Gemini et on dépose transcripts/semaineN.fr.txt dans le
 * stockage public des podcasts (Vercel Blob).
 */
const WEEKS = Array.from({ length: 11 }, (_, i) => i);

function srtToBlocks(srt: string, windowSec = 20): string[] {
  const re = /(\d+):(\d+):(\d+)[,.]\d+\s*-->.*?\n([\s\S]*?)(?:\n\s*\n|$)/g;
  const blocks: string[] = [];
  let start: number | null = null;
  let cur: string[] = [];
  const stamp = (s: number) => `[${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}]`;
  for (const m of srt.matchAll(re)) {
    const sec = +m[1] * 3600 + +m[2] * 60 + +m[3];
    const text = m[4].replace(/\s+/g, ' ').trim();
    if (start === null) start = sec;
    if (sec - start >= windowSec && cur.length) {
      blocks.push(`${stamp(start)} ${cur.join(' ')}`);
      start = sec;
      cur = [];
    }
    if (text) cur.push(text);
  }
  if (cur.length && start !== null) blocks.push(`${stamp(start)} ${cur.join(' ')}`);
  return blocks;
}

async function translate(lines: string[]): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY absente');
  const prompt =
    "Traduis en français naturel et clair ces extraits d'un cours d'informatique (CS50). " +
    'Garde EXACTEMENT le minutage [mm:ss] au début de chaque ligne, une ligne par extrait, ' +
    'garde les termes de code en anglais. Réponds uniquement avec les lignes traduites.\n\n' +
    lines.join('\n');
  let last = '';
  for (let i = 0; i < 3; i++) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 16384 },
        }),
      },
    );
    if (res.ok) {
      const data = await res.json();
      const out = (data?.candidates?.[0]?.content?.parts ?? []).map((p: any) => p?.text ?? '').join('').trim();
      if (out) return out;
    }
    last = `Gemini ${res.status}`;
    await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
  }
  throw new Error(`Traduction impossible (${last})`);
}

async function upload(text: string, pathname: string): Promise<string> {
  const token = process.env.PODCASTS_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error('PODCASTS_READ_WRITE_TOKEN absent');
  const headers = {
    authorization: `Bearer ${token}`,
    'x-content-type': 'text/plain; charset=utf-8',
    'x-add-random-suffix': '0',
    'x-allow-overwrite': '1',
  };
  const tries: [string, string][] = [
    [`https://blob.vercel-storage.com/${pathname}`, '7'],
    [`https://vercel.com/api/blob/?pathname=${encodeURIComponent(pathname)}`, '11'],
  ];
  let err = '';
  for (const [url, v] of tries) {
    const res = await fetch(url, { method: 'PUT', headers: { ...headers, 'x-api-version': v }, body: text });
    if (res.ok) return (await res.json()).url;
    err = `${res.status} ${(await res.text()).slice(0, 150)}`;
  }
  throw new Error(`Envoi refusé : ${err}`);
}

async function blobBase(): Promise<string | null> {
  const any = await prisma.audioScript.findFirst({ where: { audioUrl: { not: null } }, select: { audioUrl: true } });
  try { return any?.audioUrl ? new URL(any.audioUrl).origin : null; } catch { return null; }
}

export async function runTranscripts(siteOrigin: string, budgetMs: number) {
  const start = Date.now();
  const done: string[] = [];
  const errors: string[] = [];
  const base = await blobBase();

  for (const n of WEEKS) {
    if (Date.now() - start > budgetMs) break;
    try {
      if (base) {
        const exists = await fetch(`${base}/transcripts/semaine${n}.fr.txt`, { method: 'HEAD', cache: 'no-store' });
        if (exists.ok) continue; // déjà traduit
      }
      const srtRes = await fetch(`${siteOrigin}/srt/semaine${n}.srt`, { cache: 'no-store' });
      if (!srtRes.ok) continue; // pas de sous-titres pour cette semaine
      const blocks = srtToBlocks(await srtRes.text());
      if (!blocks.length) continue;

      if (Date.now() - start > budgetMs - 90_000) break; // pas assez de temps : reprise la nuit prochaine
      // Tous les morceaux en parallèle (~1 min pour une vidéo de 2 h).
      const chunks: string[][] = [];
      for (let i = 0; i < blocks.length; i += 60) chunks.push(blocks.slice(i, i + 60));
      const parts = await Promise.all(chunks.map((c) => translate(c)));
      await upload(parts.join('\n'), `transcripts/semaine${n}.fr.txt`);
      done.push(`transcript semaine ${n}`);
    } catch (e: any) {
      errors.push(`transcript semaine ${n} : ${e?.message ?? 'erreur'}`);
    }
  }
  return { done, errors };
}
