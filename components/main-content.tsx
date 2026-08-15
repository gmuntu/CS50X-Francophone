
'use client'

import { useState } from 'react'
import Header from './header'
import Footer from './footer'
import HomeSection from './sections/home-section'
import CoursesSection from './sections/courses-section'
import WorkshopsSection from './sections/workshops-section'
import ResourcesSection from './sections/resources-section'

export type ActiveSection = 'accueil' | 'cours' | 'ateliers' | 'ressources'

export default function MainContent() {
  const [activeSection, setActiveSection] = useState<ActiveSection>('accueil')

  return (
    <div className="min-h-screen flex flex-col">
      <Header activeSection={activeSection} setActiveSection={setActiveSection} />
      
      <main className="flex-1">
        {activeSection === 'accueil' && <HomeSection />}
        {activeSection === 'cours' && <CoursesSection />}
        {activeSection === 'ateliers' && <WorkshopsSection />}
        {activeSection === 'ressources' && <ResourcesSection />}
      </main>

      <Footer setActiveSection={setActiveSection} />
    </div>
  )
}
