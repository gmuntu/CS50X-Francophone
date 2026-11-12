export const dynamic = 'force-dynamic';

import { NextResponse, after } from 'next/server';
import { confirmerInscription, hacherJeton, menageDossiersExpires } from '@/lib/inscription-confirmation';
import { tropDEssais } from '@/lib/quota';
import { adresseIP } from '@/lib/securite';

/** Clic sur « Confirmer mon inscription » : crée le compte « en attente » si le lien est bon et encore valable. */
export async function POST(request: Request) {
  try {
    // Anti-robots : 30 essais de lien par heure et par adresse IP.
    if (await tropDEssais('confirmation-inscription', adresseIP(request), 30)) {
      return NextResponse.json({ resultat: 'trop', error: 'Trop d\'essais. Réessayez dans une heure.' }, { status: 429 });
    }
    const { jeton, motDePasse } = (await request.json().catch(() => ({}))) ?? {};
    const j = typeof jeton === 'string' ? jeton : '';
    // 10 essais de mot de passe par heure pour un même lien.
    if (j && (await tropDEssais('confirmation-mdp', hacherJeton(j).slice(0, 32), 10))) {
      return NextResponse.json({ resultat: 'trop', error: 'Trop d\'essais. Réessayez dans une heure.' }, { status: 429 });
    }
    const resultat = await confirmerInscription(j, typeof motDePasse === 'string' ? motDePasse : '');
    after(() => menageDossiersExpires());
    return NextResponse.json({ resultat }, { status: resultat === 'ok' ? 200 : 400 });
  } catch (error) {
    console.error('Confirmation inscription error:', error);
    return NextResponse.json({ resultat: 'erreur', error: 'Une erreur technique est survenue. Réessayez dans un instant.' }, { status: 500 });
  }
}
