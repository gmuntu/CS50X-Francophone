// Informations légales de SavoirIA — À COMPLÉTER / VÉRIFIER par le fondateur (et relire par un juriste).
export const LEGAL = {
  operator: process.env.NEXT_PUBLIC_LEGAL_OPERATOR || 'SavoirIA (Ghislain, fondateur)',
  location: process.env.NEXT_PUBLIC_LEGAL_LOCATION || 'Canada',
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'contact@savoiria.online',
  minAge: Number(process.env.NEXT_PUBLIC_MIN_AGE || 16),
  updated: '15 octobre 2026',
};
