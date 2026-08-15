
'use client'

import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { useState } from 'react'
import { Filter, Clock, BookOpen } from 'lucide-react'
import CourseCard from '../course-card'

export default function CoursesSection() {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 })
  const [filter, setFilter] = useState('tous')

  const courses = [
    {
      id: 'intro',
      title: 'Introduction',
      description: 'Découvrez CS50X, les objectifs du cours et comment tirer le meilleur parti de cette expérience d\'apprentissage.',
      duration: '1 semaine',
      topics: ['Présentation', 'Environnement', 'Méthodologie'],
      difficulty: 'Débutant',
      image: 'https://cdn.abacus.ai/images/ecb218cd-b792-4940-b1e8-1386aea533e4.png',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      id: 'week0',
      title: 'Semaine 0 - Scratch',
      description: 'Apprenez les bases de la programmation avec Scratch, un langage de programmation visuel développé par le MIT.',
      duration: '1 semaine',
      topics: ['Algorithmes', 'Scratch', 'Logique'],
      difficulty: 'Débutant',
      image: 'https://media.licdn.com/dms/image/v2/D4E12AQGI9ENbtt06Kg/article-cover_image-shrink_720_1280/B4EZeAyV9oG4AM-/0/1750212370841?e=2147483647&v=beta&t=tvK08vPbkbO2JcwvtbxZjB6HRzEAqFFawwoXYuwvTrc',
      color: 'from-orange-500 to-red-500',
    },
    {
      id: 'week1',
      title: 'Semaine 1 - C',
      description: 'Introduction au langage C, ses types de données, structures de contrôle et fonctions fondamentales.',
      duration: '2 semaines',
      topics: ['Langage C', 'Variables', 'Fonctions'],
      difficulty: 'Débutant',
      image: 'https://i.ytimg.com/vi/aQZYjZ8q5vw/maxresdefault.jpg',
      color: 'from-blue-600 to-indigo-600',
    },
    {
      id: 'week2',
      title: 'Semaine 2 - Tableaux',
      description: 'Explorez les tableaux, la compilation, le débogage et découvrez comment fonctionne la cryptographie de base.',
      duration: '2 semaines',
      topics: ['Tableaux', 'Chaînes', 'Arguments'],
      difficulty: 'Intermédiaire',
      image: 'https://cdn.abacus.ai/images/14317020-7f96-4f7a-b470-576ee2135818.png',
      color: 'from-purple-500 to-pink-500',
    },
    {
      id: 'week3',
      title: 'Semaine 3 - Algorithmes',
      description: 'Étudiez différents algorithmes de recherche et de tri, analysez leur complexité et efficacité.',
      duration: '2 semaines',
      topics: ['Recherche', 'Tri', 'Complexité'],
      difficulty: 'Intermédiaire',
      image: 'https://miro.medium.com/v2/resize:fit:1400/1*rCGgnOcgcrsi1qKrwfu0Tw.png',
      color: 'from-green-500 to-teal-500',
    },
    {
      id: 'week4',
      title: 'Semaine 4 - Mémoire',
      description: 'Comprenez la gestion de la mémoire, les pointeurs, l\'allocation dynamique et les structures de données.',
      duration: '2 semaines',
      topics: ['Pointeurs', 'Mémoire', 'Structures'],
      difficulty: 'Avancé',
      image: 'https://cdn.abacus.ai/images/154c2c64-abc2-47bc-87b4-f15d98a49c37.png',
      color: 'from-red-500 to-orange-500',
    },
    {
      id: 'week5',
      title: 'Semaine 5 - Structures de Données',
      description: 'Découvrez les listes chaînées, arbres, tables de hachage et autres structures de données avancées.',
      duration: '2 semaines',
      topics: ['Listes', 'Arbres', 'Hash Tables'],
      difficulty: 'Avancé',
      image: 'https://i.ytimg.com/vi/JLLTaOeEYmM/maxresdefault.jpg',
      color: 'from-indigo-500 to-purple-500',
    },
    {
      id: 'week6',
      title: 'Semaine 6 - Python',
      description: 'Transition vers Python, un langage de programmation moderne et puissant utilisé dans l\'industrie.',
      duration: '2 semaines',
      topics: ['Python', 'Syntaxe', 'Bibliothèques'],
      difficulty: 'Intermédiaire',
      image: 'https://images.yourstory.com/cs/1/5b5cbb80f8af11e98cc779971cf3d465/Screenshot-2019-01-26-at-15-1576840631266.png?mode=crop&crop=faces&ar=16%3A9&format=auto&w=1920&q=75',
      color: 'from-yellow-500 to-amber-500',
    },
    {
      id: 'week7',
      title: 'Semaine 7 - SQL',
      description: 'Apprenez à gérer et interroger des bases de données avec SQL, un langage essentiel pour les applications.',
      duration: '2 semaines',
      topics: ['SQL', 'Bases de données', 'Requêtes'],
      difficulty: 'Intermédiaire',
      image: 'https://cdn.abacus.ai/images/0895671b-7eb1-48d0-8180-2f99e215c68e.png',
      color: 'from-cyan-500 to-blue-500',
    },
    {
      id: 'week8',
      title: 'Semaine 8 - HTML, CSS, JavaScript',
      description: 'Créez des pages web interactives en apprenant les technologies fondamentales du développement web.',
      duration: '2 semaines',
      topics: ['HTML', 'CSS', 'JavaScript'],
      difficulty: 'Intermédiaire',
      image: 'https://images.yourstory.com/cs/1/6b460cd040d711e994bbefffe3577d8b/full-stack-web-development-1586433444650.png?mode=crop&crop=faces&ar=16%3A9&format=auto&w=1920&q=75',
      color: 'from-pink-500 to-rose-500',
    },
    {
      id: 'week9',
      title: 'Semaine 9 - Flask',
      description: 'Développez des applications web complètes avec Flask, un framework Python léger et puissant.',
      duration: '2 semaines',
      topics: ['Flask', 'Routes', 'Templates'],
      difficulty: 'Avancé',
      image: 'https://cdn.abacus.ai/images/31bd4fcd-e7e5-4d84-86a3-17dbbc296b41.png',
      color: 'from-teal-500 to-green-500',
    },
    {
      id: 'week10',
      title: 'Semaine 10 - Cybersécurité',
      description: 'Découvrez les principes de la sécurité informatique, le chiffrement et les bonnes pratiques de sécurité.',
      duration: '1 semaine',
      topics: ['Sécurité', 'Chiffrement', 'Éthique'],
      difficulty: 'Avancé',
      image: 'https://assets.entrepreneur.com/content/3x2/2000/20160802130444-Cyber-security.jpeg?format=pjeg&auto=webp&crop=16:9',
      color: 'from-red-600 to-pink-600',
    },
  ]

  const filteredCourses = filter === 'tous' 
    ? courses 
    : courses?.filter?.(c => c?.difficulty?.toLowerCase?.() === filter)

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
            Parcours <span className="text-blue-600">CS50X</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-700 max-w-3xl mx-auto">
            Un voyage complet de 11 semaines de cours pour maîtriser les fondamentaux de l&apos;informatique
          </p>
          <p className="text-sm text-slate-500 font-medium mt-2">
            * L&apos;introduction n&apos;est pas comptée comme une semaine de cours
          </p>
        </motion.div>

        {/* Filter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="flex flex-wrap justify-center gap-3 mb-12"
        >
          <button
            onClick={() => setFilter('tous')}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-bold text-sm transition-all ${
              filter === 'tous'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-sm'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span>Tous les cours</span>
          </button>
          {['débutant', 'intermédiaire', 'avancé']?.map?.((level) => (
            <button
              key={level}
              onClick={() => setFilter(level)}
              className={`px-6 py-3 rounded-lg font-bold text-sm transition-all capitalize ${
                filter === level
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-sm'
              }`}
            >
              {level}
            </button>
          ))}
        </motion.div>

        {/* Course Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="bg-white rounded-xl p-6 mb-12 shadow-sm border border-slate-200/80"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div className="flex items-center justify-center space-x-3">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-blue-600" />
              </div>
              <div className="text-left">
                <div className="text-2xl font-extrabold text-slate-900">{courses?.length ?? 0}</div>
                <div className="text-sm font-semibold text-slate-600">Modules de cours</div>
              </div>
            </div>
            <div className="flex items-center justify-center space-x-3">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
              <div className="text-left">
                <div className="text-2xl font-extrabold text-slate-900">~100</div>
                <div className="text-sm font-semibold text-slate-600">Heures de contenu</div>
              </div>
            </div>
            <div className="flex items-center justify-center space-x-3">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                <Filter className="w-6 h-6 text-blue-600" />
              </div>
              <div className="text-left">
                <div className="text-2xl font-extrabold text-slate-900">{filteredCourses?.length ?? 0}</div>
                <div className="text-sm font-semibold text-slate-600">Cours affichés</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Courses Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredCourses?.map?.((course, index) => (
            <CourseCard key={course?.id} course={course} index={index} />
          ))}
        </div>
      </div>
    </div>
  )
}
