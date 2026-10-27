// Exécuté une fois au démarrage du serveur Next.js.
// Sur un ordinateur SavoirIA hors ligne (SAVOIRIA_LOCAL=1), toute l'IA passe par
// Gemma (Ollama), Whisper et Piper installés sur la machine. En ligne, rien ne change.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.SAVOIRIA_LOCAL === '1') {
    const { activerIALocale } = await import('./lib/local-ai');
    activerIALocale();
  }
}
