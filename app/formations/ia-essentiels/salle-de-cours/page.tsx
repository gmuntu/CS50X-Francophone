import { redirect } from 'next/navigation';
import { exigerFormation } from '@/lib/acces-formation';
import { IA_SLUG, IA_WEEKS } from '@/lib/courses/ia-essentiels';
import { passedWeeks } from '@/lib/courses/progress';

export const dynamic = 'force-dynamic';

/** Salle de cours de « L'essentiel de l'IA » : ouvre la semaine où l'élève en est (la première non réussie). */
export default async function SalleDeCoursIa() {
  const session = await exigerFormation('ia-essentiels');
  const reussies = await passedWeeks((session.user as any).id, IA_SLUG);
  const pretes = IA_WEEKS.filter((w) => w.ready);
  const enCours = pretes.find((w) => !reussies.has(w.n)) ?? pretes[pretes.length - 1];
  redirect(enCours ? `/formations/ia-essentiels/semaine/${enCours.n}` : '/formations/ia-essentiels');
}
