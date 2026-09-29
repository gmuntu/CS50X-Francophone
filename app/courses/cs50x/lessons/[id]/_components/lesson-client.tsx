'use client';

import { useState } from 'react';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { BookOpen, Play, Brain, FileText, ArrowLeft, Volume2, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import type { CourseModuleConfig } from '@/config/course-modules';
import InteractiveQuizModal from '@/components/interactive-quiz-modal';
import CourseAssistant from '@/components/course-assistant';

interface Props {
  moduleConfig: CourseModuleConfig;
  lesson: any;
  userId: string;
}

export default function LessonClient({ moduleConfig, lesson, userId }: Props) {
  const [activeTab, setActiveTab] = useState<'video' | 'audio' | 'quiz' | 'exercises'>('video');
  const [quizModalOpen, setQuizModalOpen] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState<any>(null);

  const quizzes = lesson?.quizzes ?? [];
  const audioScripts = lesson?.audioScripts ?? [];
  const exercises = lesson?.exercises ?? [];
  const videoSummary = lesson?.videoSummary;

  const tabs = [
    { id: 'video', label: 'Vidéo & Résumé', icon: Play },
    { id: 'audio', label: 'Podcasts', icon: Volume2 },
    { id: 'quiz', label: `Quiz (${quizzes?.length ?? 0})`, icon: Brain },
    { id: 'exercises', label: `Exercices (${exercises?.length ?? 0})`, icon: FileText },
  ];

  const currentWeek = moduleConfig?.id ?? 0;
  const prevWeek = currentWeek > 0 ? currentWeek - 1 : null;
  const nextWeek = currentWeek < 10 ? currentWeek + 1 : null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Breadcrumb & Navigation */}
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/courses"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition px-3 py-1.5 rounded-lg hover:bg-muted"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Retour aux cours
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Savoiria</span>
            <span className="text-muted-foreground/40">/</span>
            <span className="text-xs font-bold text-foreground">Semaine {moduleConfig?.id}</span>
          </div>
        </div>

        {/* Lesson Header Title & Topics */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-extrabold border border-primary/20">
              Semaine {moduleConfig?.id}
            </span>
            {moduleConfig?.topics?.map((topic: string) => (
              <span key={topic} className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-card border border-border/80 text-foreground/80">
                {topic}
              </span>
            ))}
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-foreground tracking-tight">{moduleConfig?.title}</h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-3xl leading-relaxed">{moduleConfig?.description}</p>
        </motion.div>

        {/* 2-Columns Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Main Learning Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Segmented Tabs Bar */}
            <div className="flex p-1 bg-muted/60 border border-border/80 rounded-2xl gap-1 overflow-x-auto">
              {tabs?.map?.((tab: any) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab?.id;
                return (
                  <button
                    key={tab?.id}
                    onClick={() => setActiveTab(tab?.id)}
                    className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all flex-1 ${
                      isActive
                        ? 'bg-card text-foreground shadow-sm shadow-black/5 border border-border/60'
                        : 'text-muted-foreground hover:text-foreground hover:bg-card/40'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : ''}`} />
                    <span>{tab?.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Video Tab */}
            {activeTab === 'video' && (
              <div className="space-y-6">
                {moduleConfig?.videoUrl && (
                  <div className="aspect-video bg-black border border-border/80 rounded-2xl overflow-hidden shadow-soft-sm">
                    <iframe
                      src={moduleConfig.videoUrl}
                      className="w-full h-full"
                      allowFullScreen
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      title={moduleConfig?.title}
                    />
                  </div>
                )}
                {videoSummary ? (
                  <div className="bg-card border border-border/80 rounded-2xl p-6 sm:p-7 shadow-soft-sm space-y-4">
                    <h2 className="text-xl font-extrabold text-foreground tracking-tight border-b border-border/60 pb-3">
                      {videoSummary?.title ?? 'Résumé Vidéo'}
                    </h2>
                    <div
                      className="prose-cs50"
                      dangerouslySetInnerHTML={{ __html: (videoSummary?.overview ?? '').replace?.(/\n/g, '<br/>') }}
                    />
                  </div>
                ) : (
                  <div className="bg-card border border-border/80 rounded-2xl p-8 text-center shadow-soft-sm">
                    <BookOpen className="w-10 h-10 text-muted-foreground/60 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Le résumé vidéo sera généré par l'IA prochainement.</p>
                  </div>
                )}
              </div>
            )}

            {/* Audio Tab */}
            {activeTab === 'audio' && (
              <div className="space-y-4">
                {moduleConfig?.podcastUrl && (
                  <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-soft-sm space-y-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                        <Volume2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-foreground text-sm">Podcast de la semaine</h3>
                        <p className="text-xs text-muted-foreground">Écoute en mobilité pour assimiler les concepts</p>
                      </div>
                    </div>
                    <audio controls className="w-full pt-2" src={moduleConfig.podcastUrl}>
                      Votre navigateur ne supporte pas l'élément audio.
                    </audio>
                  </div>
                )}

                {audioScripts?.length > 0 ? (
                  audioScripts.map((script: any) => (
                    <div key={script?.id} className="bg-card border border-border/80 rounded-2xl p-5 shadow-soft-sm space-y-2">
                      <h4 className="font-bold text-foreground text-sm">{script?.title}</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">{script?.pedagogicalObjective}</p>
                      {script?.audioUrl && (
                        <audio controls className="w-full pt-1" src={script.audioUrl} />
                      )}
                    </div>
                  ))
                ) : (
                  !moduleConfig?.podcastUrl && (
                    <div className="bg-card border border-border/80 rounded-2xl p-8 text-center shadow-soft-sm">
                      <Volume2 className="w-10 h-10 text-muted-foreground/60 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">Les scripts audio seront générés prochainement.</p>
                    </div>
                  )
                )}
              </div>
            )}

            {/* Quiz Tab */}
            {activeTab === 'quiz' && (
              <div className="space-y-4">
                {quizzes?.length > 0 ? (
                  quizzes.map((quiz: any) => (
                    <div
                      key={quiz?.id}
                      className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 shadow-soft-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-primary/40 transition"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Brain className="w-4 h-4 text-primary" />
                          <h4 className="font-bold text-foreground text-sm sm:text-base">{quiz?.title}</h4>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {quiz?.questions?.length ?? 0} questions pour tester votre compréhension
                        </p>
                      </div>
                      <button
                        onClick={() => { setSelectedQuiz(quiz); setQuizModalOpen(true); }}
                        className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs sm:text-sm font-bold hover:bg-primary/90 transition shadow-md shadow-primary/20 shrink-0"
                      >
                        Passer le quiz
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="bg-card border border-border/80 rounded-2xl p-8 text-center shadow-soft-sm">
                    <Brain className="w-10 h-10 text-muted-foreground/60 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Les quiz seront disponibles prochainement.</p>
                  </div>
                )}
              </div>
            )}

            {/* Exercises Tab */}
            {activeTab === 'exercises' && (
              <div className="space-y-4">
                {exercises?.length > 0 ? (
                  exercises.map((ex: any) => (
                    <Link
                      key={ex?.id}
                      href={`/courses/cs50x/lessons/${moduleConfig?.id}/exercise/${ex?.id}`}
                      className="block bg-card border border-border/80 rounded-2xl p-5 sm:p-6 shadow-soft-sm hover:border-primary/40 hover:shadow-soft-md transition group"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-2">
                          <h4 className="font-bold text-foreground text-sm sm:text-base group-hover:text-primary transition">
                            {ex?.title}
                          </h4>
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {ex?.description}
                          </p>
                          <span
                            className={`inline-block px-2.5 py-0.5 text-[11px] font-extrabold rounded-full ${
                              ex?.difficulty === 'easy'
                                ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                                : ex?.difficulty === 'hard'
                                ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                                : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                            }`}
                          >
                            {ex?.difficulty === 'easy' ? 'Facile' : ex?.difficulty === 'hard' ? 'Difficile' : 'Moyen'}
                          </span>
                        </div>
                        <FileText className="w-5 h-5 text-muted-foreground/60 group-hover:text-primary transition shrink-0" />
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="bg-card border border-border/80 rounded-2xl p-8 text-center shadow-soft-sm">
                    <FileText className="w-10 h-10 text-muted-foreground/60 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Les exercices seront disponibles prochainement.</p>
                  </div>
                )}
              </div>
            )}

            {/* Bottom Next/Prev Lesson Navigation */}
            <div className="pt-6 border-t border-border/80 flex items-center justify-between gap-4">
              {prevWeek !== null ? (
                <Link
                  href={`/courses/cs50x/lessons/${prevWeek}`}
                  className="px-4 py-2.5 rounded-xl border border-border/80 bg-card text-xs sm:text-sm font-bold text-foreground hover:bg-muted transition flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" /> Semaine précédente
                </Link>
              ) : <div />}

              {nextWeek !== null && (
                <Link
                  href={`/courses/cs50x/lessons/${nextWeek}`}
                  className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs sm:text-sm font-bold hover:bg-primary/90 transition shadow-sm shadow-primary/25 flex items-center gap-2"
                >
                  Semaine suivante →
                </Link>
              )}
            </div>
          </div>

          {/* Sticky Assistant Socratique Column */}
          <div className="lg:col-span-1 lg:sticky lg:top-20">
            <CourseAssistant moduleConfig={moduleConfig} audioScripts={audioScripts} quizzes={quizzes} />
          </div>
        </div>
      </main>
      <Footer />

      <InteractiveQuizModal
        quiz={selectedQuiz}
        isOpen={quizModalOpen}
        onClose={() => { setQuizModalOpen(false); setSelectedQuiz(null); }}
      />
    </div>
  );
}
