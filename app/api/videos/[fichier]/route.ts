export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';

// SavoirIA LOCAL : sert les vidéos des cours copiées sur l'ordinateur (savoiria-videos.sh),
// pour les regarder sans Internet. Accepte les requêtes « Range » : on peut avancer dans la vidéo.
const DOSSIER = path.join(process.env.SAVOIRIA_DOSSIER || '/opt/savoiria', 'videos');
// <identifiant YouTube>.mp4 ou <identifiant YouTube>.<fr|en>.vtt (sous-titres) : rien d'autre.
const NOM_VALIDE = /^[A-Za-z0-9_-]{11}(\.mp4|\.(fr|en)\.vtt)$/;

export async function GET(req: NextRequest, { params }: { params: Promise<{ fichier: string }> }) {
  if (process.env.SAVOIRIA_LOCAL !== '1') return new Response('Introuvable', { status: 404 });
  const { fichier } = await params;
  if (!NOM_VALIDE.test(fichier)) return new Response('Introuvable', { status: 404 });

  const chemin = path.join(DOSSIER, fichier);
  let taille: number;
  try {
    taille = (await stat(chemin)).size;
  } catch {
    return new Response('Introuvable', { status: 404 });
  }

  const type = fichier.endsWith('.mp4') ? 'video/mp4' : 'text/vtt; charset=utf-8';
  const entetes: Record<string, string> = {
    'Content-Type': type,
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'public, max-age=86400',
    'X-Content-Type-Options': 'nosniff',
  };

  const plage = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get('range') ?? '');
  if (plage && (plage[1] || plage[2])) {
    // « bytes=-500 » : les 500 derniers octets
    const debut = plage[1] ? Number(plage[1]) : Math.max(0, taille - Number(plage[2]));
    const fin = plage[1] && plage[2] ? Math.min(Number(plage[2]), taille - 1) : taille - 1;
    if (debut >= taille || debut > fin) {
      return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${taille}` } });
    }
    const flux = Readable.toWeb(createReadStream(chemin, { start: debut, end: fin })) as ReadableStream;
    return new Response(flux, {
      status: 206,
      headers: { ...entetes, 'Content-Range': `bytes ${debut}-${fin}/${taille}`, 'Content-Length': String(fin - debut + 1) },
    });
  }

  const flux = Readable.toWeb(createReadStream(chemin)) as ReadableStream;
  return new Response(flux, { headers: { ...entetes, 'Content-Length': String(taille) } });
}
