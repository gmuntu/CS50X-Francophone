import { auth } from '@/auth';
import { relaisDisponible } from '@/lib/approfondir/relais-poste';

export const dynamic = 'force-dynamic';

/** « Envoyer un PDF » et « Coller mes notes » sont-ils utilisables ici et maintenant ? */
export async function GET() {
  const session = await auth();
  if (!session?.user) return Response.json({ disponible: false }, { status: 401 });
  const disponible = process.env.SAVOIRIA_LOCAL === '1' ? await relaisDisponible() : !!process.env.GEMINI_API_KEY;
  return Response.json({ disponible }, { headers: { 'Cache-Control': 'no-store' } });
}
