// Interrupteur unique du chat WhatsApp avec le tuteur (en attente de l'approbation de Meta).
// Éteint par défaut : mettre NEXT_PUBLIC_WHATSAPP_ACTIF=1 dans Vercel puis redéployer pour tout rallumer
// (carte dans l'application, réponses du tuteur et rappels automatiques).
export const whatsappActif = () => process.env.NEXT_PUBLIC_WHATSAPP_ACTIF === '1';

export const MESSAGE_PAUSE =
  "Le chat WhatsApp avec le tuteur arrive bientot. En attendant, retrouvez-le sur savoiria.online.";
