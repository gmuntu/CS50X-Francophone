export const dynamic = 'force-dynamic';
export const maxDuration = 20;

import { createHmac, timingSafeEqual } from 'crypto';
import { NextRequest } from 'next/server';
import { handleIncoming } from '@/lib/messaging/handle-message';
import { clip, plain, toGsm, waFormat } from '@/lib/messaging/sms-text';

// Webhook Twilio : reçoit les SMS et les messages WhatsApp des élèves et répond avec le tuteur.
// Variables d'environnement : TWILIO_AUTH_TOKEN (obligatoire), TWILIO_WEBHOOK_URL (adresse publique exacte de ce webhook),
// SMS_DAILY_LIMIT (défaut 15), WHATSAPP_DAILY_LIMIT (défaut 40).

const SMS_MAX = 300; // 2 SMS maximum par réponse
const WA_MAX = 1500; // WhatsApp : explications complètes (limite technique : 1600)

const xml = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]!));
const twiml = (text: string) =>
  new Response(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${xml(text)}</Message></Response>`, {
    headers: { 'Content-Type': 'text/xml; charset=utf-8' },
  });

function validSignature(req: NextRequest, params: URLSearchParams, token: string) {
  const sig = req.headers.get('x-twilio-signature') ?? '';
  const url =
    process.env.TWILIO_WEBHOOK_URL ||
    `${req.headers.get('x-forwarded-proto') ?? 'https'}://${req.headers.get('x-forwarded-host') ?? req.headers.get('host')}${req.nextUrl.pathname}`;
  const data = [...params.keys()].sort().reduce((acc, k) => acc + k + (params.get(k) ?? ''), url);
  const expected = createHmac('sha1', token).update(data, 'utf8').digest('base64');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!token) return new Response('Service non configuré', { status: 503 });

  const params = new URLSearchParams(await req.text());
  if (!validSignature(req, params, token)) return new Response('Signature invalide', { status: 403 });

  const from = params.get('From') ?? '';
  const body = (params.get('Body') ?? '').trim();
  const channel: 'sms' | 'whatsapp' = from.startsWith('whatsapp:') ? 'whatsapp' : 'sms';
  const max = channel === 'sms' ? SMS_MAX : WA_MAX;
  const out = (t: string) => twiml(channel === 'sms' ? toGsm(clip(plain(t), max)) : clip(waFormat(t), max));

  const text = await handleIncoming({ from, body, channel, maxChars: max, sandbox: true });
  return out(text);
}
