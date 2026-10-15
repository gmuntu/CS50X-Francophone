import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { uploadBlob } from '@/lib/blob';
import { faceList } from '@/lib/identity';

export const dynamic = 'force-dynamic';

// Photo du visage prise pendant l'examen oral (avant le début + 3 au hasard).
export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Non connecté' }, { status: 401 });
  const form = await req.formData().catch(() => null);
  const course = String(form?.get('course') || '');
  const photo = form?.get('photo');
  if (!(photo instanceof Blob) || photo.size < 3000 || photo.size > 1_500_000) return NextResponse.json({ error: 'Photo invalide' }, { status: 400 });
  const project = await prisma.finalProject.findUnique({ where: { userId_courseSlug: { userId, courseSlug: course } } });
  if (!project || !['SUBMITTED', 'REDO'].includes(project.status)) return NextResponse.json({ error: 'Aucun examen en cours' }, { status: 400 });
  const list = form?.get('first') === 'true' ? [] : faceList(project.examFaceUrls); // nouvelle défense = nouvelles photos
  if (list.length >= 12) return NextResponse.json({ ok: true });
  try {
    const url = await uploadBlob(`examen/${course}/${userId}-${Date.now()}.jpg`, await photo.arrayBuffer(), 'image/jpeg');
    await prisma.finalProject.update({ where: { id: project.id }, data: { examFaceUrls: [...list, url] } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erreur' }, { status: 500 });
  }
}
