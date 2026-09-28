'use client';

import Header from '@/components/header';
import Footer from '@/components/footer';
import { Users, BookOpen, FileText, Brain, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

interface Props {
  stats: { usersCount: number; coursesCount: number; submissionsCount: number; quizAttemptsCount: number };
  recentSubmissions: any[];
  role: string;
}

export default function AdminDashboardClient({ stats, recentSubmissions, role }: Props) {
  const isInstructor = role === 'INSTRUCTOR';

  const cards = [
    ...(isInstructor
      ? [
          {
            label: 'Devoirs & Soumissions',
            value: stats?.submissionsCount ?? 0,
            icon: FileText,
            href: '/admin/submissions',
            color: 'text-amber-500',
            badge: 'À corriger',
          },
          {
            label: 'Modules & Cours',
            value: stats?.coursesCount ?? 0,
            icon: BookOpen,
            href: '/admin/courses',
            color: 'text-emerald-500',
            badge: 'Programme',
          },
          {
            label: 'Étudiants inscrits',
            value: stats?.usersCount ?? 0,
            icon: Users,
            href: null,
            color: 'text-blue-500',
            badge: 'Lecture seule',
          },
          {
            label: 'Quiz complétés',
            value: stats?.quizAttemptsCount ?? 0,
            icon: Brain,
            href: null,
            color: 'text-purple-500',
            badge: 'Statistiques',
          },
        ]
      : [
          { label: 'Utilisateurs & Admissions', value: stats?.usersCount ?? 0, icon: Users, href: '/admin/users', color: 'text-blue-500' },
          { label: 'Cours & Contenus', value: stats?.coursesCount ?? 0, icon: BookOpen, href: '/admin/courses', color: 'text-emerald-500' },
          { label: 'Soumissions à corriger', value: stats?.submissionsCount ?? 0, icon: FileText, href: '/admin/submissions', color: 'text-amber-500' },
          { label: 'Quiz passés', value: stats?.quizAttemptsCount ?? 0, icon: Brain, href: '#', color: 'text-purple-500' },
        ]),
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
                {isInstructor ? (
                  <>Panel <span className="text-amber-500">Formateur & Évaluateur</span></>
                ) : (
                  <>Panel <span className="text-primary">Administration</span></>
                )}
              </h1>
              <p className="text-muted-foreground mt-1">
                {isInstructor
                  ? 'Espace pédagogique de correction des exercices et suivi des étudiants'
                  : 'Gestion globale de la plateforme CS50X Francophone'}
              </p>
            </div>

            {isInstructor ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold w-fit">
                👨‍🏫 Rôle Formateur (Privilèges limités)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-bold w-fit">
                👑 Super Admin
              </span>
            )}
          </div>

          {isInstructor && (
            <div className="mt-4 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3">
              <FileText className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold mb-0.5">Permissions du compte formateur :</p>
                <p className="text-amber-800/90 dark:text-amber-200/90 leading-relaxed">
                  Vous disposez des droits pour évaluer et corriger les soumissions d'exercices des étudiants (<Link href="/admin/submissions" className="underline font-semibold">cliquez ici pour corriger</Link>) et consulter les cours. Conformément aux règles de sécurité, la gestion, modification et suppression des comptes utilisateurs sont strictement réservées à l'Administrateur principal.
                </p>
              </div>
            </div>
          )}
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {cards.map((c: any, i: number) => {
            const content = (
              <div className="flex items-center justify-between p-5 bg-card border border-border rounded-xl hover:border-primary/30 transition group h-full">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-xl bg-muted flex items-center justify-center ${c.color} group-hover:scale-105 transition`}>
                    <c.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-extrabold text-foreground">{c.value}</p>
                    <p className="text-xs text-muted-foreground font-semibold">{c.label}</p>
                  </div>
                </div>
                {c.badge && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {c.badge}
                  </span>
                )}
              </div>
            );

            return (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                {c.href ? (
                  <Link href={c.href} className="block h-full">
                    {content}
                  </Link>
                ) : (
                  <div className="h-full opacity-90 cursor-default">
                    {content}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {!isInstructor && (
          <Link
            href="/admin/partners"
            className="mb-6 flex items-center justify-between bg-card border border-border rounded-xl p-5 hover:border-primary transition"
          >
            <div>
              <p className="font-bold text-foreground">Établissements partenaires & sessions</p>
              <p className="text-sm text-muted-foreground">Ajouter un établissement, planifier les sessions, générer les codes de convention</p>
            </div>
            <ArrowRight className="w-5 h-5 text-primary" />
          </Link>
        )}

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-foreground">Dernières soumissions</h2>
            <Link href="/admin/submissions" className="text-sm text-primary font-bold hover:underline flex items-center gap-1">
              Tout voir <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {(recentSubmissions?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune soumission pour le moment.</p>
          ) : (
            <div className="space-y-3">
              {recentSubmissions?.map?.((s: any) => (
                <div key={s?.id} className="flex items-center justify-between bg-muted rounded-xl p-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{s?.user?.name ?? s?.user?.email ?? 'Anonyme'}</p>
                    <p className="text-xs text-muted-foreground">{s?.exercise?.title ?? 'Exercice'}</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    s?.status === 'APPROVED' ? 'bg-green-500/10 text-green-400' :
                    s?.status === 'REJECTED' ? 'bg-red-500/10 text-red-400' :
                    'bg-amber-500/10 text-amber-400'
                  }`}>{s?.status === 'PENDING' ? 'En attente' : s?.status === 'APPROVED' ? 'Approuvé' : s?.status === 'REJECTED' ? 'Rejeté' : s?.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
