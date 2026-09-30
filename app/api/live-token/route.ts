import { NextResponse } from 'next/server';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

/**
 * BÊTA — Jeton éphémère pour Gemini Live.
 * La vraie clé GEMINI_API_KEY reste sur le serveur : le navigateur ne reçoit
 * qu'un jeton à usage unique, valable quelques minutes.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Non connecté' }, { status: 401 });

  const key = process.env.GEMINI_API_KEY;
  if (!key) return NextResponse.json({ error: 'GEMINI_API_KEY absente' }, { status: 500 });

  const now = Date.now();
  try {
    const res = await fetch('https://generativelanguage.googleapis.com/v1alpha/auth_tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        uses: 1,
        expireTime: new Date(now + 30 * 60_000).toISOString(),
        newSessionExpireTime: new Date(now + 2 * 60_000).toISOString(),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.name) {
      console.error('live-token error', res.status, JSON.stringify(data).slice(0, 300));
      return NextResponse.json({ error: 'Jeton Live indisponible' }, { status: 502 });
    }
    return NextResponse.json({
      token: data.name,
      model: process.env.GEMINI_LIVE_MODEL || 'gemini-2.5-flash-native-audio-preview-09-2025',
    });
  } catch (e) {
    console.error('live-token fetch failed', e);
    return NextResponse.json({ error: 'Jeton Live indisponible' }, { status: 502 });
  }
}
