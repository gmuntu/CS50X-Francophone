// Ordinateur d'école : il n'a pas de clé Gemini (elle pourrait y être volée).
// Avec Internet, il relaie l'analyse d'un document vers le site en ligne, identifié par sa clé de poste.
import { ENTETE_POSTE } from '@/lib/poste-ecole';
import { erreur } from './analyse';
import { validerContenu } from './types';

const SERVEUR = () => (process.env.SAVOIRIA_SERVEUR || 'https://www.savoiria.online').trim().replace(/\/$/, '');
const CLE = () => (process.env.POSTE_CLE || '').trim();
const HORS_LIGNE = 'Disponible avec Internet';

/** La clé du poste ne part jamais en clair : adresse du site en https obligatoire. */
const relaisPossible = () => !!CLE() && SERVEUR().startsWith('https://');

export async function relaisPoste(request: Request): Promise<Response> {
  if (!relaisPossible()) return erreur(HORS_LIGNE, 503);
  let form: FormData;
  try { form = await request.formData(); } catch { return erreur('Envoi illisible.', 400); }
  try {
    const r = await fetch(`${SERVEUR()}/api/poste/approfondir`, {
      method: 'POST', headers: { [ENTETE_POSTE]: CLE() }, body: form, signal: AbortSignal.timeout(65_000),
    });
    const d = await r.json().catch(() => null);
    if (!r.ok) return erreur(typeof d?.error === 'string' ? d.error.slice(0, 200) : "L'analyse n'a pas abouti.", r.status);
    // Revérifié ici aussi : le poste n'affiche que du contenu propre.
    const contenu = validerContenu(d);
    return contenu ? Response.json(contenu) : erreur("L'analyse n'a pas abouti.", 502);
  } catch {
    return erreur(HORS_LIGNE, 503);
  }
}

let memo: { ok: boolean; at: number } | null = null;

/** Le site en ligne répond-il à ce poste ? (vérifié au plus toutes les 30 secondes) */
export async function relaisDisponible(): Promise<boolean> {
  if (!relaisPossible()) return false;
  if (memo && Date.now() - memo.at < 30_000) return memo.ok;
  let ok = false;
  try {
    const r = await fetch(`${SERVEUR()}/api/poste/approfondir`, {
      headers: { [ENTETE_POSTE]: CLE() }, cache: 'no-store', signal: AbortSignal.timeout(4_000),
    });
    ok = r.ok;
  } catch {}
  memo = { ok, at: Date.now() };
  return ok;
}
