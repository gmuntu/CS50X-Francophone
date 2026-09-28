'use client';

import { useState } from 'react';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { ArrowLeft, FileText, CheckCircle, XCircle, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

interface Props {
  submissions: any[];
  reviewerId: string;
}

export default function SubmissionsClient({ submissions: initial, reviewerId }: Props) {
  const [submissions, setSubmissions] = useState(initial ?? []);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [score, setScore] = useState('');

  const handleReview = async (id: string, status: string) => {
    try {
      const res = await fetch('/api/admin/submissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId: id, status, feedback: feedback || null, score: score ? Number(score) : null }),
      });
      if (res?.ok) {
        setSubmissions((prev) => prev?.map?.((s: any) => s?.id === id ? { ...s, status, feedback, score: score ? Number(score) : null } : s) ?? []);
        setReviewing(null);
        setFeedback('');
        setScore('');
        toast?.success?.('Soumission mise à jour');
      }
    } catch { toast?.error?.('Erreur'); }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> Retour au panel
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-extrabold text-foreground mb-6 flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" /> Revue des soumissions
          </h1>

          <div className="space-y-4">
            {submissions?.map?.((s: any) => (
              <div key={s?.id} className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-foreground text-sm">{s?.user?.name ?? s?.user?.email ?? 'Anonyme'}</p>
                    <p className="text-xs text-muted-foreground">{s?.exercise?.title ?? 'Exercice'} — {new Date(s?.createdAt)?.toLocaleDateString?.('fr-FR')}</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    s?.status === 'APPROVED' ? 'bg-green-500/10 text-green-400' :
                    s?.status === 'REJECTED' ? 'bg-red-500/10 text-red-400' :
                    'bg-amber-500/10 text-amber-400'
                  }`}>{s?.status === 'PENDING' ? 'En attente' : s?.status === 'APPROVED' ? 'Approuvé' : s?.status === 'REJECTED' ? 'Rejeté' : s?.status}</span>
                </div>

                <pre className="text-xs text-muted-foreground bg-muted rounded-lg p-3 overflow-x-auto max-h-40 mb-3">{s?.content?.slice?.(0, 1000)}</pre>

                {s?.feedback && (
                  <div className="mb-3 p-2 bg-primary/5 rounded-lg text-xs text-foreground">
                    <span className="font-bold">Feedback :</span> {s?.feedback}
                  </div>
                )}

                {s?.status === 'PENDING' && (
                  reviewing === s?.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={feedback}
                        onChange={(e: any) => setFeedback(e?.target?.value ?? '')}
                        placeholder="Commentaire / Feedback"
                        rows={3}
                        className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <input
                        type="number"
                        value={score}
                        onChange={(e: any) => setScore(e?.target?.value ?? '')}
                        placeholder="Note (0-100)"
                        min={0} max={100}
                        className="w-32 bg-muted border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => handleReview(s?.id, 'APPROVED')} className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-bold flex items-center gap-1 hover:bg-green-500">
                          <CheckCircle className="w-3.5 h-3.5" /> Approuver
                        </button>
                        <button onClick={() => handleReview(s?.id, 'REJECTED')} className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold flex items-center gap-1 hover:bg-red-500">
                          <XCircle className="w-3.5 h-3.5" /> Rejeter
                        </button>
                        <button onClick={() => { setReviewing(null); setFeedback(''); setScore(''); }} className="px-3 py-1.5 rounded-lg bg-muted text-xs font-bold text-foreground">
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setReviewing(s?.id)} className="text-xs text-primary font-bold hover:underline flex items-center gap-1">
                      <MessageSquare className="w-3.5 h-3.5" /> Évaluer
                    </button>
                  )
                )}
              </div>
            ))}
          </div>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
}
