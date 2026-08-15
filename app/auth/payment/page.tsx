'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { 
  ArrowLeft, 
  BookOpen, 
  CreditCard, 
  Smartphone, 
  Globe, 
  CheckCircle2, 
  ShieldCheck, 
  Lock, 
  AlertCircle, 
  ArrowRight,
  RefreshCw,
  Sparkles,
  PhoneCall,
  Check
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type PaymentCategory = 'card' | 'mobile_money' | 'paypal'

interface MobileMoneyProvider {
  id: string
  name: string
  logoText: string
  color: string
  bgColor: string
  badgeColor: string
  countries: string[]
  code: string
  instructions: string
}

const MOBILE_MONEY_PROVIDERS: MobileMoneyProvider[] = [
  {
    id: 'mpesa',
    name: 'Vodacom M-Pesa',
    logoText: 'M-PESA',
    color: 'text-red-600',
    bgColor: 'bg-red-50 border-red-200 hover:border-red-500',
    badgeColor: 'bg-red-600 text-white',
    countries: ['🇨🇩 RDC (+243)', '🇰🇪 Kenya (+254)', '🇹🇿 Tanzanie (+255)', '🇲🇿 Mozambique (+258)'],
    code: '*1122# / Push USSD',
    instructions: 'Vous recevrez une notification Push sur votre mobile Vodacom. Tapez votre code PIN M-Pesa pour valider le paiement de 300 $.'
  },
  {
    id: 'orange_money',
    name: 'Orange Money',
    logoText: 'Orange Money',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 border-orange-200 hover:border-orange-500',
    badgeColor: 'bg-orange-500 text-white',
    countries: ['🇨🇩 RDC (+243)', '🇨🇮 Côte d\'Ivoire (+225)', '🇸🇳 Sénégal (+221)', '🇨🇲 Cameroun (+237)', '🇲🇱 Mali (+223)', '🇬🇳 Guinée (+224)'],
    code: '#144# / Push USSD',
    instructions: 'Vous recevrez une invite de paiement Orange Money. Confirmez avec votre code secret à 4 chiffres.'
  },
  {
    id: 'airtel_money',
    name: 'Airtel Money',
    logoText: 'airtel money',
    color: 'text-rose-600',
    bgColor: 'bg-rose-50 border-rose-200 hover:border-rose-500',
    badgeColor: 'bg-red-700 text-white',
    countries: ['🇨🇩 RDC (+243)', '🇨🇬 Congo (+242)', '🇬🇦 Gabon (+241)', '🇹🇩 Tchad (+235)', '🇳🇪 Niger (+227)', '🇰🇪 Kenya (+254)'],
    code: '*128# / Push USSD',
    instructions: 'Entrez votre code secret Airtel Money sur votre mobile après réception de la requête.'
  },
  {
    id: 'mtn_momo',
    name: 'MTN Mobile Money (MoMo)',
    logoText: 'MTN MoMo',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-50 border-yellow-200 hover:border-yellow-500',
    badgeColor: 'bg-yellow-500 text-slate-950 font-bold',
    countries: ['🇨🇲 Cameroun (+237)', '🇨🇮 Côte d\'Ivoire (+225)', '🇧🇯 Bénin (+229)', '🇬🇭 Ghana (+233)', '🇺🇬 Ouganda (+256)', '🇨🇬 Congo (+242)'],
    code: '*126# / *133#',
    instructions: 'Une demande d\'autorisation MTN MoMo apparaîtra sur votre écran. Validez avec votre code PIN.'
  },
  {
    id: 'wave',
    name: 'Wave Money',
    logoText: 'Wave',
    color: 'text-sky-600',
    bgColor: 'bg-sky-50 border-sky-200 hover:border-sky-500',
    badgeColor: 'bg-sky-500 text-white',
    countries: ['🇸🇳 Sénégal (+221)', '🇨🇮 Côte d\'Ivoire (+225)', '🇲🇱 Mali (+223)', '🇧🇫 Burkina Faso (+226)'],
    code: 'App Wave / QR code',
    instructions: 'Ouvrez votre application Wave pour autoriser le paiement de 300 $ ou scannez le code sécurisé.'
  },
  {
    id: 'afrimoney',
    name: 'Afrimoney (Africell)',
    logoText: 'Afrimoney',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 border-purple-200 hover:border-purple-500',
    badgeColor: 'bg-purple-600 text-white',
    countries: ['🇨🇩 RDC (+243)', '🇬🇲 Gambie (+220)', '🇸🇱 Sierra Leone (+232)'],
    code: '*111# / Push USSD',
    instructions: 'Confirmez le débit sur votre compte Afrimoney en saisissant votre mot de passe confidentiel.'
  }
]

function PaymentForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession() || {}

  // Email state
  const [email, setEmail] = useState('')
  const [userName, setUserName] = useState('')

  // Payment state
  const [activeCategory, setActiveCategory] = useState<PaymentCategory>('mobile_money')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successData, setSuccessData] = useState<any>(null)

  // Card form state
  const [cardType, setCardType] = useState<'visa' | 'mastercard' | 'amex'>('visa')
  const [cardNumber, setCardNumber] = useState('')
  const [cardHolder, setCardHolder] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCvv, setCardCvv] = useState('')

  // Mobile Money form state
  const [selectedProvider, setSelectedProvider] = useState<string>('mpesa')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [countryCode, setCountryCode] = useState('+243')
  const [manualReference, setManualReference] = useState('')

  // Paypal form state
  const [paypalEmail, setPaypalEmail] = useState('')

  useEffect(() => {
    // Determine user email
    const paramEmail = searchParams?.get('email')
    const paramName = searchParams?.get('name')
    const storedEmail = typeof window !== 'undefined' ? sessionStorage.getItem('cs50x_pending_email') : null
    const storedName = typeof window !== 'undefined' ? sessionStorage.getItem('cs50x_pending_name') : null

    const resolvedEmail = session?.user?.email || paramEmail || storedEmail || ''
    const resolvedName = session?.user?.name || paramName || storedName || ''

    setEmail(resolvedEmail)
    setUserName(resolvedName)
    if (resolvedName && !cardHolder) {
      setCardHolder(resolvedName)
    }
    if (resolvedEmail && !paypalEmail) {
      setPaypalEmail(resolvedEmail)
    }
  }, [session, searchParams, cardHolder, paypalEmail])

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '')
    if (val.length > 16) val = val.slice(0, 16)
    // Auto detect card type
    if (val.startsWith('4')) {
      setCardType('visa')
    } else if (val.startsWith('5') || val.startsWith('2')) {
      setCardType('mastercard')
    } else if (val.startsWith('3')) {
      setCardType('amex')
    }
    // Format in blocks of 4
    const formatted = val.match(/.{1,4}/g)?.join(' ') || val
    setCardNumber(formatted)
  }

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '')
    if (val.length > 4) val = val.slice(0, 4)
    if (val.length >= 3) {
      val = `${val.slice(0, 2)}/${val.slice(2)}`
    }
    setCardExpiry(val)
  }

  const handleProcessPayment = async (overrideMethod?: string) => {
    if (!email) {
      setError('Veuillez renseigner votre adresse email pour associer votre inscription.')
      return
    }

    setError('')
    setLoading(true)

    try {
      const methodToUse = overrideMethod || (
        activeCategory === 'card' 
          ? cardType 
          : activeCategory === 'paypal' 
            ? 'paypal' 
            : selectedProvider
      )

      let paymentDetails: any = {
        category: activeCategory,
        timestamp: new Date().toISOString()
      }

      if (activeCategory === 'card') {
        if (cardNumber.replace(/\s/g, '').length < 15) {
          throw new Error('Veuillez saisir un numéro de carte valide (16 chiffres)')
        }
        if (!cardExpiry || cardExpiry.length < 5) {
          throw new Error('Date d\'expiration invalide (MM/AA)')
        }
        if (!cardCvv || cardCvv.length < 3) {
          throw new Error('Code de sécurité CVV invalide')
        }
        paymentDetails = {
          ...paymentDetails,
          cardHolder,
          cardLast4: cardNumber.slice(-4),
          cardBrand: cardType.toUpperCase()
        }
      } else if (activeCategory === 'mobile_money') {
        if (!phoneNumber || phoneNumber.replace(/\D/g, '').length < 7) {
          throw new Error('Veuillez saisir un numéro de téléphone valide pour recevoir l\'invite de paiement Mobile Money')
        }
        paymentDetails = {
          ...paymentDetails,
          provider: selectedProvider,
          phone: `${countryCode} ${phoneNumber}`,
          transactionRef: manualReference || undefined
        }
      } else if (activeCategory === 'paypal') {
        paymentDetails = {
          ...paymentDetails,
          paypalEmail: paypalEmail || email
        }
      }

      const res = await fetch('/api/payment/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          paymentMethod: methodToUse,
          amount: 300,
          currency: 'USD',
          paymentDetails
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors du traitement du paiement')
      }

      setSuccessData(data.transaction)

      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('cs50x_pending_email')
      }
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue lors de la validation du paiement.')
    } finally {
      setLoading(false)
    }
  }

  const currentProvider = MOBILE_MONEY_PROVIDERS.find(p => p.id === selectedProvider) || MOBILE_MONEY_PROVIDERS[0]

  if (successData) {
    return (
      <Card className="w-full max-w-2xl bg-white text-slate-900 shadow-2xl border-slate-200">
        <CardHeader className="text-center pb-2">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <CardTitle className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Paiement Confirmé avec Succès !
          </CardTitle>
          <CardDescription className="text-slate-600 text-base font-medium mt-1">
            Félicitations, votre inscription comme Candidat Libre est validée.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
            <div className="flex justify-between items-center text-sm border-b border-slate-200/80 pb-2.5">
              <span className="text-slate-500 font-medium">Référence de transaction</span>
              <span className="font-mono font-bold text-slate-900">{successData.reference}</span>
            </div>
            <div className="flex justify-between items-center text-sm border-b border-slate-200/80 pb-2.5">
              <span className="text-slate-500 font-medium">Mode de paiement</span>
              <span className="font-bold text-slate-900 uppercase">{successData.paymentMethod}</span>
            </div>
            <div className="flex justify-between items-center text-sm border-b border-slate-200/80 pb-2.5">
              <span className="text-slate-500 font-medium">Montant payé</span>
              <span className="font-extrabold text-emerald-600 text-base">300 $ USD</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500 font-medium">Compte étudiant</span>
              <span className="font-semibold text-slate-900">{successData.userEmail}</span>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start space-x-3">
            <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-900 font-medium leading-relaxed">
              Votre accès permanent à l&apos;ensemble des 11 semaines de cours, exercices pratiques et certifications CS50X est immédiatement débloqué.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              onClick={() => router.push('/courses')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 text-base shadow-md"
            >
              Accéder aux cours CS50X
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/auth/login')}
              className="w-full sm:w-auto border-slate-300 text-slate-700 font-bold"
            >
              Se connecter
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-2xl bg-white text-slate-900 shadow-2xl border-slate-200 overflow-hidden">
      <CardHeader className="text-center pb-4 border-b border-slate-100 bg-slate-50/50">
        <Link href="/" className="inline-flex items-center justify-center space-x-2.5 mx-auto mb-2">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-extrabold text-slate-900">
            CS50X <span className="text-blue-600">Français</span>
          </span>
        </Link>
        <CardTitle className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Finaliser votre inscription
        </CardTitle>
        <CardDescription className="text-slate-600 font-medium">
          Candidat Libre • Accès complet à vie aux 11 semaines de cours
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {error && (
          <div className="p-3.5 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg font-medium flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Price & Plan Summary */}
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 border border-blue-200/80 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 bg-blue-600 text-white font-bold text-xs rounded-full uppercase">
                Candidat Libre
              </span>
              <span className="text-xs font-semibold text-slate-600">Paiement unique</span>
            </div>
            <h4 className="font-extrabold text-slate-900 text-lg mt-1">CS50X Programme Complet</h4>
            <p className="text-xs text-slate-600 font-medium">11 modules, ateliers pratiques, certification et support</p>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-3xl font-extrabold text-blue-600">300 $</div>
            <div className="text-xs font-semibold text-slate-500">USD</div>
          </div>
        </div>

        {/* Email verification input */}
        <div className="space-y-1.5 bg-slate-50 p-3.5 rounded-lg border border-slate-200/80">
          <div className="flex justify-between items-center">
            <Label htmlFor="paymentEmail" className="text-xs font-bold text-slate-700 uppercase tracking-wide">
              Compte étudiant associé
            </Label>
            {email && <span className="text-xs text-emerald-600 font-bold flex items-center gap-1"><Check className="w-3 h-3" /> Identifié</span>}
          </div>
          <Input
            id="paymentEmail"
            type="email"
            placeholder="votre.email@exemple.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-white border-slate-300 text-slate-900 font-medium h-9 text-sm focus:border-blue-600"
          />
        </div>

        {/* Payment Category Selector Tabs */}
        <div className="space-y-2">
          <Label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
            Choisissez votre moyen de paiement
          </Label>
          <div className="grid grid-cols-3 gap-2">
            {/* Mobile Money Afrique */}
            <button
              type="button"
              onClick={() => {
                setActiveCategory('mobile_money')
                setError('')
              }}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                activeCategory === 'mobile_money'
                  ? 'border-blue-600 bg-blue-50/70 text-blue-700 shadow-sm ring-2 ring-blue-600/20'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Smartphone className="w-5 h-5 mb-1 text-emerald-600" />
              <span className="font-bold text-xs">Mobile Money</span>
              <span className="text-[10px] text-slate-500 font-medium">M-Pesa, Orange...</span>
            </button>

            {/* Carte Bancaire */}
            <button
              type="button"
              onClick={() => {
                setActiveCategory('card')
                setError('')
              }}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                activeCategory === 'card'
                  ? 'border-blue-600 bg-blue-50/70 text-blue-700 shadow-sm ring-2 ring-blue-600/20'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <CreditCard className="w-5 h-5 mb-1 text-blue-600" />
              <span className="font-bold text-xs">Carte Bancaire</span>
              <span className="text-[10px] text-slate-500 font-medium">Visa, Mastercard</span>
            </button>

            {/* PayPal */}
            <button
              type="button"
              onClick={() => {
                setActiveCategory('paypal')
                setError('')
              }}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                activeCategory === 'paypal'
                  ? 'border-blue-600 bg-blue-50/70 text-blue-700 shadow-sm ring-2 ring-blue-600/20'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Globe className="w-5 h-5 mb-1 text-sky-600" />
              <span className="font-bold text-xs">PayPal</span>
              <span className="text-[10px] text-slate-500 font-medium">Compte PayPal</span>
            </button>
          </div>
        </div>

        {/* TAB 1: Mobile Money Afrique */}
        {activeCategory === 'mobile_money' && (
          <div className="space-y-4 pt-1">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-700">
                Sélectionnez votre opérateur Mobile Money
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {MOBILE_MONEY_PROVIDERS.map((provider) => (
                  <button
                    key={provider.id}
                    type="button"
                    onClick={() => {
                      setSelectedProvider(provider.id)
                    }}
                    className={`p-2.5 rounded-lg border text-left transition-all relative ${
                      selectedProvider === provider.id
                        ? 'border-blue-600 bg-blue-50/80 shadow-sm ring-1 ring-blue-600'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-extrabold ${provider.color}`}>
                        {provider.logoText}
                      </span>
                      {selectedProvider === provider.id && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                      )}
                    </div>
                    <p className="text-[11px] font-semibold text-slate-800 truncate">
                      {provider.name}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${currentProvider.badgeColor}`}>
                    {currentProvider.logoText}
                  </span>
                  <span className="font-bold text-sm text-slate-900">{currentProvider.name}</span>
                </div>
                <span className="text-xs text-slate-500 font-mono font-bold">{currentProvider.code}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1 sm:col-span-1">
                  <Label className="text-xs font-semibold text-slate-700">Pays / Indicatif</Label>
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="w-full h-10 px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-xs font-semibold text-slate-900 focus:border-blue-600 focus:outline-none"
                  >
                    <option value="+243">🇨🇩 RDC (+243)</option>
                    <option value="+225">🇨🇮 Côte d&apos;Ivoire (+225)</option>
                    <option value="+221">🇸🇳 Sénégal (+221)</option>
                    <option value="+237">🇨🇲 Cameroun (+237)</option>
                    <option value="+242">🇨🇬 Congo-Brazza (+242)</option>
                    <option value="+241">🇬🇦 Gabon (+241)</option>
                    <option value="+223">🇲🇱 Mali (+223)</option>
                    <option value="+224">🇬🇳 Guinée (+224)</option>
                    <option value="+229">🇧🇯 Bénin (+229)</option>
                    <option value="+254">🇰🇪 Kenya (+254)</option>
                  </select>
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs font-semibold text-slate-700">Numéro de téléphone mobile</Label>
                  <div className="relative">
                    <Input
                      type="tel"
                      placeholder="Ex: 812345678"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="bg-white border-slate-300 text-slate-900 font-bold tracking-wider pl-3 h-10"
                    />
                  </div>
                </div>
              </div>

              <div className="p-3 bg-blue-50/70 border border-blue-200/70 rounded-lg text-xs text-slate-700 space-y-1">
                <div className="font-bold text-blue-900 flex items-center gap-1.5">
                  <PhoneCall className="w-3.5 h-3.5 text-blue-700" />
                  Instruction de validation Mobile Money :
                </div>
                <p className="leading-relaxed text-slate-700 font-medium">
                  {currentProvider.instructions}
                </p>
              </div>

              <div className="pt-1">
                <details className="text-xs text-slate-600">
                  <summary className="cursor-pointer font-semibold text-blue-600 hover:text-blue-700">
                    Vous avez déjà un numéro de transaction ou code SMS ?
                  </summary>
                  <div className="mt-2 space-y-1.5">
                    <Label className="text-[11px] font-semibold text-slate-700">
                      ID de transaction / Code reçu par SMS (optionnel)
                    </Label>
                    <Input
                      placeholder="Ex: MP240815.1234.A001"
                      value={manualReference}
                      onChange={(e) => setManualReference(e.target.value)}
                      className="bg-white border-slate-300 text-slate-900 font-mono text-xs h-9"
                    />
                  </div>
                </details>
              </div>
            </div>

            <Button
              onClick={() => handleProcessPayment()}
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 text-sm shadow-md transition-all flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  <span>Envoi de la requête de paiement Mobile Money...</span>
                </>
              ) : (
                <>
                  <Smartphone className="w-4 h-4 mr-1.5" />
                  <span>Payer 300 $ via {currentProvider.name}</span>
                </>
              )}
            </Button>
          </div>
        )}

        {/* TAB 2: Carte Bancaire (Visa, MasterCard, Amex) */}
        {activeCategory === 'card' && (
          <div className="space-y-4 pt-1">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs font-bold text-slate-700">Cartes acceptées</span>
              <div className="flex items-center space-x-3">
                <span className={`px-2.5 py-1 rounded text-xs font-extrabold border ${
                  cardType === 'visa' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-700 border-slate-200'
                }`}>
                  VISA
                </span>
                <span className={`px-2.5 py-1 rounded text-xs font-extrabold border ${
                  cardType === 'mastercard' ? 'bg-rose-600 text-white border-rose-600' : 'bg-white text-rose-600 border-slate-200'
                }`}>
                  MasterCard
                </span>
                <span className={`px-2.5 py-1 rounded text-xs font-extrabold border ${
                  cardType === 'amex' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-indigo-700 border-slate-200'
                }`}>
                  AMEX
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="cardHolder" className="text-xs font-semibold text-slate-700">
                  Nom sur la carte
                </Label>
                <Input
                  id="cardHolder"
                  placeholder="JEAN DUPONT"
                  value={cardHolder}
                  onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                  className="bg-white border-slate-300 text-slate-900 font-semibold uppercase text-sm h-10"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="cardNumber" className="text-xs font-semibold text-slate-700">
                  Numéro de carte Visa / MasterCard
                </Label>
                <div className="relative">
                  <Input
                    id="cardNumber"
                    placeholder="4000 1234 5678 9010"
                    value={cardNumber}
                    onChange={handleCardNumberChange}
                    className="bg-white border-slate-300 text-slate-900 font-mono font-bold tracking-wider text-sm h-10 pr-14"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-extrabold text-slate-500">
                    {cardType.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="cardExpiry" className="text-xs font-semibold text-slate-700">
                    Date d&apos;expiration (MM/AA)
                  </Label>
                  <Input
                    id="cardExpiry"
                    placeholder="MM/AA"
                    value={cardExpiry}
                    onChange={handleExpiryChange}
                    className="bg-white border-slate-300 text-slate-900 font-mono text-center font-bold text-sm h-10"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="cardCvv" className="text-xs font-semibold text-slate-700">
                    Code CVC / CVV
                  </Label>
                  <Input
                    id="cardCvv"
                    type="password"
                    maxLength={4}
                    placeholder="123"
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                    className="bg-white border-slate-300 text-slate-900 font-mono text-center font-bold text-sm h-10"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 text-xs text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Transaction chiffrée SSL 256 bits et authentification 3D Secure</span>
            </div>

            <Button
              onClick={() => handleProcessPayment()}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 text-sm shadow-md transition-all flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  <span>Traitement sécurisé en cours...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-1.5" />
                  <span>Payer 300 $ par Carte Bancaire</span>
                </>
              )}
            </Button>
          </div>
        )}

        {/* TAB 3: PayPal */}
        {activeCategory === 'paypal' && (
          <div className="space-y-4 pt-1">
            <div className="bg-sky-50 border border-sky-200 rounded-xl p-5 text-center space-y-3">
              <div className="w-12 h-12 bg-sky-600 text-white rounded-full flex items-center justify-center mx-auto shadow-sm">
                <Globe className="w-6 h-6" />
              </div>
              <h4 className="font-extrabold text-slate-900 text-base">
                Paiement Express avec PayPal
              </h4>
              <p className="text-xs text-slate-600 font-medium max-w-sm mx-auto">
                Réglez en toute sécurité avec votre compte PayPal ou votre carte liée.
              </p>

              <div className="max-w-md mx-auto space-y-1.5 text-left pt-2">
                <Label htmlFor="paypalEmailInput" className="text-xs font-semibold text-slate-700">
                  Adresse email du compte PayPal
                </Label>
                <Input
                  id="paypalEmailInput"
                  type="email"
                  placeholder="votre.compte@paypal.com"
                  value={paypalEmail}
                  onChange={(e) => setPaypalEmail(e.target.value)}
                  className="bg-white border-slate-300 text-slate-900 font-medium text-sm h-10"
                />
              </div>
            </div>

            <Button
              onClick={() => handleProcessPayment('paypal')}
              disabled={loading}
              className="w-full bg-[#0070BA] hover:bg-[#005ea6] text-white font-bold py-3 text-sm shadow-md transition-all flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  <span>Connexion à PayPal...</span>
                </>
              ) : (
                <>
                  <span className="font-extrabold italic text-amber-300 mr-1">P</span>
                  <span>Payer 300 $ avec PayPal</span>
                </>
              )}
            </Button>
          </div>
        )}

        {/* Security Guarantee Footer */}
        <div className="border-t border-slate-100 pt-4 flex flex-wrap items-center justify-between text-[11px] text-slate-500 gap-2">
          <div className="flex items-center space-x-1.5">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>Paiement sécurisé et vérifié</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Activation instantanée de l&apos;accès</span>
          </div>
        </div>

        <div className="text-center pt-1">
          <Link href="/" className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Revenir à la page d&apos;accueil
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

export default function PaymentPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 px-4 py-12 text-slate-100">
      <div className="w-full max-w-2xl mb-6 flex justify-between items-center">
        <Link
          href="/"
          className="inline-flex items-center text-sm font-semibold text-slate-300 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2 text-blue-400" />
          Retour à l&apos;accueil
        </Link>
        <Link
          href="/"
          className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1.5"
        >
          <BookOpen className="w-3.5 h-3.5" />
          CS50X Francophone
        </Link>
      </div>

      <Suspense fallback={
        <div className="w-full max-w-2xl p-12 bg-white rounded-xl text-center text-slate-800 font-bold">
          Chargement du module de paiement sécurisé...
        </div>
      }>
        <PaymentForm />
      </Suspense>
    </div>
  )
}
