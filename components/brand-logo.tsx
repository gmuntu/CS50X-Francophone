// Identité SavoirIA : emblème + nom (« IA » en majuscules, bleu clair).

/** Emblème SavoirIA ; version claire automatique en mode sombre. */
export function BrandMark({ className = 'w-9 h-9' }: { className?: string }) {
  return (
    <span className={`relative inline-block shrink-0 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/logo-mark.png" alt="SavoirIA" className="w-full h-full object-contain dark:hidden" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/logo-mark-light.png" alt="" aria-hidden className="w-full h-full object-contain hidden dark:block" />
    </span>
  );
}

/** Nom de marque : « Savoir » + « IA » en bleu clair. */
export function BrandName({ className = '' }: { className?: string }) {
  return (
    <span className={className}>
      Savoir<span className="text-sky-500 dark:text-sky-400">IA</span>
    </span>
  );
}
