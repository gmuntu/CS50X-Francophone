'use client';

import Header from '@/components/header';
import Footer from '@/components/footer';
import { ArrowLeft, BookOpen, Eye, EyeOff, ChevronDown, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useState } from 'react';

interface Props {
  courses: any[];
}

export default function CoursesAdminClient({ courses }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> Retour au panel
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-extrabold text-foreground mb-6 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary" /> Gestion des cours
          </h1>

          <div className="space-y-3">
            {courses?.map?.((c: any) => (
              <div key={c?.id} className="bg-card border border-border rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpanded(expanded === c?.id ? null : c?.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition"
                >
                  <div className="flex items-center gap-3">
                    {c?.isPublished ? <Eye className="w-4 h-4 text-green-400" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                    <div className="text-left">
                      <p className="font-semibold text-foreground text-sm">{c?.title}</p>
                      <p className="text-xs text-muted-foreground">{c?._count?.lessons ?? 0} leçons</p>
                    </div>
                  </div>
                  {expanded === c?.id ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                </button>
                {expanded === c?.id && (
                  <div className="border-t border-border p-4 space-y-2">
                    {c?.lessons?.map?.((l: any) => (
                      <div key={l?.id} className="flex items-center justify-between bg-muted rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          {l?.isPublished ? <Eye className="w-3.5 h-3.5 text-green-400" /> : <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />}
                          <span className="text-sm text-foreground">{l?.title}</span>
                        </div>
                        <Link href={`/courses/cs50x/lessons/${l?.id}`} className="text-xs text-primary font-bold hover:underline">
                          Voir
                        </Link>
                      </div>
                    ))}
                  </div>
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
