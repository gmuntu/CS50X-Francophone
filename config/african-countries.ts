export interface CountryOption {
  code: string;        // ISO 2-letter
  name: string;        // Nom complet
  dialCode: string;    // Indicatif téléphonique ex: +243
  prefixDossier: string; // Préfixe du numéro de dossier ex: 243
  flag: string;        // Emoji drapeau
  phonePlaceholder: string; // Ex: 812 345 678
  phonePattern: string; // Ex: +243 XXX XXX XXX
}

export const AFRICAN_COUNTRIES: CountryOption[] = [
  {
    code: 'CD',
    name: 'RD Congo (RDC)',
    dialCode: '+243',
    prefixDossier: '243',
    flag: '🇨🇩',
    phonePlaceholder: '812 345 678',
    phonePattern: '+243 XXX XXX XXX',
  },
  {
    code: 'CG',
    name: 'Congo-Brazzaville',
    dialCode: '+242',
    prefixDossier: '242',
    flag: '🇨🇬',
    phonePlaceholder: '06 123 4567',
    phonePattern: '+242 XX XXX XXXX',
  },
  {
    code: 'CM',
    name: 'Cameroun',
    dialCode: '+237',
    prefixDossier: '237',
    flag: '🇨🇲',
    phonePlaceholder: '6 12 34 56 78',
    phonePattern: '+237 X XX XX XX XX',
  },
  {
    code: 'CI',
    name: "Côte d'Ivoire",
    dialCode: '+225',
    prefixDossier: '225',
    flag: '🇨🇮',
    phonePlaceholder: '07 12 34 56 78',
    phonePattern: '+225 XX XX XX XX XX',
  },
  {
    code: 'SN',
    name: 'Sénégal',
    dialCode: '+221',
    prefixDossier: '221',
    flag: '🇸🇳',
    phonePlaceholder: '77 123 45 67',
    phonePattern: '+221 XX XXX XX XX',
  },
  {
    code: 'GA',
    name: 'Gabon',
    dialCode: '+241',
    prefixDossier: '241',
    flag: '🇬🇦',
    phonePlaceholder: '62 12 34 56',
    phonePattern: '+241 XX XX XX XX',
  },
  {
    code: 'ML',
    name: 'Mali',
    dialCode: '+223',
    prefixDossier: '223',
    flag: '🇲🇱',
    phonePlaceholder: '70 12 34 56',
    phonePattern: '+223 XX XX XX XX',
  },
  {
    code: 'TD',
    name: 'Tchad',
    dialCode: '+235',
    prefixDossier: '235',
    flag: '🇹🇩',
    phonePlaceholder: '66 12 34 56',
    phonePattern: '+235 XX XX XX XX',
  },
  {
    code: 'NE',
    name: 'Niger',
    dialCode: '+227',
    prefixDossier: '227',
    flag: '🇳🇪',
    phonePlaceholder: '90 12 34 56',
    phonePattern: '+227 XX XX XX XX',
  },
  {
    code: 'BF',
    name: 'Burkina Faso',
    dialCode: '+226',
    prefixDossier: '226',
    flag: '🇧🇫',
    phonePlaceholder: '70 12 34 56',
    phonePattern: '+226 XX XX XX XX',
  },
  {
    code: 'GN',
    name: 'Guinée',
    dialCode: '+224',
    prefixDossier: '224',
    flag: '🇬🇳',
    phonePlaceholder: '620 12 34 56',
    phonePattern: '+224 XXX XX XX XX',
  },
  {
    code: 'BJ',
    name: 'Bénin',
    dialCode: '+229',
    prefixDossier: '229',
    flag: '🇧🇯',
    phonePlaceholder: '97 12 34 56',
    phonePattern: '+229 XX XX XX XX',
  },
  {
    code: 'TG',
    name: 'Togo',
    dialCode: '+228',
    prefixDossier: '228',
    flag: '🇹🇬',
    phonePlaceholder: '90 12 34 56',
    phonePattern: '+228 XX XX XX XX',
  },
  {
    code: 'RW',
    name: 'Rwanda',
    dialCode: '+250',
    prefixDossier: '250',
    flag: '🇷🇼',
    phonePlaceholder: '788 123 456',
    phonePattern: '+250 XXX XXX XXX',
  },
  {
    code: 'BI',
    name: 'Burundi',
    dialCode: '+257',
    prefixDossier: '257',
    flag: '🇧🇮',
    phonePlaceholder: '79 123 456',
    phonePattern: '+257 XX XXX XXX',
  },
  {
    code: 'FR',
    name: 'France',
    dialCode: '+33',
    prefixDossier: '33',
    flag: '🇫🇷',
    phonePlaceholder: '6 12 34 56 78',
    phonePattern: '+33 X XX XX XX XX',
  },
  {
    code: 'BE',
    name: 'Belgique',
    dialCode: '+32',
    prefixDossier: '32',
    flag: '🇧🇪',
    phonePlaceholder: '470 12 34 56',
    phonePattern: '+32 XXX XX XX XX',
  },
  {
    code: 'CA',
    name: 'Canada',
    dialCode: '+1',
    prefixDossier: '1',
    flag: '🇨🇦',
    phonePlaceholder: '514 123 4567',
    phonePattern: '+1 XXX XXX XXXX',
  },
];

