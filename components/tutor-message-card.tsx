'use client';

import { MessageSquare, MessageCircle, KeyRound } from 'lucide-react';

// Numéro WhatsApp de Socrate. Par défaut : le numéro d'essai Twilio (bac à sable),
// remplaçable dans Vercel par le numéro officiel sans toucher au code.
const WA = process.env.NEXT_PUBLIC_TUTOR_WHATSAPP_NUMBER || '+14155238886';
// Message d'activation exigé par le numéro d'essai (vide = numéro officiel, pas d'activation).
const WA_JOIN =
  process.env.NEXT_PUBLIC_TUTOR_WHATSAPP_JOIN ?? (process.env.NEXT_PUBLIC_TUTOR_WHATSAPP_NUMBER ? '' : 'join film-leader');
const SMS = process.env.NEXT_PUBLIC_TUTOR_SMS_NUMBER;

const waLink = (text: string) => `https://wa.me/${WA.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;

/** Carte « Socrate sur WhatsApp » : toujours visible dans l'application. */
export default function TutorMessageCard({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`bg-card border border-border/80 rounded-2xl ${compact ? 'p-4' : 'p-5'} shadow-soft-sm space-y-3`}>
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
          <MessageCircle className="w-4 h-4" />
        </div>
        <div>
          <h3 className="font-bold text-foreground text-sm">Socrate sur WhatsApp</h3>
          <p className="text-xs text-muted-foreground">Posez vos questions par message, avec très peu de données.</p>
        </div>
      </div>

      <ol className="text-xs text-muted-foreground space-y-1 list-decimal pl-4">
        <li>Ajoutez votre numéro (avec l'indicatif du pays) dans <a href="/profile" className="text-primary font-semibold">Mon Profil</a>.</li>
        {WA_JOIN && <li>La toute première fois, touchez <strong>« Activer »</strong> puis envoyez le message prérempli.</li>}
        <li>Touchez <strong>« Écrire à Socrate »</strong> et envoyez AIDE. Écrivez « SEMAINE 2 » pour choisir la semaine.</li>
      </ol>

      <div className="flex flex-wrap gap-2">
        {WA_JOIN && (
          <a href={waLink(WA_JOIN)} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-emerald-600/40 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
            <KeyRound className="w-3.5 h-3.5" /> 1. Activer (1re fois)
          </a>
        )}
        <a href={waLink('AIDE')} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold">
          <MessageCircle className="w-3.5 h-3.5" /> {WA_JOIN ? '2. ' : ''}Écrire à Socrate
        </a>
        {SMS && (
          <a href={`sms:${SMS}?body=AIDE`} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold">
            <MessageSquare className="w-3.5 h-3.5" /> SMS
          </a>
        )}
      </div>
    </div>
  );
}
