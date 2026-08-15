'use client'

import { BookOpen, Mail, Globe, ShieldCheck, Lock } from 'lucide-react'
import Link from 'next/link'
import { ActiveSection } from './main-content'

interface FooterProps {
  setActiveSection?: (section: ActiveSection) => void
}

export default function Footer({ setActiveSection }: FooterProps) {
  const handleLinkClick = (section: ActiveSection) => {
    if (setActiveSection) {
      setActiveSection(section)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      // Navigation via URL pour les pages standalone
      window.location.href = `/#${section}`
    }
  }

  const paymentBadges = [
    { label: 'Visa', bg: 'bg-blue-600' },
    { label: 'MasterCard', bg: 'bg-rose-600' },
    { label: 'PayPal', bg: 'bg-[#0070BA]' },
    { label: 'M-Pesa', bg: 'bg-red-600' },
    { label: 'Orange Money', bg: 'bg-orange-500' },
    { label: 'Airtel Money', bg: 'bg-rose-700' },
    { label: 'MTN MoMo', bg: 'bg-yellow-500 text-slate-950 font-bold' },
    { label: 'Wave', bg: 'bg-sky-500' },
    { label: 'Afrimoney', bg: 'bg-purple-600' }
  ]

  return (
    <footer className="bg-slate-950 text-slate-300 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center space-x-2.5 mb-4">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-extrabold text-white">CS50X Francophone</span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed max-w-md mb-4">
              La plateforme francophone officielle pour apprendre la programmation avec le cours CS50 de Harvard University.
            </p>
            
            {/* Accepted Payments Section */}
            <div className="mt-4 pt-4 border-t border-slate-800/80">
              <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Paiements Sécurisés Acceptés (300 $ Candidat Libre)</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {paymentBadges.map((badge, idx) => (
                  <span
                    key={idx}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-xs ${badge.bg}`}
                  >
                    {badge.label}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                Paiements acceptés : Visa, MasterCard, PayPal, et Mobile Money Afrique (M-Pesa, Orange Money, Airtel Money, MTN MoMo, Wave, Afrimoney).
              </p>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-bold mb-4 tracking-wide text-sm uppercase">Liens Rapides</h3>
            <ul className="space-y-2.5 text-sm font-medium">
              <li>
                <button 
                  onClick={() => handleLinkClick('accueil')}
                  className="text-slate-300 hover:text-white transition-colors text-left"
                >
                  Accueil
                </button>
              </li>
              <li>
                <button 
                  onClick={() => handleLinkClick('cours')}
                  className="text-slate-300 hover:text-white transition-colors text-left"
                >
                  Cours
                </button>
              </li>
              <li>
                <button 
                  onClick={() => handleLinkClick('ateliers')}
                  className="text-slate-300 hover:text-white transition-colors text-left"
                >
                  Ateliers
                </button>
              </li>
              <li>
                <button 
                  onClick={() => handleLinkClick('ressources')}
                  className="text-slate-300 hover:text-white transition-colors text-left"
                >
                  Ressources
                </button>
              </li>
              <li>
                <Link
                  href="/auth/payment"
                  className="text-emerald-400 hover:text-emerald-300 transition-colors text-left flex items-center gap-1 font-semibold"
                >
                  Paiement &amp; Tarifs (300 $)
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-bold mb-4 tracking-wide text-sm uppercase">Contact</h3>
            <ul className="space-y-3 text-sm font-medium">
              <li className="flex items-center space-x-2.5 text-slate-300">
                <Mail className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <span>contact@savoiria.online</span>
              </li>
              <li className="flex items-center space-x-2.5 text-slate-300">
                <Globe className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <span>www.cs50xfrancophone.online</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 mt-10 pt-6 text-center text-xs text-slate-400 font-medium space-y-1">
          <p>&copy; {new Date()?.getFullYear?.()} CS50X Francophone. Tous droits réservés.</p>
          <p className="text-slate-500">En partenariat avec Harvard University CS50</p>
        </div>
      </div>
    </footer>
  )
}

