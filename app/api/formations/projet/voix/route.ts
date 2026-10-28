import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { uploadBlob, deleteBlob } from '@/lib/blob';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX = 4_300_000; // limite d'envoi Vercel ≈ 4,5 Mo

// Empreinte vocale : enregistrement de référence (kind=reference) ou voix de la défense (kind=defense).
const AUDIO_OK = ['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/aac', 'audio/mpeg', 'audio/wav'];

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Non connecté' }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const course = String(form?.get('course') || '');
  const kind = String(form?.get('kind') || '');
  const audio = form?.get('audio');
  if (!['reference', 'defense'].includes(kind) || !(audio instanceof Blob)) return NextResponse.json({ error: 'Requête invalide' }, { status: 400 });
  if (audio.size < 2000) return NextResponse.json({ error: 'Enregistrement trop court ou vide.' }, { status: 400 });
  if (audio.size > MAX) return NextResponse.json({ error: 'Enregistrement trop long.' }, { status: 413 });

  const project = await prisma.finalProject.findUnique({ where: { userId_courseSlug: { userId, courseSlug: course } } });
  if (!project) return NextResponse.json({ error: "Déposez d'abord votre projet." }, { status: 400 });
  if (project.status === 'VALIDATED') return NextResponse.json({ error: 'Projet déjà validé.' }, { status: 400 });
  if (kind === 'reference' && form?.get('consent') !== 'true') return NextResponse.json({ error: 'Le consentement est obligatoire.' }, { status: 400 });
  if (kind === 'defense' && !(await prisma.identityProfile.findUnique({ where: { userId } }))) return NextResponse.json({ error: "Créez d'abord votre empreinte SavoirIA." }, { status: 400 });

  const type = (audio.type || 'audio/webm').split(';')[0];
  if (!AUDIO_OK.includes(type)) return NextResponse.json({ error: 'Format audio non accepté.' }, { status: 400 });
  const ext = type.includes('mp4') || type.includes('aac') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm';
  try {
    const url = await uploadBlob(`voix/${course}/${userId}-${kind}.${ext}`, await audio.arrayBuffer(), type);
    await prisma.finalProject.update({
      where: { id: project.id },
      data: kind === 'reference'
        ? { voiceRefUrl: url, voiceConsentAt: new Date() }
        : { voiceDefenseUrl: url, voiceMatch: null },
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('[voix]', e);
    return NextResponse.json({ error: "L'enregistrement a échoué. Réessayez." }, { status: 500 });
  }
}

// Effacer l'empreinte pour recommencer : seulement avant la défense (étape 2).
export async function DELETE(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Non connecté' }, { status: 401 });
  const course = new URL(req.url).searchParams.get('course') || '';
  const project = await prisma.finalProject.findUnique({ where: { userId_courseSlug: { userId, courseSlug: course } } });
  if (!project) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 });
  if (!['SUBMITTED', 'REDO'].includes(project.status)) {
    return NextResponse.json({ error: "La défense est terminée : l'empreinte ne peut plus être changée." }, { status: 400 });
  }
  if (project.voiceRefUrl) await deleteBlob(project.voiceRefUrl);
  await prisma.finalProject.update({ where: { id: project.id }, data: { voiceRefUrl: null, voiceConsentAt: null } });
  return NextResponse.json({ ok: true });
}
