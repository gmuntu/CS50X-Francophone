'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { 
  X, 
  CreditCard, 
  Smartphone, 
  Globe, 
  CheckCircle2, 
  ShieldCheck, 
  Lock, 
  AlertCircle, 
  RefreshCw, 
  PhoneCall, 
  BookOpen, 
  Check, 
  ArrowRight,
  Sparkles
} from 'lucide-react'
import { Button } from '@/components/ui/button'
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

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  initialEmail?: string
}

export default function PaymentModal({ isOpen, onClose, initialEmail }: PaymentModalProps) {
  const router = useRouter()
  const { data: session } = useSession() || {}

  const [email, setEmail] = useState('')
  const [activeCategory, setActiveCategory] = useState<PaymentCategory>('mobile_money')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successData, setSuccessData] = useState<any>(null)

  // Card
  const [cardType, setCardType] = useState<'visa' | 'mastercard' | 'amex'>('visa')
  const [cardNumber, setCardNumber] = useState('')
  const [cardHolder, setCardHolder] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCvv, setCardCvv] = useState('')

  // Mobile Money
  const [selectedProvider, setSelectedProvider] = useState<string>('mpesa')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [countryCode, setCountryCode] = useState('+243')
  const [manualReference, setManualReference] = useState('')

  // PayPal
  const [paypalEmail, setPaypalEmail] = useState('')

  useEffect(() => {
    if (isOpen) {
      const resolvedEmail = session?.user?.email || initialEmail || (typeof window !== 'undefined' ? sessionStorage.getItem('cs50x_pending_email') : '') || ''
      const resolvedName = session?.user?.name || (typeof window !== 'undefined' ? sessionStorage.getItem('cs50x_pending_name') : '') || ''
      
      setEmail(resolvedEmail)
      if (resolvedName && !cardHolder) setCardHolder(resolvedName)
      if (resolvedEmail && !paypalEmail) setPaypalEmail(resolvedEmail)
    }
  }, [isOpen, session, initialEmail, cardHolder, paypalEmail])

  if (!isOpen) return null

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '')
    if (val.length > 16) val = val.slice(0, 16)
    if (val.startsWith('4')) setCardType('visa')
    else if (val.startsWith('5') || val.startsWith('2')) setCardType('mastercard')
    else if (val.startsWith('3')) setCardType('amex')
    const formatted = val.match(/.{1,4}/g)?.join(' ') || val
    setCardNumber(formatted)
  }

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '')
    if (val.length > 4) val = val.slice(0, 4)
    if (val.length >= 3) val = `${val.slice(0, 2)}/${val.slice(2)}`
    setCardExpiry(val)
  }

  const handleProcessPayment = async (overrideMethod?: string) => {
    if (!email) {
      setError('Veuillez renseigner votre email étudiant.')
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
          throw new Error('Numéro de carte invalide (16 chiffres)')
        }
        if (!cardExpiry || cardExpiry.length < 5) {
          throw new Error('Date d\'expiration invalide (MM/AA)')
        }
        if (!cardCvv || cardCvv.length < 3) {
          throw new Error('Code CVV invalide')
        }
        paymentDetails = {
          ...paymentDetails,
          cardHolder,
          cardLast4: cardNumber.slice(-4),
          cardBrand: cardType.toUpperCase()
        }
      } else if (activeCategory === 'mobile_money') {
        if (!phoneNumber || phoneNumber.replace(/\D/g, '').length < 7) {
          throw new Error('Veuillez saisir votre numéro Mobile Money')
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
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue lors de la validation.')
    } finally {
      setLoading(false)
    }
  }

  const currentProvider = MOBILE_MONEY_PROVIDERS.find(p => p.id === selectedProvider) || MOBILE_MONEY_PROVIDERS[0]

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full my-8 overflow-hidden relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {successData ? (
          <div className="p-6 md:p-8 space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Paiement Confirmé !
              </h3>
              <p className="text-slate-600 font-medium text-sm mt-1">
                Félicitations, votre inscription comme Candidat Libre est validée.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5 text-sm">
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500">Référence</span>
                <span className="font-mono font-bold text-slate-900">{successData.reference}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500">Mode de paiement</span>
                <span className="font-bold text-slate-900 uppercase">{successData.paymentMethod}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500">Montant</span>
                <span className="font-extrabold text-emerald-600">300 $ USD</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Email</span>
                <span className="font-semibold text-slate-900">{successData.userEmail}</span>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex items-start space-x-3 text-xs text-blue-900 font-medium">
              <Sparkles className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <span>Accès débloqué à vie pour l&apos;ensemble des 11 semaines de cours et certifications CS50X.</span>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => {
                  onClose()
                  router.push('/courses')
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 text-sm shadow-md"
              >
                Accéder aux cours CS50X
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        ) : (
          <div>
            {/* Header */}
            <div className="bg-slate-50/80 p-6 border-b border-slate-200/80">
              <div className="flex items-center space-x-2 mb-1">
                <div className="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center">
                  <BookOpen className="w-4 h-4 text-white" />
                </div>
                <span className="font-extrabold text-slate-900 text-sm">
                  CS50X <span className="text-blue-600">Francophone</span>
                </span>
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900">
                Paiement Candidat Libre
              </h2>
              <p className="text-xs text-slate-600 font-medium mt-0.5">
                Accès complet aux 11 semaines • 300 $ USD
              </p>
            </div>

            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {error && (
                <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg font-medium flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Email */}
              <div className="space-y-1 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="flex justify-between items-center text-xs">
                  <Label className="font-bold text-slate-700">Email du compte étudiant</Label>
                  {email && <span className="text-emerald-600 font-bold flex items-center gap-1"><Check className="w-3 h-3" /> Validé</span>}
                </div>
                <Input
                  type="email"
                  placeholder="votre.email@exemple.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white border-slate-300 text-slate-900 font-medium h-9 text-xs"
                />
              </div>

              {/* Tabs */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Moyen de paiement</Label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveCategory('mobile_money')
                      setError('')
                    }}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                      activeCategory === 'mobile_money'
                        ? 'border-blue-600 bg-blue-50/70 text-blue-700 ring-2 ring-blue-600/20'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Smartphone className="w-4 h-4 mb-1 text-emerald-600" />
                    <span className="font-bold text-[11px]">Mobile Money</span>
                    <span className="text-[9px] text-slate-500">M-Pesa, Orange...</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveCategory('card')
                      setError('')
                    }}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                      activeCategory === 'card'
                        ? 'border-blue-600 bg-blue-50/70 text-blue-700 ring-2 ring-blue-600/20'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 mb-1 text-blue-600" />
                    <span className="font-bold text-[11px]">Carte Bancaire</span>
                    <span className="text-[9px] text-slate-500">Visa, Mastercard</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveCategory('paypal')
                      setError('')
                    }}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                      activeCategory === 'paypal'
                        ? 'border-blue-600 bg-blue-50/70 text-blue-700 ring-2 ring-blue-600/20'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Globe className="w-4 h-4 mb-1 text-sky-600" />
                    <span className="font-bold text-[11px]">PayPal</span>
                    <span className="text-[9px] text-slate-500">Compte PayPal</span>
                  </button>
                </div>
              </div>

              {/* Mobile Money Options */}
              {activeCategory === 'mobile_money' && (
                <div className="space-y-3 pt-1">
                  <div className="grid grid-cols-3 gap-2">
                    {MOBILE_MONEY_PROVIDERS.map((provider) => (
                      <button
                        key={provider.id}
                        type="button"
                        onClick={() => setSelectedProvider(provider.id)}
                        className={`p-2 rounded-lg border text-left text-xs font-semibold transition-all relative ${
                          selectedProvider === provider.id
                            ? 'border-blue-600 bg-blue-50 shadow-sm ring-1 ring-blue-600'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className={`font-extrabold text-[11px] ${provider.color}`}>
                          {provider.logoText}
                        </div>
                        <div className="text-[10px] text-slate-600 truncate">{provider.name}</div>
                      </button>
                    ))}
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label className="text-[11px] font-semibold text-slate-700">Pays</Label>
                        <select
                          value={countryCode}
                          onChange={(e) => setCountryCode(e.target.value)}
                          className="w-full h-9 px-2 bg-white border border-slate-300 rounded-md text-xs font-medium text-slate-900"
                        >
                          <option value="+243">🇨🇩 RDC (+243)</option>
                          <option value="+225">🇨🇮 Côte d&apos;Ivoire (+225)</option>
                          <option value="+221">🇸🇳 Sénégal (+221)</option>
                          <option value="+237">🇨🇲 Cameroun (+237)</option>
                          <option value="+242">🇨🇬 Congo (+242)</option>
                          <option value="+241">🇬🇦 Gabon (+241)</option>
                          <option value="+223">🇲🇱 Mali (+223)</option>
                          <option value="+224">🇬🇳 Guinée (+224)</option>
                          <option value="+229">🇧🇯 Bénin (+229)</option>
                          <option value="+254">🇰🇪 Kenya (+254)</option>
                        </select>
                      </div>
                      <div className="col-span-2">
                        <Label className="text-[11px] font-semibold text-slate-700">Numéro de téléphone</Label>
                        <Input
                          type="tel"
                          placeholder="Ex: 812345678"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          className="bg-white border-slate-300 text-slate-900 font-bold h-9 text-xs"
                        />
                      </div>
                    </div>

                    <div className="p-2.5 bg-blue-50 border border-blue-200/80 rounded-lg text-[11px] text-blue-900 font-medium">
                      <div className="font-bold flex items-center gap-1 mb-0.5">
                        <PhoneCall className="w-3 h-3 text-blue-700" />
                        Instruction {currentProvider.name} :
                      </div>
                      {currentProvider.instructions}
                    </div>
                  </div>

                  <Button
                    onClick={() => handleProcessPayment()}
                    disabled={loading}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 text-xs shadow-md"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
                        Traitement Mobile Money en cours...
                      </>
                    ) : (
                      <>
                        <Smartphone className="w-3.5 h-3.5 mr-1.5" />
                        Payer 300 $ via {currentProvider.name}
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Card Form */}
              {activeCategory === 'card' && (
                <div className="space-y-3 pt-1">
                  <div className="space-y-2">
                    <div>
                      <Label className="text-[11px] font-semibold text-slate-700">Nom sur la carte</Label>
                      <Input
                        placeholder="JEAN DUPONT"
                        value={cardHolder}
                        onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                        className="bg-white border-slate-300 uppercase text-xs h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] font-semibold text-slate-700">Numéro de carte</Label>
                      <Input
                        placeholder="4000 1234 5678 9010"
                        value={cardNumber}
                        onChange={handleCardNumberChange}
                        className="bg-white border-slate-300 font-mono font-bold text-xs h-9"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[11px] font-semibold text-slate-700">Expiration (MM/AA)</Label>
                        <Input
                          placeholder="MM/AA"
                          value={cardExpiry}
                          onChange={handleExpiryChange}
                          className="bg-white border-slate-300 font-mono text-center text-xs h-9"
                        />
                      </div>
                      <div>
                        <Label className="text-[11px] font-semibold text-slate-700">CVV</Label>
                        <Input
                          type="password"
                          maxLength={4}
                          placeholder="123"
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                          className="bg-white border-slate-300 font-mono text-center text-xs h-9"
                        />
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={() => handleProcessPayment()}
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 text-xs shadow-md"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
                        Chiffrement et débit en cours...
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5 mr-1.5" />
                        Payer 300 $ par Carte Bancaire
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* PayPal Form */}
              {activeCategory === 'paypal' && (
                <div className="space-y-3 pt-1">
                  <div className="bg-sky-50 p-4 rounded-xl border border-sky-200 text-center space-y-2">
                    <h4 className="font-bold text-xs text-slate-900">Règlement express avec PayPal</h4>
                    <Input
                      type="email"
                      placeholder="votre.compte@paypal.com"
                      value={paypalEmail}
                      onChange={(e) => setPaypalEmail(e.target.value)}
                      className="bg-white border-slate-300 text-xs h-9"
                    />
                  </div>

                  <Button
                    onClick={() => handleProcessPayment('paypal')}
                    disabled={loading}
                    className="w-full bg-[#0070BA] hover:bg-[#005ea6] text-white font-bold py-2.5 text-xs shadow-md"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
                        Connexion PayPal...
                      </>
                    ) : (
                      <>
                        <Globe className="w-3.5 h-3.5 mr-1.5" />
                        Payer 300 $ avec PayPal
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Security footer */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                <span className="flex items-center gap-1">
                  <Lock className="w-3 h-3 text-slate-400" />
                  SSL 256 bits
                </span>
                <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                  <ShieldCheck className="w-3 h-3" />
                  Activation instantanée
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
