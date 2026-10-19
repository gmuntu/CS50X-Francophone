export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { createHmac, timingSafeEqual } from 'crypto';
import { NextRequest, after } from 'next/server';
import { handleIncoming } from '@/lib/messaging/handle-message';
import { sendWhatsAppText, markRead } from '@/lib/messaging/meta-whatsapp';
import { clip, waFormat } from '@/lib/messaging/sms-text';

// Webhook WhatsApp Cloud API (Meta) : Socrate répond aux élèves sur le numéro officiel SavoirIA.
// Variables : WHATSAPP_VERIFY_TOKEN (mot choisi, à recopier dans Meta), WHATSAPP_APP_SECRET (clé secrète de l'app),
// WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID.
const WA_MAX = 1500;
const seen = new Set<string>(); // évite de répondre deux fois si Meta renvoie le même message

// Vérification initiale demandée par Meta lors de la configuration du webhook.
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  if (p.get('hub.mode') === 'subscribe' && p.get('hub.verify_token') && p.get('hub.verify_token') === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(p.get('hub.challenge') ?? '', { status: 200 });
  }
  return new Response('Interdit', { status: 403 });
}

function validSignature(raw: string, header: string | null) {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret) return true; // à configurer en production
  if (!header?.startsWith('sha256=')) return false;
  const expected = 'sha256=' + createHmac('sha256', secret).update(raw, 'utf8').digest('hex');
  const a = Buffer.from(header), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!validSignature(raw, req.headers.get('x-hub-signature-256'))) return new Response('Signature invalide', { status: 403 });
  let data: any = {};
  try { data = JSON.parse(raw); } catch { return new Response('ok'); }

  const messages: any[] = (data?.entry ?? []).flatMap((e: any) => (e?.changes ?? []).flatMap((c: any) => c?.value?.messages ?? []));
  // On répond tout de suite 200 à Meta, et Socrate travaille ensuite.
  after(async () => {
    for (const m of messages) {
      if (!m?.id || seen.has(m.id)) continue;
      seen.add(m.id);
      if (seen.size > 500) seen.clear();
      const from = String(m.from || '');
      await markRead(m.id);
      const text = m.type === 'text' ? String(m.text?.body || '') : '';
      try {
        const answer = text
          ? await handleIncoming({ from: '+' + from, body: text, channel: 'whatsapp', maxChars: WA_MAX })
          : "Je ne lis que les messages ecrits pour l'instant. Ecrivez votre question, ou AIDE.";
        await sendWhatsAppText(from, clip(waFormat(answer), WA_MAX));
      } catch (e) {
        console.error('WhatsApp Meta :', e);
      }
    }
  });
  return new Response('ok', { status: 200 });
}
