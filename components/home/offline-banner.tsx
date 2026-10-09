
// Bandeau « Apprenez même sans Internet » : l'atout principal de SavoirIA.
export default function OfflineBanner() {
  return (
    <div className="rounded-3xl bg-gradient-to-br from-blue-900 via-blue-600 to-sky-500 p-5 sm:p-6 text-white flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
      <div className="text-4xl sm:text-5xl" aria-hidden>📥</div>
      <div className="flex-1">
        <p className="text-xl sm:text-2xl font-extrabold">Apprenez même sans Internet</p>
        <p className="text-sm text-white/90">Enregistrez une semaine sur votre téléphone quand vous avez du réseau, puis révisez partout : résumés, podcasts, quiz.</p>
        <div className="mt-2.5 flex flex-wrap gap-2 text-xs font-semibold">
          {['1. Ouvrir une semaine', '2. « Disponible hors ligne »', '3. Réviser sans connexion'].map((s) => (
            <span key={s} className="rounded-full bg-white/15 px-2.5 py-1">{s}</span>
          ))}
        </div>
      </div>
      {/* Lien classique : la page hors ligne est servie par le service worker même sans réseau */}
      <a href="/hors-ligne" className="self-start sm:self-center rounded-xl bg-white px-4 py-2.5 text-sm font-extrabold text-blue-700 whitespace-nowrap hover:bg-blue-50">
        Voir mes cours hors ligne
      </a>
    </div>
  );
}
