// Stockage des fichiers sur Vercel Blob par l'API REST (sans dépendance).
//
// Données sensibles (visage, voix) : magasin PRIVÉ (variable PRIVE_READ_WRITE_TOKEN).
// Ces fichiers ne sont jamais lisibles directement : ils passent par /api/media,
// qui vérifie que c'est l'élève lui-même ou l'administration.
// Sans magasin privé configuré, on garde l'ancien magasin public (transition).

const jetonPrive = () => process.env.PRIVE_READ_WRITE_TOKEN;
const jetonPublic = () => process.env.VOIX_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN;
export const estPrive = (url: string) => /^https:\/\/[a-z0-9-]+\.private\.blob\.vercel-storage\.com\//i.test(url);

export async function uploadBlob(pathname: string, body: ArrayBuffer, contentType: string): Promise<string> {
  const prive = !!jetonPrive();
  const token = jetonPrive() || jetonPublic();
  if (!token) throw new Error('Stockage non configuré.');
  const res = await fetch(`https://blob.vercel-storage.com/?pathname=${encodeURIComponent(pathname)}`, {
    method: 'PUT',
    headers: {
      authorization: `Bearer ${token}`,
      'x-api-version': '11',
      'x-vercel-blob-access': prive ? 'private' : 'public',
      'x-add-random-suffix': '1',
      'x-content-type': contentType,
    },
    body,
  });
  const d = await res.json().catch(() => ({}));
  if (!res.ok || !d?.url) {
    console.error('[blob] envoi refusé', res.status, d?.error?.message);
    throw new Error("Le fichier n'a pas pu être enregistré.");
  }
  return d.url as string;
}

/** Lit un fichier privé (côté serveur uniquement). */
export async function lireBlobPrive(url: string): Promise<Response | null> {
  const token = jetonPrive();
  if (!token || !estPrive(url)) return null;
  const r = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
  return r.ok ? r : null;
}

// Suppression (au mieux) d'un fichier Vercel Blob, privé ou public.
export async function deleteBlob(url: string) {
  const token = estPrive(url) ? jetonPrive() : jetonPublic();
  if (!token || !url) return;
  await fetch('https://blob.vercel-storage.com/delete', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'x-api-version': '11', 'content-type': 'application/json' },
    body: JSON.stringify({ urls: [url] }),
  }).catch(() => {});
}

/** Adresse à mettre dans <img>/<audio> : les fichiers privés passent par /api/media. */
export const lienMedia = (url?: string | null) =>
  !url ? '' : estPrive(url) ? `/api/media?u=${encodeURIComponent(url)}` : url;
