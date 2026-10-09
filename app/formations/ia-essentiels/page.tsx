import Link from 'next/link';
import { auth } from '@/auth';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { IA_SLUG, IA_TITLE, IA_WEEKS } from '@/lib/courses/ia-essentiels';
import { passedWeeks, isWeekOpen } from '@/lib/courses/progress';

export const dynamic = 'force-dynamic';
export const metadata = { title: `${IA_TITLE} · SavoirIA` };

export default async function IaCoursePage() {
  const session = await auth();
  const passed = session?.user?.id ? await passedWeeks(session.user.id, IA_SLUG) : new Set<number>();
  // Admin et formateurs : toutes les semaines ouvertes (pour tester et corriger).
  const staff = ['ADMIN', 'INSTRUCTOR'].includes((session?.user as any)?.role);
  const startHref = session ? '/formations/ia-essentiels/semaine/1' : '/auth/signup';

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-6">
        <p className="text-xs text-muted-foreground mb-3">
          <Link href="/#formations" className="hover:underline">Formations</Link> › Données et intelligence artificielle › {IA_TITLE}
        </p>

        <section className="rounded-3xl border border-blue-100 dark:border-blue-900 bg-gradient-to-br from-blue-50 to-sky-50/40 dark:from-blue-950/40 dark:to-transparent p-6 sm:p-8 grid lg:grid-cols-[1fr_auto] gap-6 items-center">
          <div>
            <span className="inline-block rounded-full bg-blue-100 dark:bg-blue-900/60 px-3 py-1 text-xs font-bold text-blue-800 dark:text-blue-200">Nouveau · Parcours Données et IA</span>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight">{IA_TITLE}</h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">Comprendre et utiliser l'intelligence artificielle au travail, en français, avec Socrate. Aucune connaissance technique nécessaire.</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
              {['⏱ 5 semaines', '🕐 2 à 3 h / semaine', '🟢 Débutant', '📥 Fonctionne hors ligne', '💬 Tuteur sur WhatsApp', '🎙️ Socrate Agora'].map((t) => (
                <span key={t} className="rounded-lg border border-border bg-card px-3 py-1.5">{t}</span>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href={startHref} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700">
                {passed.size ? 'Continuer la formation' : 'Commencer la formation'}
              </Link>
              <a href="#programme" className="rounded-xl border border-blue-200 dark:border-blue-800 bg-card px-5 py-2.5 text-sm font-bold text-blue-700 dark:text-blue-300">Voir le programme</a>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 text-sm min-w-[240px]">
            <p className="font-bold mb-2">Ce que vous saurez faire</p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>Expliquer ce qu'est l'IA</li><li>Écrire de bons prompts</li><li>Gagner du temps au travail</li><li>Utiliser l'IA sans risque</li><li>Viser le certificat Google AI Essentials</li>
            </ul>
          </div>
        </section>


        <section className="mt-10">
          <h2 className="text-2xl font-extrabold">Ce que cette formation vous apporte</h2>
          <p className="text-muted-foreground">Des résultats concrets dès la première semaine, sans connaissances techniques.</p>
          <p className="mt-4 inline-block rounded-xl bg-blue-600 px-4 py-2.5 font-extrabold text-white">En 5 semaines, faites travailler l'IA pour vous, en toute sécurité.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ['⏱️', 'Gagner des heures chaque semaine', "Courriels, lettres, résumés, plans de travail : l'IA prépare le brouillon, vous décidez."],
              ['💼', 'Être plus employable', "« Je sais utiliser l'IA de façon responsable » : une compétence que les employeurs recherchent."],
              ['🎓', 'Viser un certificat reconnu', "Préparez en français le certificat Google AI Essentials, puis recevez l'attestation SavoirIA."],
              ['🛡️', 'Ne plus se faire piéger', "Repérer les erreurs de l'IA, les fausses informations et protéger vos données."],
              ['🗣️', 'Savoir bien demander', 'La méthode du bon prompt, pratiquée à voix haute avec Socrate.'],
              ['🚀', 'Un tremplin', "La porte d'entrée vers l'analyse de données, la cybersécurité ou CS50x."],
            ].map(([icon, title, text]) => (
              <div key={title} className="rounded-2xl border border-border bg-card p-4">
                <div className="text-2xl">{icon}</div>
                <p className="mt-1.5 font-bold">{title}</p>
                <p className="text-sm text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-2xl border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/30 p-4">
            <p className="font-bold text-blue-900 dark:text-blue-200">Pour qui ?</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {['Commerçants et entrepreneurs', 'Employés de bureau', 'Enseignants', 'Étudiants', "Chercheurs d'emploi", 'Retraités curieux'].map((t) => (
                <span key={t} className="rounded-full border border-blue-200 dark:border-blue-800 bg-card px-3 py-1 text-xs font-semibold text-blue-900 dark:text-blue-200">{t}</span>
              ))}
            </div>
          </div>
        </section>

        <h2 id="programme" className="mt-10 text-2xl font-extrabold scroll-mt-20">Programme en 5 semaines</h2>
        <p className="text-muted-foreground mb-4">Chaque semaine : résumé, podcast à deux voix, quiz et questions à Socrate. La semaine suivante s'ouvre quand le quiz est réussi.</p>

        <div className="space-y-3">
          {IA_WEEKS.map((w) => {
            const open = (staff || isWeekOpen(w.n, passed)) && w.ready;
            const done = passed.has(w.n);
            return (
              <div key={w.n} className={`flex gap-4 rounded-2xl bg-card p-4 sm:p-5 ${open && !done ? 'border-2 border-blue-600 shadow-md' : 'border border-border'}`}>
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-extrabold ${open || done ? 'bg-blue-600 text-white' : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200'}`}>S{w.n}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-bold">Semaine {w.n} : {w.title}</p>
                    {done ? (
                      <Link href={`/formations/ia-essentiels/semaine/${w.n}`} className="text-sm font-bold text-green-700 dark:text-green-400">✓ Réussie · revoir</Link>
                    ) : open ? (
                      <Link href={session ? `/formations/ia-essentiels/semaine/${w.n}` : '/auth/signup'} className="rounded-lg bg-blue-600 px-3.5 py-1.5 text-sm font-bold text-white">Commencer</Link>
                    ) : (
                      <span className="text-sm font-semibold text-muted-foreground">{w.ready ? `🔒 Après la semaine ${w.n - 1}` : '⏳ En préparation'}</span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{w.intro}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {w.tags.map((t) => <span key={t} className="rounded-full bg-muted px-2.5 py-0.5 text-xs">{t}</span>)}
                  </div>
                  {w.oral && (
                    <p className="mt-2 rounded-lg border border-violet-200 dark:border-violet-900 bg-violet-50 dark:bg-violet-950/30 px-3 py-2 text-xs text-violet-900 dark:text-violet-200">
                      🎙️ <b>Exercice oral avec Socrate Agora :</b> dictez un prompt à voix haute, Socrate vous aide à l'améliorer étape par étape.
                    </p>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">📄 Résumé · 🎧 Podcast Socrate & l'étudiante · ✅ Quiz{w.oral ? ' · 🎙️ Exercice oral' : ''} · 📥 Hors ligne</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 rounded-2xl border border-dashed border-blue-300 dark:border-blue-800 bg-card p-5 text-sm text-muted-foreground">
          <b className="text-foreground">Et le certificat ?</b> Cette formation vous prépare au certificat <b>Google AI Essentials</b>, délivré par Google sur Coursera (en anglais, payant selon les conditions de Google). SavoirIA vous accompagne en français ; le certificat SavoirIA de fin de formation est remis après le projet final.
        </div>
        <p className="mt-6 text-xs text-muted-foreground">SavoirIA est un accompagnement indépendant en français. SavoirIA n'est affilié ni à Google ni à Coursera.</p>
      </main>
      <Footer />
    </div>
  );
}
