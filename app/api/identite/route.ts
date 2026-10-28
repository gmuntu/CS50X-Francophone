import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { uploadBlob, deleteBlob } from '@/lib/blob';
import { faceList } from '@/lib/identity';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Non connecté' }, { status: 401 });
  const p = await prisma.identityProfile.findUnique({ where: { userId: session.user.id } });
  return NextResponse.json({ profile: p ? { createdAt: p.createdAt, resetAllowed: p.resetAllowed } : null });
}

// Création de l'empreinte : 3 photos (face, tête tournée, sourire) + voix. Verrouillée ensuite.
const AUDIO_OK = ['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/aac', 'audio/mpeg', 'audio/wav'];

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Non connecté' }, { status: 401 });
  const existing = await prisma.identityProfile.findUnique({ where: { userId } });
  if (existing && !existing.resetAllowed) return NextResponse.json({ error: 'Votre empreinte est déjà créée et verrouillée.' }, { status: 400 });

  const form = await req.formData().catch(() => null);
  if (form?.get('consent') !== 'true') return NextResponse.json({ error: 'Le consentement est obligatoire.' }, { status: 400 });
  const faces = [0, 1, 2].map((i) => form?.get(`face${i}`));
  const voice = form?.get('voice');
  if (faces.some((f) => !(f instanceof Blob) || (f as Blob).size < 3000 || (f as Blob).size > 1_500_000)) return NextResponse.json({ error: 'Photos manquantes.' }, { status: 400 });
  if (!(voice instanceof Blob) || voice.size < 2000) return NextResponse.json({ error: 'Enregistrement de la voix manquant.' }, { status: 400 });
  if (voice.size > 3_000_000) return NextResponse.json({ error: 'Enregistrement trop long.' }, { status: 413 });

  try {
    const faceUrls: string[] = [];
    for (let i = 0; i < 3; i++) faceUrls.push(await uploadBlob(`identite/${userId}-face${i}.jpg`, await (faces[i] as Blob).arrayBuffer(), 'image/jpeg'));
    const vtype = (voice.type || 'audio/webm').split(';')[0];
    if (!AUDIO_OK.includes(vtype)) return NextResponse.json({ error: 'Format audio non accepté.' }, { status: 400 });
    const voiceUrl = await uploadBlob(`identite/${userId}-voix.${vtype.includes('mp4') ? 'm4a' : 'webm'}`, await voice.arrayBuffer(), vtype);
    if (existing) for (const u of [...faceList(existing.faceUrls), existing.voiceUrl]) await deleteBlob(u);
    await prisma.identityProfile.upsert({
      where: { userId },
      update: { consentAt: new Date(), faceUrls, voiceUrl, resetAllowed: false },
      create: { userId, consentAt: new Date(), faceUrls, voiceUrl },
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('[identite]', e);
    return NextResponse.json({ error: "L'enregistrement a échoué. Réessayez." }, { status: 500 });
  }
}
