/**
 * Contexte d'une leçon pour le tuteur, quelle que soit la formation. Côté serveur.
 * Même porte d'entrée pour le site et pour le tuteur WhatsApp : (formation, leçon) -> texte de référence.
 */
import { CS50_MODULES } from '@/config/course-modules';
import { prisma } from '@/lib/prisma';
import { getIaWeek, iaWeekContext } from '@/lib/courses/ia-essentiels';

export async function contexteLecon(formation: string | null | undefined, lecon: number | null | undefined): Promise<string> {
  if (lecon === null || lecon === undefined || !Number.isInteger(lecon)) return '';
  if (formation === 'ia-essentiels') {
    const w = getIaWeek(lecon);
    return w ? `\nFormation : L'essentiel de l'IA. Semaine ${lecon} : ${w.title}.\n${iaWeekContext(lecon).slice(0, 1500)}` : '';
  }
  const mod = CS50_MODULES.find((m: any) => m?.id === lecon);
  if (!mod) return '';
  let texte = `\nFormation : CS50x. Semaine ${mod.id} : ${mod.title}. Sujets : ${mod.topics?.join(', ')}.`;
  try {
    const s = await prisma.videoSummary.findUnique({ where: { lessonId: mod.id } });
    if (s) texte += `\nRésumé du cours (référence) : ${String(s.overview).slice(0, 1500)}`;
  } catch {}
  return texte;
}
