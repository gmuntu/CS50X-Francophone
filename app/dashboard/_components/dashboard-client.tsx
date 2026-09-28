'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/header';
import Footer from '@/components/footer';
import {
  BookOpen, Award, TrendingUp, Brain, ArrowRight, CheckCircle,
  FolderCheck, ShieldCheck
} from 'lucide-react';
import Link from 'next/link';
import { CS50_MODULES } from '@/config/course-modules';
import { motion } from 'framer-motion';

interface Props {
  user: {
    id?: string;
    name?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    image?: string | null;
    photoUrl?: string | null;
    dossierNumber?: string | null;
    studentType?: string | null;
    university?: string | null;
    facialVerificationStatus?: string | null;
    role?: string | null;
  };
}

export default function DashboardClient({ user }: Props) {
  const [progress, setProgress] = useState<any[]>([]);
  const [quizAttempts, setQuizAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [pRes, qRes] = await Promise.all([
          fetch('/api/progress'),
          fetch('/api/quiz-attempts'),
        ]);
        if (pRes.ok) setProgress(await pRes.json());
        if (qRes.ok) setQuizAttempts(await qRes.json());
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const completedCount = progress?.filter?.((p: any) => p?.status === 'COMPLETED')?.length ?? 0;
  const totalModules = CS50_MODULES?.length ?? 11;
  const avgScore = progress?.length > 0
    ? Math.round((progress?.reduce?.((acc: number, p: any) => acc + (p?.score ?? 0), 0) ?? 0) / progress.length)
    : 0;

  // Détermine le module recommandé pour reprendre l'apprentissage
  const nextModule = CS50_MODULES.find((m: any) => {
    const p = progress?.find?.((pr: any) => pr?.lessonId === m?.id);
    return p?.status !== 'COMPLETED';
  }) ?? CS50_MODULES[0];

  const nextModuleProgress = progress?.find?.((pr: any) => pr?.lessonId === nextModule?.id);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Carte d'Étudiant Académique & Biométrie */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border/80 rounded-3xl p-5 sm:p-6 shadow-soft-sm flex flex-col sm:flex-row sm:items-center justify-between gap-5"
        >
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-primary/30 shadow-md shrink-0 bg-muted flex items-center justify-center">
              {user.photoUrl ? (
                <img
                  src={user.photoUrl}
                  alt={user.name || 'Photo étudiant'}
                  className="w-full h-full object-cover"
                />
              ) : user.image ? (
                <img
                  src={user.image}
                  alt={user.name || 'Avatar'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary text-xl font-bold">
                  {(user.firstName?.[0] || user.name?.[0] || 'E').toUpperCase()}
                </div>
              )}
              {user.photoUrl && (
                <span className="absolute bottom-1 right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-card rounded-full" title="Biométrie enregistrée" />
              )}
            </div>

            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight truncate">
                  {user.name || (user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Apprenant')}
                </h1>
                {user.studentType === 'UNIVERSITAIRE' ? (
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Bourse Conventionnée
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    Candidat Libre
                  </span>
                )}
              </div>

              {user.dossierNumber ? (
                <p className="text-xs font-mono font-bold text-primary flex items-center gap-1.5">
                  <FolderCheck className="w-3.5 h-3.5" /> Dossier N° {user.dossierNumber}
                  {user.university ? <span className="text-muted-foreground font-normal">• {user.university}</span> : ''}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">Votre tableau de bord d'apprentissage CS50</p>
              )}

              <div className="flex items-center gap-3 pt-1 text-[11px] text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {user.photoUrl || user.facialVerificationStatus === 'VERIFIED'
                    ? 'Biométrie certifiée (Anti-plagiat actif)'
                    : 'Vérification d\'identité'}
                </span>
                {user.email && (
                  <>
                    <span className="text-muted-foreground/60">•</span>
                    <span>{user.email}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Parcours CS50x
            </div>
          </div>
        </motion.div>

        {/* Hero Next Action Card */}
        {nextModule && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-card border border-primary/20 p-6 sm:p-7 shadow-soft-md"
          >
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-primary text-primary-foreground text-[11px] font-extrabold uppercase tracking-wide">
                    Semaine {nextModule.id}
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground">Reprendre là où vous vous êtes arrêté</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">{nextModule.title}</h2>
                <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">{nextModule.description}</p>
                {nextModule.topics && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {nextModule.topics.map((t: string) => (
                      <span key={t} className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-background/80 text-foreground/80 border border-border/80">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="shrink-0 flex items-center gap-3">
                <Link
                  href={`/courses/cs50x/lessons/${nextModule.id}`}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/30 flex items-center justify-center gap-2 group"
                >
                  Continuer la leçon
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </div>
          </motion.div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: BookOpen, label: 'Modules complétés', value: `${completedCount}/${totalModules}`, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10' },
            { icon: TrendingUp, label: 'Progression', value: `${Math.round((completedCount / totalModules) * 100)}%`, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
            { icon: Award, label: 'Score moyen', value: `${avgScore}%`, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10' },
            { icon: Brain, label: 'Quiz passés', value: `${quizAttempts?.length ?? 0}`, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-500/10' },
          ]?.map?.((s: any, i: number) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
              className="bg-card border border-border/80 rounded-2xl p-5 shadow-soft-sm hover:shadow-soft-md transition-shadow"
            >
              <div className="flex items-center gap-3.5">
                <div className={`w-11 h-11 rounded-xl ${s.bg} flex items-center justify-center ${s.color} shrink-0`}>
                  <s.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-black text-foreground tracking-tight">{s?.value}</p>
                  <p className="text-xs text-muted-foreground font-semibold">{s?.label}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Course Track Modules */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-bold text-foreground">Programme des cours</h2>
              <Link href="/courses" className="inline-flex items-center gap-1.5 text-xs text-primary font-bold hover:underline">
                Voir tous les cours <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-3">
              {CS50_MODULES?.slice?.(0, 6)?.map?.((m: any, i: number) => {
                const p = progress?.find?.((pr: any) => pr?.lessonId === m?.id);
                const status = p?.status ?? 'NOT_STARTED';
                const isCompleted = status === 'COMPLETED';
                const isInProgress = status === 'IN_PROGRESS';

                return (
                  <motion.div
                    key={m?.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <Link
                      href={`/courses/cs50x/lessons/${m?.id}`}
                      className="block bg-card border border-border/80 rounded-2xl p-4 hover:border-primary/40 hover:shadow-soft-md transition-all group"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="shrink-0">
                            {isCompleted ? (
                              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
                                <CheckCircle className="w-4 h-4" />
                              </div>
                            ) : isInProgress ? (
                              <div className="w-8 h-8 rounded-xl bg-primary/15 text-primary flex items-center justify-center font-bold text-xs">
                                {m.id}
                              </div>
                            ) : (
                              <div className="w-8 h-8 rounded-xl bg-muted text-muted-foreground flex items-center justify-center font-bold text-xs">
                                {m.id}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-foreground text-sm group-hover:text-primary transition truncate">
                                {m?.title}
                              </p>
                              {isCompleted && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                  Terminé
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {m?.topics?.join?.(' · ')}
                            </p>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground/60 group-hover:text-primary group-hover:translate-x-1 transition shrink-0" />
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Right Sidebar Widgets */}
          <div className="space-y-5">
            {/* Tuteur Socrate Card */}
            <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 via-card to-card p-5 shadow-soft-sm space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#7c3aed] text-white flex items-center justify-center shadow-md shadow-[#7c3aed]/25">
                  <Brain className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-sm">Tuteur Socrate IA</h3>
                  <p className="text-[11px] text-muted-foreground font-medium">Méthode socratique guidée</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Posez vos questions et développez votre raisonnement avec la méthode socratique.
              </p>
              <Link
                href="/tuteur"
                className="block w-full text-center py-2.5 rounded-xl bg-[#7c3aed] text-white text-xs font-bold hover:bg-[#6d28d9] transition shadow-md shadow-[#7c3aed]/20"
              >
                Accéder au Tuteur
              </Link>
            </div>

            {/* Quizzes attempts widget */}
            <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-soft-sm space-y-3">
              <h3 className="font-bold text-foreground text-sm">Derniers quiz</h3>
              {(quizAttempts?.length ?? 0) === 0 ? (
                <p className="text-xs text-muted-foreground py-2">Aucun quiz passé pour le moment.</p>
              ) : (
                <div className="space-y-2.5">
                  {quizAttempts?.slice?.(0, 5)?.map?.((a: any) => (
                    <div key={a?.id} className="flex items-center justify-between p-2 rounded-xl bg-muted/40 border border-border/50 text-xs">
                      <span className="text-foreground font-medium truncate pr-2">{a?.quiz?.title ?? 'Quiz'}</span>
                      <span className={`font-black px-2 py-0.5 rounded-md ${
                        a?.passed ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                      }`}>
                        {a?.score}/{a?.total}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