export interface PaymentMethodOption {
  id: string;
  name: string;
  category: 'CARDS' | 'PAYPAL' | 'MOBILE_MONEY' | 'EXEMPT';
  description: string;
  badgeColor: string;
  badgeBg: string;
}

export const PAYMENT_METHODS: PaymentMethodOption[] = [
  {
    id: 'VISA',
    name: 'Visa',
    category: 'CARDS',
    description: 'Cartes de débit / crédit internationales',
    badgeColor: 'text-blue-700',
    badgeBg: 'bg-blue-100',
  },
  {
    id: 'MASTERCARD',
    name: 'MasterCard',
    category: 'CARDS',
    description: 'Paiement sécurisé 3D Secure',
    badgeColor: 'text-red-700',
    badgeBg: 'bg-red-100',
  },
  {
    id: 'PAYPAL',
    name: 'PayPal',
    category: 'PAYPAL',
    description: 'Paiement express mondial',
    badgeColor: 'text-sky-700',
    badgeBg: 'bg-sky-100',
  },
  {
    id: 'MPESA',
    name: 'Vodacom M-Pesa',
    category: 'MOBILE_MONEY',
    description: 'RDC, Kenya, Tanzanie, Mozambique',
    badgeColor: 'text-red-600',
    badgeBg: 'bg-red-50 border border-red-200',
  },
  {
    id: 'ORANGE_MONEY',
    name: 'Orange Money',
    category: 'MOBILE_MONEY',
    description: 'RDC, Côte d\'Ivoire, Sénégal, Cameroun, Mali',
    badgeColor: 'text-orange-600',
    badgeBg: 'bg-orange-50 border border-orange-200',
  },
  {
    id: 'AIRTEL_MONEY',
    name: 'Airtel Money',
    category: 'MOBILE_MONEY',
    description: 'RDC, Congo, Gabon, Tchad, Niger, Kenya',
    badgeColor: 'text-rose-600',
    badgeBg: 'bg-rose-50 border border-rose-200',
  },
  {
    id: 'MTN_MOMO',
    name: 'MTN MoMo',
    category: 'MOBILE_MONEY',
    description: 'Cameroun, Côte d\'Ivoire, Bénin, Ghana',
    badgeColor: 'text-amber-700',
    badgeBg: 'bg-amber-50 border border-amber-200',
  },
  {
    id: 'WAVE',
    name: 'Wave',
    category: 'MOBILE_MONEY',
    description: 'Sénégal, Côte d\'Ivoire, Mali, Burkina Faso',
    badgeColor: 'text-cyan-700',
    badgeBg: 'bg-cyan-50 border border-cyan-200',
  },
  {
    id: 'AFRIMONEY',
    name: 'Afrimoney',
    category: 'MOBILE_MONEY',
    description: 'Africell RDC, Gambie, Sierra Leone',
    badgeColor: 'text-purple-700',
    badgeBg: 'bg-purple-50 border border-purple-200',
  },
  {
    id: 'EXEMPT_UNIVERSITY',
    name: 'Exonération Universitaire (0 USD)',
    category: 'EXEMPT',
    description: 'Entente conventionnée avec l\'université partenaire',
    badgeColor: 'text-emerald-700',
    badgeBg: 'bg-emerald-50 border border-emerald-200',
  },
];

export const PARTNER_UNIVERSITIES = [
  'Université de Kinshasa (UNIKIN) - RDC',
  'Université Protestante au Congo (UPC) - RDC',
  'Université de Lubumbashi (UNILU) - RDC',
  'Université Catholique du Congo (UCC) - RDC',
  'Université Catholique de Bukavu (UCB) - RDC',
  'Institut Supérieur de Commerce (ISC Kinshasa) - RDC',
  'Institut Supérieur des Techniques Appliquées (ISTA) - RDC',
  'Université Marien Ngouabi (UMNG) - Congo-Brazzaville',
  'Université Denis Sassou-Nguesso (UDSN) - Congo-Brazzaville',
  'Université de Douala - Cameroun',
  'Université de Yaoundé I - Cameroun',
  'Université Félix Houphouët-Boigny - Côte d\'Ivoire',
  'Institut National Polytechnique Félix Houphouët-Boigny (INP-HB) - Côte d\'Ivoire',
  'Université Cheikh Anta Diop (UCAD) - Sénégal',
  'Université Gaston Berger (UGB) - Sénégal',
  'Université d\'Abomey-Calavi (UAC) - Bénin',
  'Université de Lomé - Togo',
  'Université Thomas Sankara - Burkina Faso',
  'Autre université (saisie libre)',
];

/**
 * Génère automatiquement un numéro de dossier unique conforme aux consignes PDF :
 * Doit commencer par le code du pays (ex: 243, 242, 237, etc.)
 */
export function generateDossierNumber(countryPrefix: string): string {
  const cleanPrefix = countryPrefix.replace(/[^0-9]/g, '') || '243';
  const yearSuffix = new Date().getFullYear().toString().slice(-2);
  const randomDigits = Math.floor(10000 + Math.random() * 90000); // 5 chiffres
  return `${cleanPrefix}-${yearSuffix}-${randomDigits}`;
}
