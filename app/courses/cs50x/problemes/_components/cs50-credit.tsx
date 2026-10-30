import { CS50_PROBLEMS_SOURCE } from '@/config/cs50-problems';

// Mention obligatoire (licence CC BY-NC-SA 4.0 de CS50).
export default function Cs50Credit() {
  return (
    <p className="text-[11px] text-muted-foreground leading-relaxed border-t border-border/60 pt-4">
      Problèmes et vidéos : CS50x 2026, Harvard University (David J. Malan), {' '}
      <a href={CS50_PROBLEMS_SOURCE} target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">cs50.harvard.edu</a>. Licence{' '}
      <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/deed.fr" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">CC BY-NC-SA 4.0</a>.
      Résumés en français et traductions : SavoirIA.
    </p>
  );
}
