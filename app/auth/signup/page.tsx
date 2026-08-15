
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { ArrowLeft, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function SignupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [enrollmentType, setEnrollmentType] = useState<string>('university')
  const [universities, setUniversities] = useState<any[]>([])
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    university: '',
    accessCode: ''
  })

  // Charger les universités
  useEffect(() => {
    const loadUniversities = async () => {
      try {
        const res = await fetch('/api/universities')
        const data = await res.json()
        setUniversities(data.universities || [])
      } catch (err) {
        console.error('Error loading universities:', err)
      }
    }
    loadUniversities()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      setLoading(false)
      return
    }

    if (formData.password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères')
      setLoading(false)
      return
    }

    try {
      // Inscription
      const signupRes = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          enrollmentType
        })
      })

      const signupData = await signupRes.json()

      if (!signupRes.ok) {
        throw new Error(signupData.error || 'Erreur lors de l\'inscription')
      }

      // Si candidat libre, enregistrer l'email et rediriger vers le paiement avec modes multiples
      if (enrollmentType === 'independent') {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('cs50x_pending_email', formData.email)
          sessionStorage.setItem('cs50x_pending_name', formData.fullName)
        }
        router.push(`/auth/payment?email=${encodeURIComponent(formData.email)}&name=${encodeURIComponent(formData.fullName)}`)
        return
      }

      // Si universitaire, connexion automatique
      const signInResult = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false
      })

      if (signInResult?.error) {
        setError('Inscription réussie mais erreur de connexion. Veuillez vous connecter manuellement.')
        setTimeout(() => router.push('/auth/login'), 2000)
      } else {
        router.push('/courses')
      }
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue')
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
          <CardTitle className="text-2xl font-extrabold text-slate-900 tracking-tight">Inscription</CardTitle>
          <CardDescription className="text-slate-600 font-medium">
            Créez votre compte pour accéder aux cours
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
              <Label className="text-slate-800 font-semibold">Type d&apos;inscription</Label>
              <Select value={enrollmentType} onValueChange={setEnrollmentType}>
                <SelectTrigger className="bg-white border-slate-300 text-slate-900 font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-300 shadow-lg z-50">
                  <SelectItem value="university" className="cursor-pointer hover:bg-blue-50 focus:bg-blue-100 text-slate-900 font-medium">
                    Étudiant universitaire
                  </SelectItem>
                  <SelectItem value="independent" className="cursor-pointer hover:bg-blue-50 focus:bg-blue-100 text-slate-900 font-medium">
                    Candidat libre (300 $ • Carte, PayPal, M-Pesa, Orange Money...)
                  </SelectItem>
                </SelectContent>
              </Select>
              {enrollmentType === 'independent' && (
                <p className="text-xs text-blue-700 bg-blue-50 p-2.5 rounded-md border border-blue-200/80 font-medium">
                  💳 <strong>Paiements acceptés :</strong> Visa, MasterCard, PayPal, et Mobile Money Afrique (M-Pesa, Orange Money, Airtel Money, MTN MoMo, Wave, Afrimoney).
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-slate-800 font-semibold">Nom complet</Label>
              <Input
                id="fullName"
                type="text"
                required
                className="bg-white border-slate-300 text-slate-900 focus:border-blue-600"
                placeholder="Jean Dupont"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              />
            </div>

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

            {enrollmentType === 'university' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="university" className="text-slate-800 font-semibold">Université</Label>
                  <Select 
                    value={formData.university} 
                    onValueChange={(value) => setFormData({ ...formData, university: value })}
                  >
                    <SelectTrigger className="bg-white border-slate-300 text-slate-900 font-medium">
                      <SelectValue placeholder="Sélectionnez votre université" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-300 shadow-lg z-50">
                      {universities.map((uni) => (
                        <SelectItem 
                          key={uni.id} 
                          value={uni.name}
                          className="cursor-pointer hover:bg-blue-50 focus:bg-blue-100 text-slate-900 font-medium"
                        >
                          {uni.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accessCode" className="text-slate-800 font-semibold">Code d&apos;accès universitaire</Label>
                  <Input
                    id="accessCode"
                    type="text"
                    required={enrollmentType === 'university'}
                    className="bg-white border-slate-300 text-slate-900 focus:border-blue-600"
                    value={formData.accessCode}
                    onChange={(e) => setFormData({ ...formData, accessCode: e.target.value })}
                    placeholder="Code fourni par votre université"
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-800 font-semibold">Mot de passe (8 caractères min.)</Label>
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

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-slate-800 font-semibold">Confirmer le mot de passe</Label>
              <Input
                id="confirmPassword"
                type="password"
                required
                className="bg-white border-slate-300 text-slate-900 focus:border-blue-600"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              />
            </div>

            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 shadow-sm" disabled={loading}>
              {loading ? 'Inscription en cours...' : 'S\'inscrire'}
            </Button>

            <div className="pt-2 text-center space-y-3">
              <p className="text-sm text-slate-600 font-medium">
                Déjà un compte ?{' '}
                <Link href="/auth/login" className="text-blue-600 hover:text-blue-800 font-bold hover:underline">
                  Se connecter
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
