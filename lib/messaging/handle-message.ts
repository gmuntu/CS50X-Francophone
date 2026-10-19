import { prisma } from '@/lib/prisma';
import { CS50_MODULES } from '@/config/course-modules';
import { findUserByPhone } from '@/lib/messaging/phone';
import { tutorReply, type HistoryMsg } from '@/lib/messaging/tutor-reply';

// Logique commune Twilio (SMS / WhatsApp bac à sable) et Meta (WhatsApp Cloud API) :
// retrouve l'élève, gère les commandes, appelle Socrate et renvoie le texte brut de la réponse.
const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

const HELP =
  "SavoirIA - Tuteur Socrate. Ecrivez simplement votre question sur le cours CS50.\n" +
  "SEMAINE 3 : choisir la semaine (0 a 10)\nNOUVEAU : recommencer la discussion\nAIDE : ce message";

export async function handleIncoming(opts: { from: string; body: string; channel: 'sms' | 'whatsapp'; maxChars: number; sandbox?: boolean }): Promise<string> {
  const { from, channel } = opts;
  const body = opts.body.trim();
  const max = opts.maxChars;
  const out = (t: string) => t;
  const user = await findUserByPhone(from.replace('whatsapp:', ''));
  if (!user) {
    return out(
      "Bonjour ! Ce numero n'est relie a aucun compte SavoirIA. Connectez-vous une fois sur le site et indiquez ce numero dans votre profil, puis reecrivez-nous."
    );
  }
  if (user.accessExpiresAt && new Date(user.accessExpiresAt).getTime() <= Date.now()) {
    return out('Votre acces testeur SavoirIA est termine. Merci pour votre participation !');
  }
  if (user.status !== 'ACTIVE') {
    return out("Votre compte SavoirIA est en attente de validation. Le tuteur sera disponible des son activation.");
  }

  // Bac à sable WhatsApp : on note le début de la connexion (elle expire 72 h après le « join »).
  if (channel === 'whatsapp' && opts.sandbox) {
    const joined = (user as any).waJoinedAt ? new Date((user as any).waJoinedAt).getTime() : 0;
    if (!joined || Date.now() - joined > 72 * 3600_000 || /^join\s/i.test(body)) {
      await prisma.user.update({ where: { id: user.id }, data: { waJoinedAt: new Date(), waRemindedAt: null } }).catch(() => {});
    }
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
