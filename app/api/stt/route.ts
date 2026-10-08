export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { auth } from '@/auth';

/**
 * Reconnaissance vocale (voix → texte) via Google Cloud Speech-to-Text.
 * Utilisée quand le navigateur n'a pas de reconnaissance intégrée ou qu'elle échoue (Firefox, iPhone).
 * Même clé que la synthèse vocale : GOOGLE_TTS_API_KEY (restreinte à TTS + STT).
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const apiKey = process.env.GOOGLE_TTS_API_KEY?.trim();
  if (!apiKey) return NextResponse.json({ error: 'Reconnaissance vocale non configurée' }, { status: 503 });

  try {
    const { audio, format } = await request.json();
    const pcm = format === 'pcm16';
    if (typeof audio !== 'string' || audio.length < 100) {
      return NextResponse.json({ error: 'Audio manquant' }, { status: 400 });
    }
    if (audio.length > 1_000_000) {
      return NextResponse.json({ error: 'Enregistrement trop long (15 s maximum)' }, { status: 413 });
    }

    const res = await fetch(`https://speech.googleapis.com/v1/speech:recognize?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        config: {
          // pcm16 : envoyé par tous les téléphones (iPhone compris) après conversion dans le navigateur.
          encoding: pcm ? 'LINEAR16' : 'WEBM_OPUS',
          sampleRateHertz: pcm ? 16000 : 48000,
          languageCode: 'fr-FR',
          enableAutomaticPunctuation: true,
        },
        audio: { content: audio },
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error('Erreur Google STT :', JSON.stringify(data?.error || data));
      return NextResponse.json({ error: 'Erreur de reconnaissance vocale' }, { status: 502 });
    }
    const transcript = (data?.results ?? [])
      .map((r: any) => r?.alternatives?.[0]?.transcript ?? '')
      .join(' ')
      .trim();
    return NextResponse.json({ transcript });
  } catch (e) {
    console.error('Erreur serveur STT :', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
