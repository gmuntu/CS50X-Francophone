
'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Play } from 'lucide-react'
import Header from '@/components/header'
import Footer from '@/components/footer'
import { ActiveSection } from '@/components/main-content'

function IntroductionContent() {
  const searchParams = useSearchParams()
  const autoplay = searchParams.get('autoplay') === '1'
  const [activeSection, setActiveSection] = useState<ActiveSection>('cours')

  const handleBackToCourses = () => {
    setActiveSection('cours')
    window.location.href = '/#cours'
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header activeSection={activeSection} setActiveSection={setActiveSection} />
      
      <main className="flex-1 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Back Button */}
          <Button variant="outline" className="mb-6" onClick={handleBackToCourses}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour aux cours
          </Button>

          {/* Course Header */}
          <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl p-8 text-white mb-8">
            <div className="flex items-center space-x-3 mb-4">
              <Play className="w-8 h-8" />
              <span className="text-sm font-semibold bg-white/20 px-3 py-1 rounded-full">
                Introduction
              </span>
            </div>
            <h1 className="text-4xl font-bold mb-4">
              Introduction à CS50X
            </h1>
            <p className="text-lg text-blue-100">
              Découvrez CS50X, les objectifs du cours et comment tirer le meilleur parti de cette expérience d&apos;apprentissage.
            </p>
          </div>

          {/* Video Section */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-8">
            <div className="bg-gray-900 p-4">
              <h2 className="text-white font-semibold text-lg flex items-center">
                <Play className="w-5 h-5 mr-2 text-red-500" />
                Vidéo d&apos;introduction
              </h2>
            </div>
            <div className="relative w-full bg-black" style={{ paddingBottom: '56.25%' }}>
              <iframe
                className="absolute top-0 left-0 w-full h-full"
                src={`https://www.youtube.com/embed/Mmv-dF9yudE?modestbranding=1&rel=0&showinfo=0${autoplay ? '&autoplay=1' : ''}`}
                title="Introduction CS50X"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              ></iframe>
            </div>
          </div>

          {/* Course Content */}
          <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              À propos de cette introduction
            </h2>
            
            <div className="space-y-6 text-gray-700">
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Présentation du cours CS50X et de son histoire</li>
                <li>Les langages et technologies que vous allez découvrir</li>
                <li>Comment tirer le meilleur parti de cette formation</li>
                <li>Les ressources disponibles pour vous accompagner</li>
              </ul>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  ⏱️ Durée
                </h3>
                <p>Cette introduction dure environ 1 minute 45 et n&apos;est pas comptée comme une semaine de cours.</p>
              </div>

              <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded">
                <p className="text-sm">
                  <strong>Note importante :</strong> L&apos;introduction est essentielle pour bien démarrer votre parcours CS50X. 
                  Prenez le temps de regarder la vidéo complète et de vous familiariser avec les ressources disponibles.
                </p>
              </div>
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-gradient-to-r from-green-500 to-teal-500 rounded-xl p-8 text-white">
            <h2 className="text-2xl font-bold mb-4">Prêt à commencer ?</h2>
            <p className="mb-6">
              Une fois que vous avez terminé cette introduction, retournez au menu des cours pour découvrir la Semaine 0 et commencer votre apprentissage avec Scratch !
            </p>
            <Button 
              size="lg" 
              className="bg-white text-green-600 hover:bg-gray-100"
              onClick={handleBackToCourses}
            >
              Voir tous les cours
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default function IntroductionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    }>
      <IntroductionContent />
    </Suspense>
  )
}
