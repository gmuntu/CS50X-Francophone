// Pastille « Version facile / difficile » des exercices au choix.
export default function NiveauBadge({ level }: { level: 'facile' | 'difficile' }) {
  return (
    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${level === 'facile' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'}`}>
      {level === 'facile' ? 'Version facile' : 'Version difficile'}
    </span>
  );
}
