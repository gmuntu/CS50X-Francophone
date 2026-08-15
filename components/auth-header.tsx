
'use client'

import { useState, useEffect } from 'react'
import { Menu, X, BookOpen, Shield, LogOut, User, Home } from 'lucide-react'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { Button } from './ui/button'

export default function AuthHeader() {
  const { data: session } = useSession()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (session?.user?.email) {
        try {
          const res = await fetch('/api/auth/check-admin')
          const data = await res.json()
          setIsAdmin(data.isAdmin)
        } catch (error) {
          console.error('Error checking admin status:', error)
        }
      }
    }
    
    checkAdminStatus()
  }, [session])

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' })
  }

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2.5">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-extrabold text-slate-900 tracking-tight">
              CS50X <span className="text-blue-600">Francophone</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-2">
            <Link href="/">
              <Button variant="ghost" className="text-slate-700 font-semibold">
                <Home className="w-4 h-4 mr-1.5" />
                Accueil
              </Button>
            </Link>

            <Link href="/courses">
              <Button variant="ghost" className="text-slate-700 font-semibold">
                Cours
              </Button>
            </Link>
            
            {isAdmin && (
              <Link href="/admin">
                <Button variant="ghost" className="text-purple-700 font-semibold bg-purple-50 hover:bg-purple-100">
                  <Shield className="w-4 h-4 mr-1.5 text-purple-600" />
                  Administration
                </Button>
              </Link>
            )}

            <div className="flex items-center space-x-2 ml-4 pl-4 border-l border-slate-200">
              <div className="flex items-center space-x-2 text-sm text-slate-700 font-medium">
                <User className="w-4 h-4 text-blue-600" />
                <span className="max-w-[150px] truncate">{session?.user?.name || session?.user?.email}</span>
              </div>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleSignOut}
                className="font-semibold"
              >
                <LogOut className="w-4 h-4 mr-1.5" />
                Déconnexion
              </Button>
            </div>
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-700"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="md:hidden py-4 space-y-2 border-t border-slate-100">
            <Link href="/" className="block">
              <Button variant="ghost" className="w-full justify-start font-semibold">
                <Home className="w-4 h-4 mr-2" />
                Accueil
              </Button>
            </Link>

            <Link href="/courses" className="block">
              <Button variant="ghost" className="w-full justify-start font-semibold">
                Cours
              </Button>
            </Link>
            
            {isAdmin && (
              <Link href="/admin" className="block">
                <Button variant="ghost" className="w-full justify-start text-purple-700 font-semibold bg-purple-50">
                  <Shield className="w-4 h-4 mr-2 text-purple-600" />
                  Administration
                </Button>
              </Link>
            )}

            <div className="pt-4 border-t border-slate-200">
              <div className="flex items-center space-x-2 text-sm text-slate-700 font-medium px-4 mb-3">
                <User className="w-4 h-4 text-blue-600" />
                <span className="truncate">{session?.user?.name || session?.user?.email}</span>
              </div>
              
              <Button 
                variant="outline" 
                className="w-full font-semibold"
                onClick={handleSignOut}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Déconnexion
              </Button>
            </div>
          </nav>
        )}
      </div>
    </header>
  )
}

