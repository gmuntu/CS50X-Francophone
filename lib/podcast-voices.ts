// Voix des podcasts : Socrate (homme africain francophone, calme et rassurant)
// et l'étudiante (jeune femme africaine francophone).
// Moteur : Google Cloud Text-to-Speech, voix « Gemini-TTS » pilotées par une consigne de style,
// sortie MP3 (légère pour les connexions lentes).
// Tout est réglable dans Vercel sans toucher au code :
//   PODCAST_TTS_MODEL, PODCAST_VOICE_SOCRATE, PODCAST_VOICE_ETUDIANTE,
//   PODCAST_STYLE_SOCRATE, PODCAST_STYLE_ETUDIANTE

export type PodcastSpeaker = 'Socrate' | 'Étudiant';

export const DEFAULT_STYLES: Record<PodcastSpeaker, string> = {
  Socrate:
    "Lis ce texte en français avec la voix d'un homme africain francophone d'une cinquantaine d'années, " +
    "avec un accent d'Afrique centrale et de l'Ouest (Cameroun, Congo, Côte d'Ivoire). " +
    'Ton calme, posé, chaleureux et rassurant, comme un professeur bienveillant qui encourage son élève. ' +
    'Débit lent et clair, pauses naturelles, jamais pressé.',
  Étudiant:
    "Lis ce texte en français avec la voix d'une jeune étudiante africaine francophone d'une vingtaine d'années, " +
    "avec un accent d'Afrique de l'Ouest et centrale. " +
    'Ton naturel, curieux et vif, parfois hésitant quand elle réfléchit, sympathique.',
};

export function podcastVoiceConfig() {
  return {
    model: process.env.PODCAST_TTS_MODEL || 'gemini-2.5-flash-tts',
    voices: {
      Socrate: process.env.PODCAST_VOICE_SOCRATE || 'Algieba', // voix masculine douce et grave
      Étudiant: process.env.PODCAST_VOICE_ETUDIANTE || 'Leda', // voix féminine jeune
    } as Record<PodcastSpeaker, string>,
    styles: {
      Socrate: process.env.PODCAST_STYLE_SOCRATE || DEFAULT_STYLES.Socrate,
      Étudiant: process.env.PODCAST_STYLE_ETUDIANTE || DEFAULT_STYLES.Étudiant,
    } as Record<PodcastSpeaker, string>,
  };
}

// Voix de secours (ancienne génération Chirp 3 HD) si Gemini-TTS est indisponible.
const FALLBACK: Record<PodcastSpeaker, string> = {
  Socrate: 'fr-FR-Chirp3-HD-Charon',
  Étudiant: 'fr-FR-Chirp3-HD-Aoede',
};

async function synth(apiKey: string, body: unknown): Promise<{ audio?: string; error?: string }> {
  const res = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(25_000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.audioContent) return { error: JSON.stringify(data?.error ?? data).slice(0, 300) };
  return { audio: data.audioContent as string };
}

/**
 * Synthétise une réplique avec la voix du personnage. Renvoie le MP3 en base64.
 * `overrides` permet à la page admin « Tester les voix » d'essayer d'autres réglages.
 */
export async function synthesizeLine(
  text: string,
  speaker: PodcastSpeaker,
  overrides?: { voice?: string; style?: string; model?: string },
): Promise<{ audio: string; engine: 'gemini' | 'chirp' } | { error: string }> {
  const apiKey = process.env.GOOGLE_TTS_API_KEY?.trim();
  if (!apiKey || apiKey.startsWith('PLACEHOLDER')) return { error: 'GOOGLE_TTS_API_KEY non configurée' };

  const cfg = podcastVoiceConfig();
  const input = text.slice(0, 3800); // limite Google : 4000 octets pour le texte

  const gemini = await synth(apiKey, {
    input: { prompt: (overrides?.style || cfg.styles[speaker]).slice(0, 3800), text: input },
    voice: { languageCode: 'fr-FR', name: overrides?.voice || cfg.voices[speaker], model_name: overrides?.model || cfg.model },
    audioConfig: { audioEncoding: 'MP3' },
  });
  if (gemini.audio) return { audio: gemini.audio, engine: 'gemini' };
  console.error('Gemini-TTS indisponible, repli Chirp :', gemini.error);

  const chirp = await synth(apiKey, {
    input: { text: input },
    voice: { languageCode: 'fr-FR', name: FALLBACK[speaker] },
    audioConfig: { audioEncoding: 'MP3', speakingRate: speaker === 'Socrate' ? 0.92 : 1 },
  });
  if (chirp.audio) return { audio: chirp.audio, engine: 'chirp' };
  return { error: `Gemini-TTS : ${gemini.error} | Chirp : ${chirp.error}` };
}
