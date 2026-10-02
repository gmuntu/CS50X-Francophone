'use client';

import { useState, useCallback, useRef } from 'react';
import { submitQuizAttempt } from '@/lib/sync-queue';
import { X, CheckCircle, XCircle, ArrowRight, RotateCcw, Trophy, CloudOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface QuizQuestion {
  id: string;
  question: string;
  options: any;
  correctOption: string;
  explanation: string;
  conceptTested: string;
}

interface Quiz {
  id: string;
  title: string;
  description?: string | null;
  questions: QuizQuestion[];
}

interface Props {
  quiz: Quiz | null;
  isOpen: boolean;
  onClose: () => void;
}

function getNormalizedOptions(rawOptions: any): Array<{ id: string; text: string }> {
  let opts = rawOptions;
  if (typeof opts === 'string') {
    try {
      opts = JSON.parse(opts);
    } catch {
      opts = [opts];
    }
  }
  if (!Array.isArray(opts)) return [];
  return opts.map((opt: any, idx: number) => {
    const defaultId = String.fromCharCode(65 + idx);
    if (typeof opt === 'object' && opt !== null) {
      return {
        id: opt.id ? String(opt.id).trim().toUpperCase() : defaultId,
        text: opt.text ? String(opt.text) : (opt.label ? String(opt.label) : JSON.stringify(opt)),
      };
    }
    return {
      id: defaultId,
      text: String(opt ?? ''),
    };
  });
}

export default function InteractiveQuizModal({ quiz, isOpen, onClose }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showResult, setShowResult] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const answersRef = useRef<Record<string, string>>({});
  answersRef.current = answers ?? {};
  const [savedOffline, setSavedOffline] = useState(false);


  const questions = quiz?.questions ?? [];
  const current = questions?.[currentIndex];
  const optionsList = getNormalizedOptions(current?.options);
  const correctOptKey = String(current?.correctOption ?? '').trim().toUpperCase();
  const isCorrect = selectedAnswer ? selectedAnswer === correctOptKey : false;
  const totalQuestions = questions?.length ?? 0;

  const handleSelect = useCallback((optionId: string) => {
    if (isRevealed) return;
    setSelectedAnswer(optionId);
    setIsRevealed(true);
    answersRef.current = { ...answersRef.current, [current?.id ?? '']: optionId };
    setAnswers((prev) => ({ ...(prev ?? {}), [current?.id ?? '']: optionId }));
  }, [isRevealed, current?.id]);

  const handleNext = useCallback(() => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedAnswer(null);
      setIsRevealed(false);
    } else {
      setShowResult(true);
      submitAttempt();
    }
  }, [currentIndex, totalQuestions]);

  const submitAttempt = async () => {
    if (!quiz?.id) return;
    setSubmitting(true);
    try {
      // On lit la référence pour être sûr d'inclure la réponse à la dernière question.
      const sent = await submitQuizAttempt(quiz.id, { ...answersRef.current });
      setSavedOffline(!sent);
    } catch (e) {
      console.error('Quiz submit error:', e);
    } finally {
      setSubmitting(false);
    }
  };

  const reset = useCallback(() => {
    setCurrentIndex(0);
    setAnswers({});
    setShowResult(false);
    setSelectedAnswer(null);
    setIsRevealed(false);
    setSavedOffline(false);
    answersRef.current = {};
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose?.();
  }, [reset, onClose]);

  const score = questions?.filter?.((q: QuizQuestion) => {
    const userAns = (answers?.[q?.id] ?? '').trim().toUpperCase();
    const correctAns = String(q?.correctOption ?? '').trim().toUpperCase();
    return userAns === correctAns;
  })?.length ?? 0;
  const passed = totalQuestions > 0 ? (score / totalQuestions) >= 0.7 : false;

  const conceptText = typeof current?.conceptTested === 'string'
    ? current.conceptTested
    : (current?.conceptTested ? JSON.stringify(current.conceptTested) : '');
  const explanationText = typeof current?.explanation === 'string'
    ? current.explanation
    : (current?.explanation ? JSON.stringify(current.explanation) : '');

  if (!isOpen || !quiz) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          transition={{ duration: 0.2 }}
          className="bg-card border border-border/80 rounded-3xl shadow-2xl max-w-xl w-full max-h-[92vh] overflow-hidden flex flex-col"
          onClick={(e: any) => e?.stopPropagation?.()}
        >
          {/* Header */}
          <div className="p-5 border-b border-border/70 flex items-center justify-between bg-muted/20">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  Quiz Interactif
                </span>
                {!showResult && (
                  <span className="text-xs font-semibold text-muted-foreground">
                    Question {currentIndex + 1} sur {totalQuestions}
                  </span>
                )}
              </div>
              <h2 className="text-base sm:text-lg font-extrabold text-foreground tracking-tight line-clamp-1">{quiz?.title}</h2>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress bar */}
          {!showResult && totalQuestions > 0 && (
            <div className="w-full bg-muted/40 h-1.5 overflow-hidden">
              <div
                className="bg-primary h-full transition-all duration-300 ease-out"
                style={{ width: `${((currentIndex + (isRevealed ? 1 : 0)) / totalQuestions) * 100}%` }}
              />
            </div>
          )}

          {/* Content */}
          <div className="p-5 sm:p-6 overflow-y-auto flex-1">
            {showResult ? (
              <div className="text-center py-4 space-y-4">
                <div className={`w-20 h-20 mx-auto rounded-3xl flex items-center justify-center shadow-lg transition-transform ${
                  passed
                    ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                    : 'bg-muted text-muted-foreground border border-border'
                }`}>
                  <Trophy className="w-10 h-10" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-2xl font-extrabold text-foreground tracking-tight">
                    {passed ? 'Félicitations !' : 'Continuez vos efforts !'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Score final : <span className="font-bold text-foreground text-base">{score} / {totalQuestions}</span> ({Math.round((score / (totalQuestions || 1)) * 100)}%)
                  </p>
                </div>

                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold border">
                  {passed ? (
                    <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                      Quiz réussi ✓
                    </span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                      Score inférieur à 70% · Réessayez
                    </span>
                  )}
                </div>

                {savedOffline && (
                  <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground bg-muted/60 border border-border rounded-xl px-3 py-2">
                    <CloudOff className="w-3.5 h-3.5 shrink-0" />
                    Pas de connexion : votre résultat est gardé sur l'appareil et sera envoyé automatiquement au retour du réseau.
                  </p>
                )}

                <div className="flex gap-3 pt-4 justify-center">
                  <button
                    onClick={reset}
                    className="px-5 py-2.5 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-bold flex items-center gap-2 transition-all shadow-sm border border-border/80"
                  >
                    <RotateCcw className="w-4 h-4" /> Recommencer
                  </button>
                  <button
                    onClick={handleClose}
                    className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-all shadow-md shadow-primary/20"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            ) : current ? (
              <div className="space-y-4">
                <div className="bg-card p-4 rounded-2xl border border-border/80 shadow-sm">
                  <p className="text-foreground font-bold text-sm sm:text-base leading-relaxed">{current?.question}</p>
                </div>

                <div className="space-y-2.5">
                  {optionsList.map((optItem, idx) => {
                    const optKey = optItem.id;
                    const isSelected = selectedAnswer === optKey;
                    const isCorrectOpt = optKey === correctOptKey;

                    let btnCls = 'border-border/80 hover:border-primary/50 hover:bg-muted/40 cursor-pointer';
                    let badgeCls = 'bg-muted text-muted-foreground border-border group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary';

                    if (isRevealed) {
                      if (isCorrectOpt) {
                        btnCls = 'border-emerald-500 bg-emerald-500/10 text-foreground shadow-sm';
                        badgeCls = 'bg-emerald-500 text-white border-emerald-500';
                      } else if (isSelected && !isCorrectOpt) {
                        btnCls = 'border-rose-500 bg-rose-500/10 text-foreground shadow-sm';
                        badgeCls = 'bg-rose-500 text-white border-rose-500';
                      } else {
                        btnCls = 'border-border/50 opacity-40';
                        badgeCls = 'bg-muted text-muted-foreground border-border';
                      }
                    }

                    return (
                      <button
                        key={idx}
                        onClick={() => handleSelect(optKey)}
                        disabled={isRevealed}
                        className={`w-full text-left border rounded-2xl p-3.5 text-sm transition-all duration-200 group ${btnCls}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-7 h-7 rounded-full border flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${badgeCls}`}>
                            {optKey}
                          </span>
                          <span className="text-foreground flex-1 font-medium leading-snug">{optItem.text}</span>
                          {isRevealed && isCorrectOpt && (
                            <CheckCircle className="w-5 h-5 text-emerald-500 ml-auto shrink-0" />
                          )}
                          {isRevealed && isSelected && !isCorrectOpt && (
                            <XCircle className="w-5 h-5 text-rose-500 ml-auto shrink-0" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {isRevealed && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-muted/60 border border-border/80 rounded-2xl space-y-1.5"
                  >
                    {conceptText && (
                      <span className="text-[11px] font-bold text-primary tracking-wide uppercase block">
                        Concept testé : {conceptText}
                      </span>
                    )}
                    {explanationText && (
                      <p className="text-xs text-foreground/90 leading-relaxed font-medium">
                        {explanationText}
                      </p>
                    )}
                  </motion.div>
                )}

                {isRevealed && (
                  <button
                    onClick={handleNext}
                    className="mt-4 w-full py-3 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold transition-all shadow-md shadow-primary/20 flex items-center justify-center gap-2"
                  >
                    {currentIndex < totalQuestions - 1 ? (
                      <>
                        Question suivante <ArrowRight className="w-4 h-4" />
                      </>
                    ) : (
                      'Voir les résultats'
                    )}
                  </button>
                )}
              </div>
            ) : null}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
