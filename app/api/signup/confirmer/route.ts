export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { confirmerInscription } from '@/lib/inscription-confirmation';
import { tropDEssais } from '@/lib/quota';
import { adresseIP } from '@/lib/securite';

/** Clic sur « Confirmer mon inscription » : crée le compte « en attente » si le lien est bon et encore valable. */
export async function POST(request: Request) {
  try {
    // Anti-robots : 30 essais de lien par heure et par adresse IP.
    if (await tropDEssais('confirmation-inscription', adresseIP(request), 30)) {
      return NextResponse.json({ resultat: 'trop', error: 'Trop d\'essais. Réessayez dans une heure.' }, { status: 429 });
    }
    const { jeton } = (await request.json().catch(() => ({}))) ?? {};
    const resultat = await confirmerInscription(typeof jeton === 'string' ? jeton : '');
    return NextResponse.json({ resultat }, { status: resultat === 'ok' ? 200 : 400 });
  } catch (error) {
    console.error('Confirmation inscription error:', error);
    return NextResponse.json({ resultat: 'erreur', error: 'Une erreur technique est survenue. Réessayez dans un instant.' }, { status: 500 });
  }
}
