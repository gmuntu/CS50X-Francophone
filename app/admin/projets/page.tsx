import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { prisma } from '@/lib/prisma';
import { COURSE_TITLE, PROJECT_PARTS } from '@/lib/courses/final-project';
import { SIMILARITY_ALERT } from '@/lib/courses/similarity';
import ProjectActions from './_components/project-actions';
import VoiceCheck from './_components/voice-check';
import ResetIdentity from './_components/reset-identity';
import { faceList } from '@/lib/identity';
import { lienMedia } from '@/lib/blob';

export const dynamic = 'force-dynamic';

const STATUS: Record<string, [string, string]> = {
  SUBMITTED: ['Défense à faire', 'bg-muted text-muted-foreground'],
  DEFENDED: ['À valider', 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'],
  VALIDATED: ['Validé', 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200'],
  REDO: ['2e défense demandée', 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200'],
};

export default async function AdminProjetsPage() {
  const session = await auth();
  if (!session?.user) redirect('/auth/login');
  if (!['ADMIN', 'INSTRUCTOR'].includes((session.user as any)?.role)) redirect('/admin');

  const projects = await prisma.finalProject.findMany({ orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }] });
  const ids = Array.from(new Set(projects.flatMap((p) => [p.userId, p.similarToUserId].filter(Boolean) as string[])));
  const users = await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, firstName: true, lastName: true, email: true } });
  const idents = await prisma.identityProfile.findMany({ where: { userId: { in: projects.map((p) => p.userId) } } });
  const ident = (uid: string) => idents.find((i) => i.userId === uid);
  const name = (id?: string | null) => {
    const u = users.find((x) => x.id === id);
    return u ? ([u.firstName, u.lastName].filter(Boolean).join(' ') || u.name || u.email) : '—';
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-10 space-y-4">
        <div>
          <h1 className="text-2xl font-extrabold">Projets finaux à valider</h1>
          <p className="text-sm text-muted-foreground">Quiz mélangés · défense orale avec Socrate · empreinte vocale · comparaison des projets. Rien n'est sanctionné automatiquement : c'est vous qui décidez.</p>
        </div>
        {projects.length === 0 && <p className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">Aucun projet déposé pour l'instant.</p>}
        {projects.map((p) => {
          const [label, tone] = STATUS[p.status] ?? STATUS.SUBMITTED;
          const alert = p.similarity >= SIMILARITY_ALERT;
          const transcript = Array.isArray(p.defenseTranscript) ? (p.defenseTranscript as any[]) : [];
          return (
            <details key={p.id} className="rounded-2xl border border-border bg-card p-4" open={p.status === 'DEFENDED'}>
              <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2">
                <span className="font-bold">{name(p.userId)} <span className="font-normal text-muted-foreground">· {COURSE_TITLE[p.courseSlug] ?? p.courseSlug}</span></span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${tone}`}>{label}</span>
              </summary>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-xl border border-border p-2"><b className="block text-lg">{p.defenseScore ?? '—'}{p.defenseScore != null ? ' / 5' : ''}</b>Défense orale</div>
                <div className={`rounded-xl border p-2 ${alert ? 'border-red-300 bg-red-50 dark:bg-red-950/30' : 'border-border'}`}><b className={`block text-lg ${alert ? 'text-red-700 dark:text-red-300' : ''}`}>{Math.round(p.similarity * 100)} %</b>Ressemblance max.</div>
                <div className="rounded-xl border border-border p-2"><b className="block text-lg">{p.defenseCount}</b>Défense(s)</div>
              </div>
              {alert && <p className="mt-2 text-sm text-red-700 dark:text-red-300">⚠️ Très proche du projet de {name(p.similarToUserId)} : à vérifier.</p>}
              {p.defenseFeedback && <p className="mt-2 text-sm"><b>Avis de Socrate :</b> {p.defenseFeedback}</p>}
              <details className="mt-2 text-sm"><summary className="cursor-pointer font-semibold text-blue-700 dark:text-blue-300">Lire le projet</summary>
                <div className="mt-2 space-y-2 whitespace-pre-wrap text-muted-foreground">
                  {(PROJECT_PARTS[p.courseSlug] ?? []).map((part) => (
                    <p key={part.key}><b className="text-foreground">{part.label} :</b> {p[part.key]}</p>
                  ))}
                </div>
              </details>
              <div className="mt-3 rounded-xl border border-border p-3">
                <p className="text-sm font-bold mb-2">🤳 Visage : empreinte (à gauche) et photos de l'examen (à droite)</p>
                {ident(p.userId) ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {faceList(ident(p.userId)!.faceUrls).map((u) => <img key={u} src={lienMedia(u)} alt="" className="h-20 w-20 rounded-lg object-cover -scale-x-100 border-2 border-blue-600" />)}
                    <span className="mx-1 text-muted-foreground">↔</span>
                    {faceList(p.examFaceUrls).length ? faceList(p.examFaceUrls).map((u) => <img key={u} src={lienMedia(u)} alt="" className="h-20 w-20 rounded-lg object-cover -scale-x-100" />) : <span className="text-xs text-muted-foreground">pas encore de photo d'examen</span>}
                  </div>
                ) : <p className="text-xs text-muted-foreground">Pas encore d'empreinte SavoirIA.</p>}
                <p className="mt-2 text-xs text-muted-foreground">La comparaison automatique (visage et voix) s'activera avec le serveur KVM 2. {ident(p.userId) && <>Empreinte du {ident(p.userId)!.createdAt.toLocaleDateString('fr-FR')}.</>}</p>
                {ident(p.userId) && <ResetIdentity userId={p.userId} allowed={ident(p.userId)!.resetAllowed} />}
              </div>
              <VoiceCheck id={p.id} refUrl={lienMedia(ident(p.userId)?.voiceUrl ?? p.voiceRefUrl)} defenseUrl={lienMedia(p.voiceDefenseUrl)} match={p.voiceMatch} />
              {transcript.length > 0 && (
                <details className="mt-2 text-sm"><summary className="cursor-pointer font-semibold text-blue-700 dark:text-blue-300">Lire la transcription de la défense</summary>
                  <div className="mt-2 space-y-1">{transcript.map((l, i) => <p key={i}><b>{l.who === 'socrate' ? 'Socrate' : 'Élève'} :</b> {l.text}</p>)}</div>
                </details>
              )}
              {p.status === 'VALIDATED' && <a href={`/attestation/${p.id}`} target="_blank" className="mt-3 inline-block rounded-lg border border-border px-4 py-2 text-sm font-bold">📄 Voir l'attestation</a>}
              {p.status !== 'VALIDATED' && <ProjectActions id={p.id} canValidate={p.status === 'DEFENDED'} />}
            </details>
          );
        })}
      </main>
      <Footer />
    </div>
  );
}
