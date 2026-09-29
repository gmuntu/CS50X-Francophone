export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { auth } from '@/auth';

/**
 * Synthèse vocale via Google Cloud Text-to-Speech, voix « Chirp 3 HD »
 * (génération la plus naturelle de Google). Voix réglable avec GOOGLE_TTS_VOICE
 * (ex. fr-FR-Chirp3-HD-Charon, fr-FR-Chirp3-HD-Aoede). Si la clé n'est pas configurée, on renvoie un signal
 * `fallback` pour que le client bascule sur la synthèse vocale du navigateur.
 */
export async function POST(request: Request) {
  try {
    // Réservé aux utilisateurs connectés : protège le quota gratuit Google
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ fallback: true, error: 'Non authentifié' }, { status: 401 });
    }

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
          voice: {
            languageCode: 'fr-FR',
            // Les anciennes voix Neural2 demandées par le client sont remplacées par Chirp 3 HD
            name:
              typeof voice === 'string' && voice.includes('Chirp3-HD')
                ? voice
                : process.env.GOOGLE_TTS_VOICE || 'fr-FR-Chirp3-HD-Charon',
          },
          // Chirp 3 HD ne prend pas en charge le réglage « pitch »
          audioConfig: { audioEncoding: 'MP3', speakingRate: 0.95 },
        }),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Erreur Google Cloud TTS :', JSON.stringify(data?.error || data));
      return NextResponse.json(
        { fallback: true, error: "Erreur de l'API Google Cloud TTS" },
        { status: 502 },
      );
    }

    return NextResponse.json({ audioContent: data.audioContent });
  } catch (error: any) {
    console.error('Erreur serveur TTS :', error?.message);
    return NextResponse.json({ fallback: true, error: 'Erreur serveur' }, { status: 500 });
  }
}
