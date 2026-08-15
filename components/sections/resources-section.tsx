
'use client'

import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { useState } from 'react'
import { 
  BookOpen, Code, Video, FileText, 
  Link as LinkIcon, MessageCircle, HelpCircle,
  ExternalLink, Download, Star, Users, Mail
} from 'lucide-react'

export default function ResourcesSection() {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 })
  const [activeTab, setActiveTab] = useState('pedagogiques')

  const tabs = [
    { id: 'pedagogiques', label: 'Pédagogiques', icon: BookOpen },
    { id: 'tools', label: 'Outils Dev', icon: Code },
    { id: 'links', label: 'Liens CS50', icon: LinkIcon },
    { id: 'downloads', label: 'Téléchargements', icon: Download },
    { id: 'community', label: 'Communauté', icon: Users },
    { id: 'support', label: 'Support', icon: HelpCircle },
  ]

  const resources = {
    pedagogiques: [
      {
        title: 'Manuel CS50 en Français',
        description: 'Documentation pédagogique complète traduite et adaptée',
        icon: BookOpen,
        link: 'https://cs50xenfrancais.github.io/2024/',
        badge: 'Officiel',
      },
      {
        title: 'Notes de Cours Complètes',
        description: 'Toutes les notes de cours en français, organisées par semaine',
        icon: FileText,
        link: '#',
        badge: 'Populaire',
      },
      {
        title: 'Lectures Complètes CS50',
        description: 'Toutes les conférences de David Malan avec sous-titres français',
        icon: Video,
        link: '#',
        badge: 'HD',
      },
      {
        title: 'Tutoriels Pas à Pas',
        description: 'Vidéos tutorielles détaillées pour chaque problème',
        icon: Video,
        link: '#',
        badge: 'Nouveau',
      },
      {
        title: 'Shorts CS50',
        description: 'Courtes vidéos explicatives sur des concepts clés',
        icon: Video,
        link: '#',
        badge: null,
      },
      {
        title: 'Guide du Débutant',
        description: 'Documentation complète pour bien démarrer avec CS50X',
        icon: BookOpen,
        link: '#',
        badge: 'Essentiel',
      },
    ],
    tools: [
      {
        title: 'CS50 IDE',
        description: 'Environnement de développement intégré basé sur le cloud',
        icon: Code,
        link: 'https://ide.cs50.io/',
        badge: 'Gratuit',
      },
      {
        title: 'Check50',
        description: 'Outil de vérification automatique de votre code',
        icon: FileText,
        link: '#',
        badge: null,
      },
      {
        title: 'Style50',
        description: 'Vérificateur de style de code',
        icon: BookOpen,
        link: '#',
        badge: null,
      },
      {
        title: 'Debug50',
        description: 'Débogueur intégré pour faciliter le développement',
        icon: Code,
        link: '#',
        badge: null,
      },
      {
        title: 'Submit50',
        description: 'Soumettre vos exercices et projets',
        icon: ExternalLink,
        link: '#',
        badge: null,
      },
      {
        title: 'Visual Studio Code',
        description: 'Éditeur de code recommandé avec extensions CS50',
        icon: Code,
        link: 'https://code.visualstudio.com/',
        badge: 'Recommandé',
      },
    ],
    links: [
      {
        title: 'CS50 Harvard Officiel',
        description: 'Site officiel du cours CS50 de Harvard',
        icon: ExternalLink,
        link: 'https://cs50.harvard.edu/',
        badge: 'Officiel',
      },
      {
        title: 'edX CS50X',
        description: 'Plateforme edX pour suivre CS50X',
        icon: ExternalLink,
        link: 'https://www.edx.org/cs50',
        badge: null,
      },
      {
        title: 'CS50 YouTube',
        description: 'Chaîne YouTube officielle CS50',
        icon: Video,
        link: 'https://www.youtube.com/@cs50',
        badge: null,
      },
      {
        title: 'Manuel CS50',
        description: 'Documentation technique complète',
        icon: BookOpen,
        link: 'https://cs50xenfrancais.github.io/2024/',
        badge: null,
      },
    ],
    downloads: [
      {
        title: 'Slides des Cours',
        description: 'Téléchargez toutes les présentations PDF des cours',
        icon: Download,
        link: '#',
        badge: 'PDF',
      },
      {
        title: 'Codes Sources',
        description: 'Tous les exemples de code des lectures',
        icon: Code,
        link: '#',
        badge: 'ZIP',
      },
      {
        title: 'Cheat Sheets',
        description: 'Aide-mémoires pour C, Python, SQL et plus',
        icon: FileText,
        link: '#',
        badge: 'PDF',
      },
      {
        title: 'Bibliothèque CS50',
        description: 'Code source de la bibliothèque CS50',
        icon: BookOpen,
        link: '#',
        badge: 'GitHub',
      },
      {
        title: 'Projets Exemplaires',
        description: 'Exemples de projets finaux excellents',
        icon: Star,
        link: '#',
        badge: null,
      },
      {
        title: 'Énoncés des Problèmes',
        description: 'Tous les énoncés de problèmes en PDF',
        icon: FileText,
        link: '#',
        badge: 'PDF',
      },
    ],
    community: [
      {
        title: 'Forum Discord',
        description: 'Rejoignez notre serveur Discord francophone actif',
        icon: MessageCircle,
        link: 'https://discord.gg/cs50',
        badge: '2.5k membres',
      },
      {
        title: 'Groupe Facebook',
        description: 'Communauté Facebook CS50 Francophone',
        icon: Users,
        link: 'https://www.facebook.com/groups/cs50',
        badge: '1.8k membres',
      },
      {
        title: 'Reddit r/cs50',
        description: 'Subreddit international CS50',
        icon: MessageCircle,
        link: 'https://www.reddit.com/r/cs50/',
        badge: 'Global',
      },
      {
        title: 'Stack Overflow',
        description: 'Questions et réponses sur CS50',
        icon: MessageCircle,
        link: '#',
        badge: null,
      },
      {
        title: 'GitHub Discussions',
        description: 'Discussions techniques et collaborations',
        icon: Code,
        link: '#',
        badge: null,
      },
      {
        title: 'Rencontres Locales',
        description: 'Trouvez des groupes d\'étude près de chez vous',
        icon: Users,
        link: '#',
        badge: null,
      },
    ],
    support: [
      {
        title: 'Support par Email',
        description: 'Contactez notre équipe de support',
        icon: Mail,
        link: '#',
        badge: '24h',
      },
      {
        title: 'FAQ CS50X',
        description: 'Réponses aux questions les plus fréquentes',
        icon: HelpCircle,
        link: '#',
        badge: 'Populaire',
      },
      {
        title: 'Guide de Dépannage',
        description: 'Solutions aux problèmes techniques courants',
        icon: FileText,
        link: '#',
        badge: null,
      },
      {
        title: 'Centre d\'Aide',
        description: 'Documentation d\'aide complète',
        icon: BookOpen,
        link: '#',
        badge: null,
      },
      {
        title: 'Tuteurs en Ligne',
        description: 'Obtenez de l\'aide de tuteurs qualifiés',
        icon: Users,
        link: '#',
        badge: 'Premium',
      },
      {
        title: 'Sessions de Support Live',
        description: 'Sessions de questions-réponses en direct',
        icon: Video,
        link: '#',
        badge: 'Hebdo',
      },
    ],
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">
            Centre de <span className="text-blue-600">Ressources</span> CS50X
          </h1>
          <p className="text-lg md:text-xl text-slate-700 max-w-3xl mx-auto">
            Accédez à tous les outils, documents et supports nécessaires pour réussir votre parcours CS50X
          </p>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="mb-12"
        >
          <div className="bg-white rounded-xl p-2 shadow-sm border border-slate-200 overflow-x-auto">
            <div className="flex space-x-2 min-w-max">
              {tabs?.map?.((tab) => (
                <button
                  key={tab?.id}
                  onClick={() => setActiveTab(tab?.id)}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-bold text-sm transition-all whitespace-nowrap ${
                    activeTab === tab?.id
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-700 hover:text-blue-600 hover:bg-slate-100'
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  <span>{tab?.label}</span>
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Resources Grid */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {resources?.[activeTab as keyof typeof resources]?.map?.((resource, index) => (
            <motion.a
              key={index}
              href={resource?.link}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.3 }}
              className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-all group cursor-pointer border border-slate-200/80 hover:border-blue-300 flex flex-col justify-between"
            >
              <div>
                {/* Icon */}
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                    <resource.icon className="w-6 h-6 text-blue-600 group-hover:text-white transition-colors" />
                  </div>
                  {resource?.badge && (
                    <span className="px-2.5 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 text-xs font-bold rounded-full">
                      {resource?.badge}
                    </span>
                  )}
                </div>

                {/* Content */}
                <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
                  {resource?.title}
                </h3>
                <p className="text-sm text-slate-700 mb-4 leading-relaxed">
                  {resource?.description}
                </p>
              </div>

              {/* Link */}
              <div className="flex items-center text-blue-700 font-bold text-sm group-hover:text-blue-800 pt-2 border-t border-slate-100">
                <span>Accéder</span>
                <ExternalLink className="w-4 h-4 ml-1.5 group-hover:translate-x-1 group-hover:-translate-y-0.5 transition-transform" />
              </div>
            </motion.a>
          ))}
        </motion.div>

        {/* Additional Help Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="mt-16 bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 rounded-2xl p-8 md:p-12 text-white text-center shadow-lg"
        >
          <HelpCircle className="w-14 h-14 mx-auto mb-6 text-blue-200" />
          <h2 className="text-3xl font-extrabold mb-4 tracking-tight">Besoin d&apos;Aide ?</h2>
          <p className="text-lg md:text-xl mb-8 text-blue-50 max-w-2xl mx-auto font-medium">
            Notre équipe et notre communauté sont là pour vous aider à chaque étape de votre parcours
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button className="px-8 py-3 bg-white text-blue-700 font-bold rounded-lg hover:bg-blue-50 transition-all shadow-md">
              Poser une Question
            </button>
            <button className="px-8 py-3 bg-blue-900/60 border border-white/30 text-white font-bold rounded-lg hover:bg-blue-900/80 transition-all">
              Rejoindre Discord
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
