export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { estPrive, lireBlobPrive } from '@/lib/blob';

// Sert un fichier privé (visage, voix) : seulement à l'élève concerné ou à l'administration.
export async function GET(req: NextRequest) {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id) return new Response('Non connecté', { status: 401 });

  const url = req.nextUrl.searchParams.get('u') ?? '';
  if (!estPrive(url)) return new Response('Introuvable', { status: 404 });

  // Les noms de fichiers commencent par l'identifiant de l'élève : identite/<id>-face0…, voix/<cours>/<id>-…
  const nom = decodeURIComponent(new URL(url).pathname.split('/').pop() ?? '');
  const staff = user.role === 'ADMIN' || user.role === 'INSTRUCTOR';
  if (!staff && !nom.startsWith(`${user.id}-`)) return new Response('Interdit', { status: 403 });

  const r = await lireBlobPrive(url);
  if (!r?.body) return new Response('Introuvable', { status: 404 });
  return new Response(r.body, {
    headers: {
      'Content-Type': r.headers.get('content-type') || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store',
    },
  });
}
