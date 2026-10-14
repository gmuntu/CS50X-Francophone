// Envoi d'un fichier vers Vercel Blob par l'API REST (sans dépendance).
// Nécessite la variable BLOB_READ_WRITE_TOKEN (créée en activant Blob dans Vercel → Storage).
export async function uploadBlob(pathname: string, body: ArrayBuffer, contentType: string): Promise<string> {
  const token = process.env.VOIX_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error("Stockage audio non configuré (VOIX_READ_WRITE_TOKEN).");
  const res = await fetch(`https://blob.vercel-storage.com/?pathname=${encodeURIComponent(pathname)}`, {
    method: 'PUT',
    headers: {
      authorization: `Bearer ${token}`,
      'x-api-version': '11',
      'x-vercel-blob-access': 'public',
      'x-add-random-suffix': '1',
      'x-content-type': contentType,
    },
    body,
  });
  const d = await res.json().catch(() => ({}));
  if (!res.ok || !d?.url) throw new Error(d?.error?.message || "L'enregistrement audio n'a pas pu être sauvegardé.");
  return d.url as string;
}

// Suppression (au mieux) d'un fichier Vercel Blob.
export async function deleteBlob(url: string) {
  const token = process.env.VOIX_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN;
  if (!token || !url) return;
  await fetch('https://blob.vercel-storage.com/delete', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'x-api-version': '11', 'content-type': 'application/json' },
    body: JSON.stringify({ urls: [url] }),
  }).catch(() => {});
}
