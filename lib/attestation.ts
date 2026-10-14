import { prisma } from '@/lib/prisma';
import { COURSE_TITLE } from '@/lib/courses/final-project';

// Données d'une attestation : seulement pour un projet VALIDÉ.
export async function getAttestation(id: string) {
  const p = await prisma.finalProject.findUnique({ where: { id } });
  if (!p || p.status !== 'VALIDATED') return null;
  const u = await prisma.user.findUnique({ where: { id: p.userId }, select: { name: true, firstName: true, lastName: true, email: true } });
  const name = ([u?.firstName, u?.lastName].filter(Boolean).join(' ') || u?.name || u?.email || 'Étudiant').trim();
  const title = (p.prompt.split(/[\n.:]/)[0] || '').trim().slice(0, 90);
  return {
    id: p.id,
    userId: p.userId,
    name,
    course: COURSE_TITLE[p.courseSlug] ?? p.courseSlug,
    projectTitle: title,
    score: p.defenseScore,
    date: (p.reviewedAt ?? p.updatedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
    code: p.id.slice(-10).toUpperCase(),
  };
}
