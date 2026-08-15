
'use client'

import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { Calendar, Users, Video, Clock, MapPin, BookOpen } from 'lucide-react'
import Image from 'next/image'

export default function WorkshopsSection() {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 })

  const workshopTypes = [
    {
      icon: Video,
      title: 'Ateliers en Direct',
      description: 'Sessions interactives en direct avec des instructeurs expérimentés pour poser vos questions en temps réel.',
      color: 'from-purple-500 to-pink-500',
    },
    {
      icon: Users,
      title: 'Groupes d\'Étude',
      description: 'Rejoignez des groupes d\'étude collaboratifs pour progresser ensemble et partager vos connaissances.',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      icon: BookOpen,
      title: 'Tutoriels Pratiques',
      description: 'Ateliers pratiques axés sur des projets concrets pour appliquer vos compétences immédiatement.',
      color: 'from-green-500 to-teal-500',
    },
  ]

  const upcomingWorkshops = [
    {
      id: 1,
      title: 'Introduction à Scratch - Atelier Débutant',
      date: 'À venir',
      time: 'À venir',
      instructor: 'Inconnu',
      participants: 45,
      maxParticipants: 50,
      image: 'https://cdn.abacus.ai/images/9dba425e-86f4-49e3-b5db-a0471f432c43.png',
      level: 'Débutant',
    },
    {
      id: 2,
      title: 'Programmation en C - Les Fondamentaux',
      date: 'À venir',
      time: 'À venir',
      instructor: 'Inconnu',
      participants: 38,
      maxParticipants: 40,
      image: 'https://cdn.abacus.ai/images/f51f3f4d-2123-4dcb-acd3-f3f0fe313a87.png',
      level: 'Intermédiaire',
    },
    {
      id: 3,
      title: 'Développement Web avec HTML/CSS',
      date: 'À venir',
      time: 'À venir',
      instructor: 'Inconnu',
      participants: 52,
      maxParticipants: 60,
      image: 'https://images.yourstory.com/cs/1/36d30200940f11ea8e6e91d22f034165/web-development-cropped-1596634030043.jpg?mode=crop&crop=faces&ar=16%3A9&format=auto&w=1920&q=75',
      level: 'Débutant',
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">
            <span className="text-blue-600">CS50X</span> Ateliers
          </h1>
          <p className="text-lg md:text-xl text-slate-700 max-w-3xl mx-auto">
            Participez à des ateliers pratiques et des sessions en direct pour approfondir vos connaissances
          </p>
        </motion.div>

        {/* Workshop Types */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {workshopTypes?.map?.((type, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className="bg-white rounded-xl p-8 shadow-sm hover:shadow-md transition-all border border-slate-200 group"
            >
              <div className={`w-14 h-14 bg-gradient-to-br ${type?.color} rounded-xl flex items-center justify-center mb-6 group-hover:scale-105 transition-transform shadow-sm`}>
                <type.icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">{type?.title}</h3>
              <p className="text-slate-700 leading-relaxed text-sm md:text-base">{type?.description}</p>
            </motion.div>
          ))}
        </div>

        {/* Upcoming Workshops */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          <h2 className="text-3xl font-extrabold text-slate-900 mb-8 tracking-tight">Ateliers à Venir</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {upcomingWorkshops?.map?.((workshop, index) => (
              <motion.div
                key={workshop?.id}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.5 + index * 0.1, duration: 0.5 }}
                className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-slate-200 group cursor-pointer flex flex-col justify-between"
              >
                <div>
                  {/* Image */}
                  <div className="relative w-full aspect-video bg-slate-100">
                    <Image
                      src={workshop?.image ?? ''}
                      alt={workshop?.title ?? 'Workshop'}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                    <div className="absolute top-3 right-3 shadow-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                        workshop?.level === 'Débutant' 
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                          : 'bg-amber-100 text-amber-900 border-amber-300'
                      }`}>
                        {workshop?.level}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-slate-900 mb-4 group-hover:text-blue-600 transition-colors">
                      {workshop?.title}
                    </h3>

                    <div className="space-y-2.5 mb-4">
                      <div className="flex items-center space-x-2 text-slate-700 font-medium text-sm">
                        <Calendar className="w-4 h-4 text-blue-600" />
                        <span>{workshop?.date}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-slate-700 font-medium text-sm">
                        <Clock className="w-4 h-4 text-blue-600" />
                        <span>{workshop?.time}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-slate-700 font-medium text-sm">
                        <Users className="w-4 h-4 text-blue-600" />
                        <span>{workshop?.participants}/{workshop?.maxParticipants} participants</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-2">
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${((workshop?.participants ?? 0) / (workshop?.maxParticipants ?? 1)) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 pb-6 pt-2">
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <span className="text-xs font-semibold text-slate-600">Par {workshop?.instructor}</span>
                    <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm transition-all shadow-sm">
                      S&apos;inscrire
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
