export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

/**
 * Synthèse vocale neuronale via Google Cloud Text-to-Speech.
 * Voix française naturelle (fr-FR-Neural2-D) — bien plus fluide que la voix
 * robotique du navigateur. Si la clé n'est pas configurée, on renvoie un signal
 * `fallback` pour que le client bascule sur la synthèse vocale du navigateur.
 */
export async function POST(request: Request) {
  try {
    const { text, voice } = await request.json();

    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ error: 'Texte manquant' }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_TTS_API_KEY?.trim();
    if (!apiKey || apiKey.startsWith('PLACEHOLDER')) {
      // Pas de clé : le client utilisera la synthèse vocale du navigateur.
      return NextResponse.json(
        { fallback: true, error: 'Clé Google Cloud TTS non configurée' },
        { status: 503 },
      );
    }

    // Google Cloud TTS limite l'entrée à 5000 octets.
    const input = text.slice(0, 4800);

    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text: input },
          voice: { languageCode: 'fr-FR', name: voice || 'fr-FR-Neural2-D' },
          audioConfig: { audioEncoding: 'MP3', speakingRate: 0.95, pitch: 0 },
        }),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Erreur Google Cloud TTS :', JSON.stringify(data?.error || data));
      return NextResponse.json(
        { error: data?.error?.message || "Erreur de l'API Google Cloud TTS" },
        { status: 502 },
      );
    }

    return NextResponse.json({ audioContent: data.audioContent });
  } catch (error: any) {
    console.error('Erreur serveur TTS :', error?.message);
    return NextResponse.json({ error: error?.message || 'Erreur serveur' }, { status: 500 });
  }
}
