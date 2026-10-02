'use client';

import { MessageSquare, MessageCircle } from 'lucide-react';

const SMS = process.env.NEXT_PUBLIC_TUTOR_SMS_NUMBER;
const WA = process.env.NEXT_PUBLIC_TUTOR_WHATSAPP_NUMBER;

/** Carte « Tuteur par SMS / WhatsApp » : visible seulement quand les numéros sont configurés. */
export default function TutorMessageCard() {
  if (!SMS && !WA) return null;
  return (
    <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-soft-sm space-y-3">
      <div>
        <h3 className="font-bold text-foreground text-sm">Le tuteur, même sans Internet</h3>
        <p className="text-xs text-muted-foreground">
          Posez vos questions à Socrate par message, depuis le numéro enregistré dans votre profil. Écrivez « AIDE » pour commencer, « SEMAINE 2 » pour choisir la semaine.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {SMS && (
          <a href={`sms:${SMS}?body=AIDE`} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold">
            <MessageSquare className="w-3.5 h-3.5" /> SMS : {SMS}
          </a>
        )}
        {WA && (
          <a href={`https://wa.me/${WA.replace(/\D/g, '')}?text=AIDE`} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold">
            <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
          </a>
        )}
      </div>
    </div>
  );
}
