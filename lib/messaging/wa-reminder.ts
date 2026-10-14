import { prisma } from '@/lib/prisma';

// Rappel « join » du bac à sable Twilio : envoyé 48 h après la connexion, avant l'expiration à 72 h.
// Variables : TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_SANDBOX_JOIN (ex. « join sable-tigre »),
// TWILIO_WHATSAPP_FROM (défaut whatsapp:+14155238886).
export const WA_EXPIRY_H = 72;
export const WA_REMIND_H = 48;

export function sandboxNumber() {
  return (process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886').replace('whatsapp:', '');
}
export function joinLink() {
  const join = process.env.TWILIO_SANDBOX_JOIN || '';
  return `https://wa.me/${sandboxNumber().replace(/\D/g, '')}?text=${encodeURIComponent(join)}`;
}

async function sendWhatsApp(to: string, text: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) throw new Error('TWILIO_ACCOUNT_SID ou TWILIO_AUTH_TOKEN manquant');
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: { Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ From: `whatsapp:${sandboxNumber()}`, To: `whatsapp:${to}`, Body: text }),
  });
  if (!res.ok) throw new Error(`Twilio ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

export async function runWaReminders() {
  if (!process.env.TWILIO_SANDBOX_JOIN) return { sent: 0, errors: ['TWILIO_SANDBOX_JOIN non configuré'] };
  const now = Date.now();
  const users = await prisma.user.findMany({
    where: {
      waJoinedAt: { lte: new Date(now - WA_REMIND_H * 3600_000), gt: new Date(now - WA_EXPIRY_H * 3600_000) },
      phone: { not: null },
    },
    select: { id: true, firstName: true, name: true, phone: true, dialCode: true, waJoinedAt: true, waRemindedAt: true },
  });
  let sent = 0;
  const errors: string[] = [];
  for (const u of users) {
    if (u.waRemindedAt && u.waJoinedAt && u.waRemindedAt >= u.waJoinedAt) continue; // déjà rappelé pour cette connexion
    const raw = String(u.phone).replace(/[^\d+]/g, '');
    const to = raw.startsWith('+') ? raw : `${u.dialCode ? String(u.dialCode).replace(/[^\d+]/g, '') : '+'}${raw.replace(/^0+/, '')}`;
    const prenom = u.firstName || (u.name || '').split(' ')[0] || '';
    const text =
      `Bonjour ${prenom} 👋 Pour continuer à parler avec moi sur WhatsApp, touchez ce lien puis appuyez sur Envoyer :\n👉 ${joinLink()}\n\n— Socrate, SavoirIA`;
    try {
      await sendWhatsApp(to, text);
      await prisma.user.update({ where: { id: u.id }, data: { waRemindedAt: new Date() } });
      sent++;
    } catch (e: any) {
      errors.push(`${u.id}: ${e?.message || e}`);
    }
  }
  return { sent, errors };
}
