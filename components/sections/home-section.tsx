
'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { 
  BookOpen, 
  Users, 
  Award, 
  Clock, 
  CheckCircle, 
  Star, 
  TrendingUp, 
  CreditCard, 
  Smartphone, 
  Globe, 
  ShieldCheck, 
  Zap, 
  Lock,
  ArrowRight
} from 'lucide-react'
import Link from 'next/link'
import AnimatedCounter from '../animated-counter'
import PaymentModal from '../payment-modal'

export default function HomeSection() {
  const [heroRef, heroInView] = useInView({ triggerOnce: true, threshold: 0.1 })
  const [statsRef, statsInView] = useInView({ triggerOnce: true, threshold: 0.1 })
  const [featuresRef, featuresInView] = useInView({ triggerOnce: true, threshold: 0.1 })
  const [pricingRef, pricingInView] = useInView({ triggerOnce: true, threshold: 0.1 })

  const [paymentModalOpen, setPaymentModalOpen] = useState(false)

  const features = [
    {
      icon: BookOpen,
      title: 'Cours en Français',
      description: 'Tous les contenus du CS50 traduits et adaptés en français pour une meilleure compréhension.',
    },
    {
      icon: Users,
      title: 'Communauté Active',
      description: 'Rejoignez une communauté francophone passionnée pour partager et progresser ensemble.',
    },
    {
      icon: Award,
      title: 'Certification Harvard',
      description: 'Obtenez un certificat officiel de Harvard University à la fin du cours.',
    },
    {
      icon: Clock,
      title: 'À Votre Rythme',
      description: 'Apprenez selon votre emploi du temps avec un accès illimité au contenu.',
    },
  ]

  const paymentMethods = [
    {
      name: 'Visa',
      type: 'Carte Bancaire',
      badge: 'VISA',
      badgeBg: 'bg-blue-600 text-white',
      desc: 'Cartes de débit / crédit internationales'
    },
    {
      name: 'MasterCard',
      type: 'Carte Bancaire',
      badge: 'MasterCard',
      badgeBg: 'bg-rose-600 text-white',
      desc: 'Paiement sécurisé 3D Secure'
    },
    {
      name: 'PayPal',
      type: 'Paiement En Ligne',
      badge: 'PayPal',
      badgeBg: 'bg-[#0070BA] text-white',
      desc: 'Paiement express mondial'
    },
    {
      name: 'Vodacom M-Pesa',
      type: 'Mobile Money',
      badge: 'M-PESA',
      badgeBg: 'bg-red-600 text-white',
      desc: 'RDC, Kenya, Tanzanie, Mozambique'
    },
    {
      name: 'Orange Money',
      type: 'Mobile Money',
      badge: 'Orange Money',
      badgeBg: 'bg-orange-500 text-white',
      desc: 'RDC, Côte d\'Ivoire, Sénégal, Cameroun, Mali'
    },
    {
      name: 'Airtel Money',
      type: 'Mobile Money',
      badge: 'airtel money',
      badgeBg: 'bg-rose-700 text-white',
      desc: 'RDC, Congo, Gabon, Tchad, Niger, Kenya'
    },
    {
      name: 'MTN MoMo',
      type: 'Mobile Money',
      badge: 'MTN MoMo',
      badgeBg: 'bg-yellow-500 text-slate-950 font-bold',
      desc: 'Cameroun, Côte d\'Ivoire, Bénin, Ghana'
    },
    {
      name: 'Wave',
      type: 'Mobile Money',
      badge: 'Wave',
      badgeBg: 'bg-sky-500 text-white',
      desc: 'Sénégal, Côte d\'Ivoire, Mali, Burkina Faso'
    },
    {
      name: 'Afrimoney',
      type: 'Mobile Money',
      badge: 'Afrimoney',
      badgeBg: 'bg-purple-600 text-white',
      desc: 'Africell RDC, Gambie, Sierra Leone'
    }
  ]

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <motion.section
        ref={heroRef}
        initial={{ opacity: 0, y: 20 }}
        animate={heroInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6 }}
        className="relative bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 text-white py-20 px-4 overflow-hidden"
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-300 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-4xl md:text-6xl font-extrabold mb-6 tracking-tight leading-tight"
          >
            Apprenez la Programmation avec{' '}
            <span className="text-amber-300">CS50 de Harvard</span>
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="text-xl md:text-2xl mb-10 text-blue-50 font-medium max-w-3xl mx-auto"
          >
            Rejoignez la première plateforme francophone du célèbre cours CS50X
          </motion.p>

          {/* Registration CTA */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <a
              href="/auth/signup"
              className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold py-4 px-8 rounded-lg transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              S&apos;inscrire Maintenant
            </a>
            <button
              onClick={() => setPaymentModalOpen(true)}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 px-8 rounded-lg transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center gap-2"
            >
              <Smartphone className="w-5 h-5" />
              <span>Candidat Libre (300 $)</span>
            </button>
            <a
              href="/auth/login"
              className="bg-white/15 backdrop-blur-md hover:bg-white/25 text-white font-bold py-4 px-8 rounded-lg transition-all border border-white/40 shadow-sm"
            >
              Se Connecter
            </a>
          </motion.div>
        </div>
      </motion.section>

      {/* Stats Section */}
      <motion.section
        ref={statsRef}
        initial={{ opacity: 0 }}
        animate={statsInView ? { opacity: 1 } : {}}
        transition={{ duration: 0.6 }}
        className="py-16 bg-slate-50 border-b border-slate-200/80"
      >
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { icon: Users, value: 5000, label: 'Étudiants Inscrits', suffix: '+' },
              { icon: BookOpen, value: 11, label: 'Semaines de Cours', suffix: '' },
              { icon: Award, value: 98, label: 'Taux de Satisfaction', suffix: '%' },
              { icon: TrendingUp, value: 85, label: 'Taux de Complétion', suffix: '%' },
            ]?.map?.((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={statsInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                className="text-center bg-white rounded-xl p-6 shadow-sm border border-slate-200/80 hover:shadow-md transition-all"
              >
                <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-50 text-blue-600 rounded-xl mb-4">
                  <stat.icon className="w-7 h-7 text-blue-600" />
                </div>
                <div className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-1 tracking-tight">
                  {statsInView && <AnimatedCounter end={stat?.value} suffix={stat?.suffix} />}
                </div>
                <p className="text-slate-700 font-semibold text-sm">{stat?.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Features Section */}
      <motion.section
        ref={featuresRef}
        initial={{ opacity: 0 }}
        animate={featuresInView ? { opacity: 1 } : {}}
        transition={{ duration: 0.6 }}
        className="py-20 bg-white"
      >
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">
              Pourquoi Choisir <span className="text-blue-600">CS50X Francophone</span> ?
            </h2>
            <p className="text-lg md:text-xl text-slate-700 max-w-2xl mx-auto">
              Une expérience d&apos;apprentissage unique adaptée aux francophones
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features?.map?.((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                animate={featuresInView ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                className="bg-slate-50/60 rounded-xl p-8 shadow-sm hover:shadow-md transition-all border border-slate-200 group"
              >
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
                      <feature.icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">{feature?.title}</h3>
                    <p className="text-slate-700 leading-relaxed text-sm md:text-base">{feature?.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Pricing & Payment Integration Section */}
      <motion.section
        ref={pricingRef}
        initial={{ opacity: 0 }}
        animate={pricingInView ? { opacity: 1 } : {}}
        transition={{ duration: 0.6 }}
        className="py-20 bg-slate-900 text-white"
        id="tarifs"
      >
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-blue-500/20 text-blue-300 font-semibold text-xs border border-blue-400/30 mb-4">
              <Zap className="w-3.5 h-3.5" />
              <span>Système de Paiement Intégré Sécurisé</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">
              Tarifs et Modes de Paiement
            </h2>
            <p className="text-slate-300 text-base md:text-lg max-w-2xl mx-auto">
              Accédez aux 11 semaines de cours avec un mode de règlement adapté à votre pays.
            </p>
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
            {/* Card 1: Universitaire */}
            <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-8 flex flex-col justify-between relative overflow-hidden">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="px-3 py-1 bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-full text-xs font-bold uppercase tracking-wider">
                      Partenariat Universitaire
                    </span>
                    <h3 className="text-2xl font-bold text-white mt-3">Étudiant Universitaire</h3>
                  </div>
                </div>
                <div className="my-6">
                  <span className="text-4xl font-black text-white">Inclus</span>
                  <span className="text-slate-400 text-sm ml-2">via convention universitaire</span>
                </div>
                <ul className="space-y-3 text-sm text-slate-300 mb-8">
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    <span>Accès avec le code fourni par votre établissement (ex: UOM)</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    <span>Accès aux 11 semaines et ateliers pratiques</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    <span>Certification conjointe Harvard & Université</span>
                  </li>
                </ul>
              </div>
              <Link
                href="/auth/signup"
                className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3.5 px-6 rounded-xl transition-all text-center block"
              >
                S&apos;inscrire avec Code Université
              </Link>
            </div>

            {/* Card 2: Candidat Libre */}
            <div className="bg-gradient-to-b from-blue-900/60 to-slate-800/90 border-2 border-blue-500 rounded-2xl p-8 flex flex-col justify-between relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-400 to-amber-500 text-slate-950 font-black text-xs px-4 py-1 rounded-bl-xl uppercase tracking-wider">
                Accès Immédiat
              </div>
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="px-3 py-1 bg-amber-400/20 text-amber-300 border border-amber-400/30 rounded-full text-xs font-bold uppercase tracking-wider">
                      Candidat Libre
                    </span>
                    <h3 className="text-2xl font-bold text-white mt-3">Formation Complète CS50X</h3>
                  </div>
                </div>
                <div className="my-6">
                  <span className="text-5xl font-black text-white">300 $</span>
                  <span className="text-slate-300 text-sm ml-2 font-medium">USD • Paiement unique à vie</span>
                </div>
                <ul className="space-y-3 text-sm text-slate-200 mb-8">
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>Accès illimité et permanent aux 11 modules de cours</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>Tous les exercices, devoirs et laboratoires guidés</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>Projet final et préparation à la certification CS50</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>Support communauté & encadrement francophone</span>
                  </li>
                </ul>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => setPaymentModalOpen(true)}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-extrabold py-4 px-6 rounded-xl transition-all shadow-lg hover:shadow-blue-500/25 flex items-center justify-center space-x-2"
                >
                  <Lock className="w-4 h-4" />
                  <span>Payer 300 $ et Débloquer l&apos;Accès</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <div className="text-center">
                  <Link
                    href="/auth/signup"
                    className="text-xs text-slate-400 hover:text-white underline transition-colors"
                  >
                    Créer un compte d&apos;abord
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Accepted Payment Methods Showcase */}
          <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-8">
            <div className="text-center mb-8">
              <h3 className="text-xl md:text-2xl font-bold text-white mb-2">
                Paiements Acceptés &amp; Disponibles
              </h3>
              <p className="text-sm text-slate-400 max-w-xl mx-auto">
                Réglez en toute sécurité via Carte Bancaire, PayPal ou les services Mobile Money majeurs en Afrique.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {paymentMethods.map((method, index) => (
                <div
                  key={index}
                  className="bg-slate-900/80 border border-slate-700 rounded-xl p-4 flex items-start space-x-3 hover:border-slate-600 transition-colors"
                >
                  <span className={`px-2.5 py-1 rounded text-xs font-bold shrink-0 ${method.badgeBg}`}>
                    {method.badge}
                  </span>
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-white truncate">{method.name}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">{method.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-slate-700/80 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Transactions chiffrées SSL 256 bits et conformité 3D Secure</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-blue-400" />
                <span>Validation instantanée de votre accès dès réception</span>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Partnership Section */}
      <section className="py-16 bg-slate-950 text-white border-t border-slate-800">
        <div className="max-w-4xl mx-auto text-center px-4">
          <Star className="w-14 h-14 text-amber-400 mx-auto mb-6" />
          <h2 className="text-3xl md:text-4xl font-extrabold mb-4 tracking-tight">
            En Partenariat avec Harvard University et SavoirIA
          </h2>
          <p className="text-lg md:text-xl text-slate-200 mb-4 leading-relaxed">
            CS50X est le cours d&apos;introduction à l&apos;informatique le plus populaire au monde,
            maintenant disponible en français avec le même niveau d&apos;excellence.
          </p>
          <p className="text-base text-slate-300 mb-8 leading-relaxed">
            Le premier projet pilote en partenariat avec l&apos;<span className="text-sky-300 font-semibold">Université Officielle de Mbuji-Mayi (UOM)</span> sanctionné par un certificat conjoint entre l&apos;université Harvard et UOM.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <div className="flex items-center space-x-2 bg-white/10 rounded-lg px-6 py-3 border border-white/15">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              <span className="font-semibold text-slate-100">Contenu Officiel</span>
            </div>
            <div className="flex items-center space-x-2 bg-white/10 rounded-lg px-6 py-3 border border-white/15">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              <span className="font-semibold text-slate-100">Certification Reconnue</span>
            </div>
            <div className="flex items-center space-x-2 bg-white/10 rounded-lg px-6 py-3 border border-white/15">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              <span className="font-semibold text-slate-100">Accès Permanent</span>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Payment Modal */}
      <PaymentModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
      />
    </div>
  )
}

