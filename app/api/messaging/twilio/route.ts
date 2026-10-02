export const dynamic = 'force-dynamic';
export const maxDuration = 20;

import { createHmac, timingSafeEqual } from 'crypto';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CS50_MODULES } from '@/config/course-modules';
import { findUserByPhone } from '@/lib/messaging/phone';
import { tutorReply, type HistoryMsg } from '@/lib/messaging/tutor-reply';
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

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();

const HELP =
  "Savoiria - Tuteur Socrate. Ecrivez simplement votre question sur le cours CS50.\n" +
  "SEMAINE 3 : choisir la semaine (0 a 10)\nNOUVEAU : recommencer la discussion\nAIDE : ce message";

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

  const user = await findUserByPhone(from.replace('whatsapp:', ''));
  if (!user) {
    return out(
      "Bonjour ! Ce numero n'est relie a aucun compte Savoiria. Connectez-vous une fois sur le site et indiquez ce numero dans votre profil, puis reecrivez-nous."
    );
  }
  if (user.status !== 'ACTIVE') {
    return out("Votre compte Savoiria est en attente de validation. Le tuteur sera disponible des son activation.");
  }

  const cmd = norm(body);
  if (!cmd || cmd === 'aide' || cmd === 'help' || cmd === 'menu') return out(HELP);

  // Discussion par message : une conversation par élève et par semaine, marquée par le canal.
  const convs = await prisma.conversation.findMany({ where: { userId: user.id }, orderBy: { updatedAt: 'desc' }, take: 30 });
  const isMsgConv = (c: any) => Array.isArray(c.messages) && c.messages.some((m: any) => m?.channel === 'sms' || m?.channel === 'whatsapp');
  let conv = convs.find(isMsgConv) ?? null;

  const weekCmd = /^(semaine|sem|s|week)\s*(\d{1,2})$/.exec(cmd);
  if (weekCmd || cmd === 'nouveau' || cmd === 'reset') {
    const week = weekCmd ? Number(weekCmd[2]) : conv?.lessonId ?? 1;
    const mod = CS50_MODULES.find((m: any) => m?.id === week);
    const lesson = mod ? await prisma.lesson.findUnique({ where: { id: week }, select: { id: true } }) : null;
    if (!mod || !lesson) return out('Semaine inconnue. Ecrivez par exemple : SEMAINE 1 (de 0 a 10).');
    const marker: HistoryMsg = { role: 'assistant', content: `Semaine ${week} : ${mod.title}`, at: new Date().toISOString(), channel };
    await prisma.conversation.create({ data: { userId: user.id, lessonId: week, messages: [marker] as any } });
    return out(`C'est note : semaine ${week}, ${mod.title}. Posez votre question !`);
  }

  // Limite quotidienne (maîtrise des coûts).
  const limit = Number(channel === 'sms' ? process.env.SMS_DAILY_LIMIT || 15 : process.env.WHATSAPP_DAILY_LIMIT || 40);
  const since = Date.now() - 24 * 3600_000;
  const today = convs
    .filter(isMsgConv)
    .flatMap((c: any) => c.messages as any[])
    .filter((m) => m?.role === 'user' && m?.channel === channel && Date.parse(m?.at) > since).length;
  if (today >= limit) {
    return out(`Vous avez atteint la limite de ${limit} questions par jour par ${channel === 'sms' ? 'SMS' : 'WhatsApp'}. A demain ! Le tuteur reste illimite sur le site.`);
  }

  if (!conv) {
    const first = await prisma.lesson.findFirst({ where: { id: { gte: 1 } }, orderBy: { id: 'asc' }, select: { id: true } });
    if (first) conv = await prisma.conversation.create({ data: { userId: user.id, lessonId: first.id, messages: [] as any } });
  }
  const history = ((conv?.messages as any[]) ?? []).filter((m) => m?.role && m?.content) as HistoryMsg[];

  let answer: string;
  try {
    answer = await tutorReply({ question: body.slice(0, 1000), week: conv?.lessonId ?? null, history, channel, maxChars: max - 100 });
    if (!answer) throw new Error('vide');
  } catch (e) {
    console.error('Tuteur message error:', e);
    return out('Le tuteur est momentanement indisponible. Reessayez dans quelques minutes.');
  }

  if (conv) {
    const now = new Date().toISOString();
    const messages = [...history, { role: 'user', content: body.slice(0, 1000), at: now, channel }, { role: 'assistant', content: answer, at: now, channel }].slice(-40);
    await prisma.conversation.update({ where: { id: conv.id }, data: { messages: messages as any } }).catch(() => {});
  }

  return out(answer);
}
