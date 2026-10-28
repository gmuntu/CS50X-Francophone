export const dynamic = 'force-dynamic';
export const maxDuration = 300;

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { uploadBlob, deleteBlob, estPrive } from '@/lib/blob';
import { faceList } from '@/lib/identity';

// Une seule fois : déplace les photos et voix déjà enregistrées du magasin public vers le magasin privé.
// Réservé à l'administrateur. Peut être relancé sans risque (les fichiers déjà privés sont ignorés).
let aSupprimer: string[] = [];
async function deplacer(url: string | null | undefined): Promise<string | null | undefined> {
  if (!url || estPrive(url)) return url;
  const r = await fetch(url);
  if (!r.ok) return url;
  const nom = new URL(url).pathname.slice(1).replace(/-[A-Za-z0-9]{20,}(\.[a-z0-9]+)$/, '$1');
  const nouveau = await uploadBlob(nom, await r.arrayBuffer(), r.headers.get('content-type') || 'application/octet-stream');
  aSupprimer.push(url); // supprimé seulement après la mise à jour de la base
  return nouveau;
}

export async function POST() {
  const session = await auth();
  const me = session?.user?.id ? await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } }) : null;
  if (me?.role !== 'ADMIN') return Response.json({ error: 'Interdit' }, { status: 403 });
  if (!process.env.PRIVE_READ_WRITE_TOKEN) return Response.json({ error: 'PRIVE_READ_WRITE_TOKEN manquant sur Vercel.' }, { status: 400 });

  let fichiers = 0;
  const vider = async () => { for (const u of aSupprimer) await deleteBlob(u); aSupprimer = []; };
  for (const p of await prisma.identityProfile.findMany()) {
    const faces = [];
    for (const u of faceList(p.faceUrls)) faces.push((await deplacer(u)) as string);
    const voiceUrl = (await deplacer(p.voiceUrl)) as string;
    await prisma.identityProfile.update({ where: { id: p.id }, data: { faceUrls: faces, voiceUrl } });
    await vider();
    fichiers += faces.length + 1;
  }
  const projets = await prisma.finalProject.findMany({
    select: { id: true, voiceRefUrl: true, voiceDefenseUrl: true, examFaceUrls: true },
  });
  for (const p of projets) {
    const exam = [];
    for (const u of faceList(p.examFaceUrls)) exam.push((await deplacer(u)) as string);
    await prisma.finalProject.update({
      where: { id: p.id },
      data: { voiceRefUrl: await deplacer(p.voiceRefUrl), voiceDefenseUrl: await deplacer(p.voiceDefenseUrl), ...(exam.length ? { examFaceUrls: exam } : {}) },
    });
    await vider();
    fichiers += exam.length + (p.voiceRefUrl ? 1 : 0) + (p.voiceDefenseUrl ? 1 : 0);
  }
  return new Response(`<p style="font-family:sans-serif">✅ Terminé : ${fichiers} fichier(s) sont maintenant privés.</p>`, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

// Page avec un seul bouton, pour lancer le déplacement depuis le navigateur.
export async function GET() {
  return new Response(`<!doctype html><meta charset="utf-8"><body style="font-family:sans-serif;padding:2rem">
<h2>Rendre privées les photos et les voix</h2><p>À faire une seule fois, connecté en administrateur.</p>
<form method="post"><button style="background:#1d4ed8;color:#fff;border:0;padding:12px 20px;border-radius:8px;font-size:16px">Lancer</button></form></body>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
