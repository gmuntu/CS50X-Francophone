// Bloc « Le Notebook IA de la semaine » (Google NotebookLM), mis en avant en haut de chaque semaine.
export default function NotebookCard({ url }: { url?: string }) {
  return (
    <div className="rounded-3xl border-2 border-indigo-500 bg-gradient-to-br from-indigo-50 to-sky-50 dark:from-indigo-950/40 dark:to-sky-950/30 p-5 sm:p-6 shadow-lg shadow-indigo-500/10 flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-sky-500 text-3xl" aria-hidden>📓</div>
      <div className="flex-1 min-w-0">
        <span className="inline-block rounded-full bg-indigo-600 px-2.5 py-0.5 text-[11px] font-extrabold tracking-wide text-white">OUTIL PÉDAGOGIQUE GOOGLE · NotebookLM</span>
        <p className="mt-2 text-xl sm:text-2xl font-extrabold text-foreground">Le Notebook IA de la semaine</p>
        <p className="text-sm text-muted-foreground">Tout le cours de la semaine réuni dans NotebookLM de Google : posez vos questions, écoutez le résumé audio, révisez avec les fiches et le quiz.</p>
        <div className="mt-2.5 flex flex-wrap gap-1.5 text-xs font-semibold">
          {['💬 Questions sur le cours', '🎧 Résumé audio', '🗂️ Fiches de révision', '🧠 Carte mentale'].map((t) => (
            <span key={t} className="rounded-full border border-indigo-200 dark:border-indigo-800 bg-card px-2.5 py-1 text-indigo-800 dark:text-indigo-200">{t}</span>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">🔒 Partagé en lecture : utilisez-le librement, l'original ne peut pas être modifié. Pour vos propres notes, créez votre Notebook dans votre compte.</p>
      </div>
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer"
          className="shrink-0 rounded-2xl bg-indigo-600 px-5 py-3.5 text-center text-base font-extrabold text-white hover:bg-indigo-700">
          Ouvrir le Notebook →
          <span className="block text-[11px] font-medium opacity-85">compte Google requis · lecture seule</span>
        </a>
      ) : (
        <span className="shrink-0 rounded-2xl bg-muted px-5 py-3.5 text-center text-sm font-bold text-muted-foreground">Bientôt disponible</span>
      )}
    </div>
  );
}
