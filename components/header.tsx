
'use client'

import { useState } from 'react'
import { Menu, X, BookOpen } from 'lucide-react'
import Link from 'next/link'
import { ActiveSection } from './main-content'

interface HeaderProps {
  activeSection: ActiveSection
  setActiveSection: (section: ActiveSection) => void
}

export default function Header({ activeSection, setActiveSection }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navItems: { label: string; section: ActiveSection; isExternal?: boolean; externalUrl?: string }[] = [
    { label: 'Accueil', section: 'accueil' },
    { label: 'Cours', section: 'cours' },
    { label: 'CS50X Ateliers', section: 'ateliers' },
    { label: 'Ressources', section: 'ressources' },
  ]

  const handleNavClick = (section: ActiveSection, isExternal?: boolean, externalUrl?: string) => {
    if (isExternal && externalUrl) {
      window.open(externalUrl, '_blank')
      setMobileMenuOpen(false)
    } else {
      setActiveSection(section)
      setMobileMenuOpen(false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-2.5 cursor-pointer" onClick={() => handleNavClick('accueil', false, undefined)}>
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-extrabold text-slate-900 tracking-tight">
                CS50X <span className="text-blue-600">Francophone</span>
              </span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-2">
              <nav className="flex space-x-1">
                {navItems?.map?.((item) => (
                  <button
                    key={item?.section}
                    onClick={() => handleNavClick(item?.section, item?.isExternal, item?.externalUrl)}
                    className={`px-3.5 py-2 rounded-lg font-semibold text-sm transition-all ${
                      activeSection === item?.section && !item?.isExternal
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-700 hover:text-blue-600 hover:bg-slate-100'
                    }`}
                  >
                    {item?.label}
                  </button>
                ))}
              </nav>

              <div className="pl-2 flex items-center space-x-2 border-l border-slate-200 ml-2">
                <Link
                  href="/auth/signup"
                  className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-colors"
                >
                  Inscription
                </Link>
              </div>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <nav className="md:hidden py-4 space-y-2 border-t border-slate-100">
              {navItems?.map?.((item) => (
                <button
                  key={item?.section}
                  onClick={() => handleNavClick(item?.section, item?.isExternal, item?.externalUrl)}
                  className={`w-full text-left px-4 py-2.5 rounded-lg font-semibold text-sm transition-all ${
                    activeSection === item?.section && !item?.isExternal
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-700 hover:text-blue-600 hover:bg-slate-100'
                  }`}
                >
                  {item?.label}
                </button>
              ))}

              <div className="pt-2 border-t border-slate-100 space-y-2">
                <Link
                  href="/auth/signup"
                  className="block text-center px-4 py-2.5 rounded-lg bg-blue-600 text-white font-bold text-xs"
                >
                  Inscription
                </Link>
              </div>
            </nav>
          )}
        </div>
      </header>
    </>
  )
}

