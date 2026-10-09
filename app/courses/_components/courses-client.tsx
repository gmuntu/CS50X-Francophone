'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Filter, BookOpen, Clock, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { CS50_MODULES } from '@/config/course-modules';
import CourseDownloadButton from '@/components/pwa/course-download-button';

export default function CoursesClient({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 });
  const [filter, setFilter] = useState('tous');

  const filtered = filter === 'tous'
    ? CS50_MODULES
    : CS50_MODULES?.filter?.((c: any) => c?.difficulty?.toLowerCase?.() === filter?.toLowerCase?.()) ?? [];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-12">
        <motion.div ref={ref} initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold text-foreground mb-4 tracking-tight">
            Parcours <span className="text-primary">CS50X</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Un voyage complet de 11 semaines pour maîtriser les fondamentaux de l'informatique
          </p>
          {isLoggedIn && <div className="mt-5"><CourseDownloadButton course="cs50x" label="Les 11 semaines hors ligne" /></div>}
        </motion.div>

        {/* Filters */}
        <div className="flex flex-wrap justify-center gap-3 mb-10">
          {['tous', 'débutant', 'intermédiaire', 'avancé']?.map?.((level: string) => (
            <button
              key={level}
              onClick={() => setFilter(level)}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold capitalize transition ${
                filter === level ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground border border-border hover:border-primary/30'
              }`}
            >
              {level === 'tous' && <Filter className="w-4 h-4 inline mr-1" />}
              {level}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered?.map?.((m: any, i: number) => (
            <motion.div
              key={m?.id}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.05, duration: 0.4 }}
            >
              <Link
                href={isLoggedIn ? `/courses/cs50x/lessons/${m?.id}` : '/auth/login'}
                className="block bg-card border border-border rounded-xl overflow-hidden hover:border-primary/30 hover:shadow-lg transition group"
              >
                <div className="aspect-video bg-muted relative overflow-hidden">
                  <img src={m?.imageUrl} alt={m?.title ?? ''} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                  <div className="absolute top-3 right-3">
                    <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-primary text-white">{m?.difficulty}</span>
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-foreground mb-2 group-hover:text-primary transition">{m?.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{m?.description}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {m?.topics?.map?.((t: string) => (
                      <span key={t} className="px-2 py-0.5 text-[10px] font-semibold bg-muted text-muted-foreground rounded-full">{t}</span>
                    ))}
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
