'use client';

export default function PrintButton() {
  return (
    <button onClick={() => window.print()} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700">
      ⬇ Télécharger en PDF
    </button>
  );
}
