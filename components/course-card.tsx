
'use client'

import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { Clock, BookOpen, ArrowRight } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

interface CourseCardProps {
  course: {
    id: string
    title: string
    description: string
    duration: string
    topics: string[]
    difficulty: string
    image: string
    color: string
  }
  index: number
}

export default function CourseCard({ course, index }: CourseCardProps) {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 })
  const router = useRouter()

  const handleDiscoverClick = () => {
    if (course.id === 'intro') {
      router.push('/courses/introduction?autoplay=1')
    }
  }

  const difficultyColors: Record<string, string> = {
    Débutant: 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold',
    Intermédiaire: 'bg-amber-100 text-amber-900 border border-amber-300 font-bold',
    Avancé: 'bg-rose-100 text-rose-800 border border-rose-300 font-bold',
  }

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-slate-200 group cursor-pointer flex flex-col justify-between"
      onClick={course.id === 'intro' ? handleDiscoverClick : undefined}
    >
      <div>
        {/* Image */}
        <div className="relative w-full aspect-video bg-slate-100 overflow-hidden">
          <Image
            src={course?.image ?? ''}
            alt={course?.title ?? 'Course'}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          <div className={`absolute inset-0 bg-gradient-to-br ${course?.color} opacity-20 group-hover:opacity-30 transition-opacity`}></div>
          
          {/* Difficulty Badge */}
          <div className="absolute top-3 right-3 shadow-sm">
            <span className={`px-3 py-1 rounded-full text-xs ${difficultyColors?.[course?.difficulty] ?? 'bg-slate-100 text-slate-800 font-bold'}`}>
              {course?.difficulty}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
            {course?.title}
          </h3>
          <p className="text-slate-700 text-sm mb-4 line-clamp-2 leading-relaxed">
            {course?.description}
          </p>

          {/* Topics */}
          <div className="flex flex-wrap gap-2 mb-2">
            {course?.topics?.slice?.(0, 3)?.map?.((topic, idx) => (
              <span
                key={idx}
                className="px-2.5 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 text-xs font-semibold rounded-full"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 pb-6 pt-2">
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <div className="flex items-center space-x-1.5 text-slate-600 font-medium text-xs">
            <Clock className="w-4 h-4 text-slate-500" />
            <span>{course?.duration}</span>
          </div>
          <button 
            onClick={(e) => {
              if (course.id === 'intro') {
                e.stopPropagation()
              }
              handleDiscoverClick()
            }}
            className="flex items-center space-x-1.5 text-blue-700 font-bold text-sm group-hover:text-blue-800 transition-colors"
          >
            <span>Découvrir</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </motion.div>
  )
}
