import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getAttestation } from '@/lib/attestation';
import PrintButton from './print-button';

export const dynamic = 'force-dynamic';

// Attestation imprimable (format A4 paysage) — « Télécharger en PDF » via l'impression du navigateur.
export default async function AttestationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect('/auth/login');
  const a = await getAttestation(id);
  if (!a) notFound();
  const staff = ['ADMIN', 'INSTRUCTOR'].includes((session.user as any)?.role);
  if (a.userId !== session.user.id && !staff) notFound();
  const site = process.env.NEXTAUTH_URL?.replace(/\/$/, '') || 'https://www.savoiria.online';

  return (
    <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0">
      <style>{`@page { size: A4 landscape; margin: 0 } @media print { .no-print { display: none !important } }`}</style>
      <div className="no-print mx-auto mb-4 flex max-w-[1000px] justify-end gap-2 px-4">
        <PrintButton />
      </div>
      <div className="mx-auto aspect-[297/210] w-full max-w-[1000px] bg-white p-3 shadow-xl print:max-w-none print:shadow-none" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
        <div className="flex h-full flex-col items-center justify-between rounded-sm border-[6px] border-double border-blue-700 px-10 py-8 text-center text-slate-900">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-mark.png" alt="" className="h-14 w-14" />
            <span className="text-3xl font-extrabold">Savoir<span className="text-sky-500">IA</span></span>
          </div>
          <div>
            <p className="text-sm font-bold tracking-[0.3em] text-blue-700">ATTESTATION DE RÉUSSITE</p>
            <p className="mt-4 text-base text-slate-600">Nous attestons que</p>
            <p className="mt-2 text-4xl font-extrabold">{a.name}</p>
            <p className="mt-4 text-base text-slate-600">a suivi avec succès la formation</p>
            <p className="mt-1 text-2xl font-bold text-blue-800">{a.course}</p>
            <p className="mx-auto mt-4 max-w-2xl text-sm text-slate-600">
              et a présenté son projet final{a.projectTitle ? <> « <b>{a.projectTitle}</b> »</> : null}, défendu à l'oral avec le tuteur Socrate
              {a.score != null ? <> (note {a.score} / 5)</> : null}, puis validé par un formateur.
            </p>
          </div>
          <div className="grid w-full grid-cols-3 items-end text-xs text-slate-600">
            <div className="text-left">
              <p className="font-bold text-slate-900">Délivrée le {a.date}</p>
              <p>Code de vérification : <b className="font-mono text-slate-900">{a.code}</b></p>
              <p>{site.replace(/^https?:\/\//, '')}/verifier/{a.id}</p>
            </div>
            <div className="text-center">
              <p className="font-serif text-xl italic text-slate-900">Ghislain</p>
              <p className="mx-auto mt-1 w-40 border-t border-slate-400 pt-1">Fondateur, SavoirIA</p>
            </div>
            <p className="text-right text-[10px] leading-snug">
              Attestation SavoirIA, accompagnement indépendant en français. Elle ne remplace pas les certificats délivrés par Harvard / CS50, Google ou d'autres organismes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
