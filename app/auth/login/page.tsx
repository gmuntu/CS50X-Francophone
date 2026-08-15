
'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false
      })

      if (result?.error) {
        setError(result.error)
      } else {
        router.push('/courses')
      }
    } catch (err: any) {
      setError('Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 px-4 py-12">
      {/* Retour à l'accueil link */}
      <div className="w-full max-w-md mb-6 flex justify-between items-center">
        <Link
          href="/"
          className="inline-flex items-center text-sm font-semibold text-slate-300 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2 text-blue-400" />
          Retour à l&apos;accueil
        </Link>
        <Link
          href="/"
          className="text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
        >
          CS50X Francophone
        </Link>
      </div>

      <Card className="w-full max-w-md bg-white shadow-xl border-slate-200">
        <CardHeader className="text-center pb-4">
          <Link href="/" className="inline-flex items-center justify-center space-x-2.5 mx-auto mb-2">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-extrabold text-slate-900">
              CS50X <span className="text-blue-600">Français</span>
            </span>
          </Link>
          <CardTitle className="text-2xl font-extrabold text-slate-900 tracking-tight">Connexion</CardTitle>
          <CardDescription className="text-slate-600 font-medium">
            Connectez-vous pour accéder aux cours
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg font-medium">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-800 font-semibold">Email</Label>
              <Input
                id="email"
                type="email"
                required
                className="bg-white border-slate-300 text-slate-900 focus:border-blue-600"
                placeholder="votre.email@exemple.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-800 font-semibold">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                required
                className="bg-white border-slate-300 text-slate-900 focus:border-blue-600"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>

            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 shadow-sm" disabled={loading}>
              {loading ? 'Connexion en cours...' : 'Se connecter'}
            </Button>

            <div className="pt-2 text-center space-y-3">
              <p className="text-sm text-slate-600 font-medium">
                Pas encore de compte ?{' '}
                <Link href="/auth/signup" className="text-blue-600 hover:text-blue-800 font-bold hover:underline">
                  S&apos;inscrire
                </Link>
              </p>

              <div className="border-t border-slate-100 pt-3">
                <Link href="/" className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors">
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                  Revenir à la page d&apos;accueil
                </Link>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
