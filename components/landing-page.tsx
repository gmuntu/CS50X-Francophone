'use client';

import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { BookOpen, Users, Award, TrendingUp, CheckCircle, Star, ArrowRight, Code2, Brain, Shield, GraduationCap } from 'lucide-react';
import Link from 'next/link';
import Header from '@/components/header';
import Footer from '@/components/footer';
import AnimatedCounter from '@/components/animated-counter';
import { CS50_MODULES } from '@/config/course-modules';

export default function LandingPage() {
  const [heroRef, heroInView] = useInView({ triggerOnce: true, threshold: 0.1 });
  const [statsRef, statsInView] = useInView({ triggerOnce: true, threshold: 0.1 });
  const [featuresRef, featuresInView] = useInView({ triggerOnce: true, threshold: 0.1 });
  const [coursesRef, coursesInView] = useInView({ triggerOnce: true, threshold: 0.1 });
  const [ctaRef, ctaInView] = useInView({ triggerOnce: true, threshold: 0.1 });

  const features = [
    { icon: BookOpen, title: 'Cours en Français', desc: 'Tous les contenus du CS50 traduits et adaptés en français pour une compréhension optimale.' },
    { icon: Brain, title: 'Tuteur Socrate IA', desc: 'Un guide pédagogique IA utilisant la méthode socratique pour développer votre raisonnement.' },
    { icon: Award, title: 'Certificat CS50x', desc: 'Nous vous accompagnons jusqu\'au certificat gratuit délivré par CS50 (sans crédit universitaire Harvard).' },
    { icon: Shield, title: 'Quiz Interactifs', desc: 'Des QCMs de haut niveau cognitif pour valider chaque concept à chaque étape.' },
  ];

  const displayModules = CS50_MODULES?.slice?.(0, 6) ?? [];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <motion.section
        ref={heroRef}
        initial={{ opacity: 0, y: 20 }}
        animate={heroInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6 }}
        className="relative py-24 sm:py-32 px-4 overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-primary/5 to-transparent pointer-events-none" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-bold mb-8 border border-primary/20 shadow-sm"
          >
            <GraduationCap className="w-4 h-4" />
            Accompagnement indépendant vers le certificat CS50x
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 25 }}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.25, duration: 0.6 }}
            className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-6 tracking-tight leading-tight text-foreground"
          >
            Apprenez la Programmation avec{' '}
            <span className="bg-gradient-to-r from-primary via-blue-600 to-indigo-600 bg-clip-text text-transparent">
              CS50 de Harvard
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 25 }}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.35, duration: 0.6 }}
            className="text-lg sm:text-xl md:text-2xl mb-10 text-muted-foreground font-medium max-w-3xl mx-auto leading-relaxed"
          >
            Rejoignez la première plateforme francophone du célèbre cours CS50X
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.45, duration: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Link
              href="/auth/signup"
              className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 px-8 rounded-2xl transition-all duration-200 shadow-lg shadow-primary/25 hover:shadow-primary/35 transform hover:-translate-y-0.5 flex items-center justify-center gap-2.5"
            >
              <BookOpen className="w-5 h-5" />
              S'inscrire Maintenant
            </Link>
            <Link
              href="/auth/login"
              className="w-full sm:w-auto bg-card hover:bg-muted text-foreground font-bold py-4 px-8 rounded-2xl transition-all duration-200 border border-border/80 shadow-sm flex items-center justify-center"
            >
              Connexion Membres
            </Link>
          </motion.div>
        </div>
      </motion.section>

      {/* Stats */}
      <motion.section
        ref={statsRef}
        initial={{ opacity: 0 }}
        animate={statsInView ? { opacity: 1 } : {}}
        transition={{ duration: 0.6 }}
        className="py-16 border-y border-border/80 bg-card/40 backdrop-blur-sm"
      >
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {[
              { icon: Users, value: 5000, label: 'Étudiants Inscrits', suffix: '+' },
              { icon: BookOpen, value: 11, label: 'Semaines de Cours', suffix: '' },
              { icon: Award, value: 98, label: 'Taux de Satisfaction', suffix: '%' },
              { icon: TrendingUp, value: 85, label: 'Taux de Complétion', suffix: '%' },
            ]?.map?.((stat: any, i: number) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={statsInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                className="text-center bg-card rounded-2xl p-6 border border-border/80 card-elevation-hover transition-all duration-200"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 text-primary rounded-xl mb-3 shadow-inner">
                  <stat.icon className="w-6 h-6" />
                </div>
                <div className="text-3xl sm:text-4xl font-black text-foreground mb-1 tracking-tight">
                  {statsInView && <AnimatedCounter end={stat?.value} suffix={stat?.suffix} />}
                </div>
                <p className="text-muted-foreground font-semibold text-xs sm:text-sm">{stat?.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Features */}
      <motion.section
        ref={featuresRef}
        initial={{ opacity: 0 }}
        animate={featuresInView ? { opacity: 1 } : {}}
        transition={{ duration: 0.6 }}
        className="py-24"
      >
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16 space-y-3">
            <h2 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">
              Pourquoi Choisir <span className="text-primary">CS50X Francophone</span> ?
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
              Une expérience d'apprentissage unique adaptée aux francophones
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features?.map?.((f: any, i: number) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
                animate={featuresInView ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="bg-card rounded-2xl p-7 sm:p-8 border border-border/80 hover:border-primary/40 card-elevation-hover transition-all duration-300 group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 shadow-inner">
                    <f.icon className="w-6 h-6" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-lg sm:text-xl font-bold text-foreground">{f?.title}</h3>
                    <p className="text-muted-foreground leading-relaxed text-sm">{f?.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Course Preview */}
      <motion.section
        ref={coursesRef}
        initial={{ opacity: 0 }}
        animate={coursesInView ? { opacity: 1 } : {}}
        transition={{ duration: 0.6 }}
        className="py-24 bg-card/60 border-y border-border/80"
        id="courses"
      >
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-14 space-y-3">
            <h2 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">
              11 Semaines pour Maîtriser l'Informatique
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
              De Scratch à la Cybersécurité, un parcours complet et progressif
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayModules?.map?.((m: any, i: number) => (
              <motion.div
                key={m?.id}
                initial={{ opacity: 0, y: 20 }}
                animate={coursesInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                className="bg-background rounded-2xl border border-border/80 overflow-hidden card-elevation-hover transition-all duration-300 group flex flex-col"
              >
                <div className="aspect-video bg-muted relative overflow-hidden">
                  <img
                    src={m?.imageUrl}
                    alt={m?.title ?? ''}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute top-3 right-3">
                    <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-primary text-primary-foreground shadow-sm">
                      {m?.difficulty}
                    </span>
                  </div>
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="font-bold text-foreground mb-1.5 text-sm sm:text-base leading-snug group-hover:text-primary transition-colors">{m?.title}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{m?.description}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {m?.topics?.map?.((t: string) => (
                      <span key={t} className="px-2.5 py-1 text-[10px] font-semibold bg-muted/80 text-muted-foreground rounded-lg border border-border/40">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              href="/courses"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 hover:-translate-y-0.5"
            >
              Voir les 11 Semaines
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </motion.section>

      {/* Partnership / CTA */}
      <motion.section
        ref={ctaRef}
        initial={{ opacity: 0, y: 30 }}
        animate={ctaInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6 }}
        className="py-24"
      >
        <div className="max-w-4xl mx-auto text-center px-4">
          <div className="w-16 h-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-6 shadow-inner">
            <Star className="w-8 h-8" />
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-4 tracking-tight">
            Prêt à Décrocher votre Certificat CS50 ?
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
            CS50X est le cours d'introduction à l'informatique le plus populaire au monde, proposé gratuitement par l'Université Harvard. Savoiria vous accompagne en français pour le réussir.
          </p>
          <div className="flex flex-wrap justify-center gap-3.5 mb-10">
            {['Accompagnement en français', 'Tuteur Socrate', 'Accès Permanent']?.map?.((label: string) => (
              <div key={label} className="flex items-center gap-2.5 bg-card rounded-xl px-5 py-3 border border-border/80 shadow-sm">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="font-semibold text-foreground text-xs sm:text-sm">{label}</span>
              </div>
            ))}
          </div>
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-base sm:text-lg hover:bg-primary/90 transition-all shadow-xl shadow-primary/25 hover:-translate-y-0.5"
          >
            Commencer Maintenant
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </motion.section>

      <Footer />
    </div>
  );
}
