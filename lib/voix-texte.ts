// Texte envoyé à la voix : partagé par le site (lecture) et le poste (préparation des podcasts),
// pour qu'une réplique préparée à l'avance soit reconnue à l'identique.

/** Nettoie le texte pour une lecture vocale limpide (retire le Markdown brut). */
export function sanitizeForVoice(text: string): string {
  return (text ?? '')
    .replace(/```[\s\S]*?```/g, ' (bloc de code) ')
    .replace(/`[^`]*`/g, ' code ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_#>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Réplique de podcast telle que la route /api/speech la transmet (limite Google : 3 800 caractères). */
export const repliquePodcast = (texte: string) => sanitizeForVoice(texte).slice(0, 3800);

/** Texte tel que le poste l'envoie à sa voix naturelle (sans balises, 2 000 caractères au plus). */
export const texteVoixLocale = (texte: string) => texte.replace(/<[^>]+>/g, ' ').slice(0, 2000);
