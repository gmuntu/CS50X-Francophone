import Link from 'next/link';
import Header from '@/components/header';
import Footer from '@/components/footer';
import NotifyButton from '@/components/home/notify-button';
import { TRACKS, DISCLAIMER } from '@/lib/catalog';

const FEATURES = [
  { title: 'Tuteur Socrate', desc: 'Écrit, vocal et sur WhatsApp' },
  { title: 'Hors ligne', desc: 'Résumés, podcasts et quiz sans Internet' },
  { title: 'Voix africaines', desc: "Podcasts Socrate et l'étudiante" },
  { title: 'Un seul compte', desc: 'Toutes vos formations au même endroit' },
];

export default function SavoirIAHome() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <section className="bg-gradient-to-b from-blue-50 to-transparent dark:from-blue-950/30 px-4 py-16 sm:py-20">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-[1fr_auto] gap-10 items-center">
          <div>
            <span className="inline-block rounded-full bg-blue-100 dark:bg-blue-900/50 px-3 py-1 text-xs font-bold text-blue-800 dark:text-blue-200">
              Formations en ligne intelligentes · en français
            </span>
            <h1 className="mt-5 text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight text-foreground">
              Préparez les certifications du numérique,{' '}
              <span className="text-blue-600 dark:text-blue-400">avec un tuteur IA qui vous parle en français.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-base sm:text-lg text-muted-foreground">
              Un seul compte SavoirIA pour suivre plusieurs parcours vers des certificats reconnus par les employeurs :
              Harvard CS50, Google, Microsoft, AWS, CompTIA. Même avec une connexion lente ou hors ligne.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/cs50x" className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700">
                Commencer avec CS50x
              </Link>
              <Link href="#formations" className="rounded-xl border border-border bg-background px-5 py-3 text-sm font-bold text-blue-700 dark:text-blue-300 hover:bg-muted">
                Voir les formations
              </Link>
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-mark.png" alt="" aria-hidden className="hidden lg:block w-52 h-52 object-contain dark:hidden" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-mark-light.png" alt="" aria-hidden className="hidden w-52 h-52 object-contain dark:lg:block" />
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="rounded-xl border border-border bg-card p-4">
            <p className="font-bold text-foreground">{f.title}</p>
            <p className="text-sm text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </section>

      <section id="formations" className="max-w-7xl mx-auto px-4 py-14 scroll-mt-20">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">Nos formations, par parcours</h2>
        <p className="text-muted-foreground">Choisissez un métier ; chaque formation vous prépare à un certificat officiel.</p>

        {TRACKS.map((track, i) => (
          <div key={track.id} className="mt-9">
            <div className="flex items-start gap-3 mb-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">{i + 1}</span>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-foreground">{track.title}</h3>
                <p className="text-sm text-muted-foreground">{track.subtitle}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {track.courses.map((c) => {
                const open = c.status === 'disponible';
                return (
                  <div key={c.slug} className={`flex flex-col gap-1 rounded-xl border bg-card p-4 ${open ? 'border-2 border-blue-600 shadow-md' : 'border-border'}`}>
                    <span className={`self-start rounded-full px-2 py-0.5 text-[11px] font-bold ${open ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-muted text-muted-foreground'}`}>
                      {open ? 'Disponible' : 'Bientôt'}
                    </span>
                    <p className="mt-1 font-bold text-foreground">{c.title}</p>
                    <p className="text-xs text-muted-foreground">Prépare au certificat · {c.certificate}</p>
                    <p className="text-xs text-muted-foreground/70 mb-3">{c.note}</p>
                    {open && c.href ? (
                      <Link href={c.href} className="mt-auto rounded-lg bg-blue-600 py-2 text-center text-xs font-bold text-white hover:bg-blue-700">
                        Commencer
                      </Link>
                    ) : (
                      <NotifyButton slug={c.slug} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <p className="mt-12 text-xs text-muted-foreground">{DISCLAIMER}</p>
      </section>

      <Footer />
    </div>
  );
}
