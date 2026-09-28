'use client';

import { useState } from 'react';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { ArrowLeft, Send, Loader2, CheckCircle, Clock, XCircle } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

interface Props {
  exercise: any;
  lessonId: number;
  userId: string;
}

export default function ExerciseClient({ exercise, lessonId, userId }: Props) {
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submissions = exercise?.submissions ?? [];

  const handleSubmit = async () => {
    if (!content?.trim?.()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exerciseId: exercise?.id, content }),
      });
      if (res?.ok) {
        toast?.success?.('Soumission envoyée !');
        setContent('');
        window?.location?.reload?.();
      } else {
        const err = await res?.json?.();
        toast?.error?.(err?.error ?? 'Erreur');
      }
    } catch { toast?.error?.('Erreur réseau'); }
    finally { setSubmitting(false); }
  };

  const statusIcon = (s: string) => {
    if (s === 'APPROVED') return <CheckCircle className="w-4 h-4 text-green-400" />;
    if (s === 'REJECTED') return <XCircle className="w-4 h-4 text-red-400" />;
    return <Clock className="w-4 h-4 text-amber-400" />;
  };

  const statusLabel: Record<string, string> = { PENDING: 'En attente', REVIEWED: 'En revue', APPROVED: 'Approuvé', REJECTED: 'Rejeté' };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <Link href={`/courses/cs50x/lessons/${lessonId}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> Retour à la leçon
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-extrabold text-foreground mb-2">{exercise?.title}</h1>
          <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-full mb-4 ${
            exercise?.difficulty === 'easy' ? 'bg-green-500/10 text-green-400' :
            exercise?.difficulty === 'hard' ? 'bg-red-500/10 text-red-400' :
            'bg-amber-500/10 text-amber-400'
          }`}>{exercise?.difficulty}</span>

          <div className="bg-card border border-border rounded-xl p-6 mb-6">
            <h2 className="font-bold text-foreground mb-2">Instructions</h2>
            <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{exercise?.instructions}</div>
          </div>

          {/* Submit form */}
          <div className="bg-card border border-border rounded-xl p-6 mb-6">
            <h2 className="font-bold text-foreground mb-3">Votre solution</h2>
            <textarea
              value={content}
              onChange={(e: any) => setContent(e?.target?.value ?? '')}
              rows={10}
              placeholder="Collez votre code ou écrivez votre réponse ici..."
              className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground font-mono resize-y focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
            />
            <button
              onClick={handleSubmit}
              disabled={submitting || !content?.trim?.()}
              className="mt-3 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition flex items-center gap-2 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Soumettre
            </button>
          </div>

          {/* Previous submissions */}
          {submissions?.length > 0 && (
            <div>
              <h2 className="font-bold text-foreground mb-3">Soumissions précédentes</h2>
              <div className="space-y-3">
                {submissions?.map?.((s: any) => (
                  <div key={s?.id} className="bg-card border border-border rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="flex items-center gap-1.5 text-xs font-bold">
                        {statusIcon(s?.status)}
                        <span className="text-foreground">{statusLabel?.[s?.status] ?? s?.status}</span>
                      </span>
                      <span className="text-[10px] text-muted-foreground">{new Date(s?.createdAt)?.toLocaleDateString?.('fr-FR')}</span>
                    </div>
                    <pre className="text-xs text-muted-foreground bg-muted rounded-lg p-3 overflow-x-auto max-h-32">{s?.content?.slice?.(0, 500)}</pre>
                    {s?.feedback && (
                      <div className="mt-2 p-2 bg-primary/5 rounded-lg text-xs text-foreground">
                        <span className="font-bold">Feedback :</span> {s?.feedback}
                      </div>
                    )}
                    {s?.score !== null && s?.score !== undefined && (
                      <span className="inline-block mt-1 text-xs font-bold text-primary">Note : {s?.score}/100</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </main>
      <Footer />
    </div>
  );
}
