// « Approfondir le sujet » : analyse d'un PDF ou de notes par gemini-3.8-flash.
// Utilisé par /api/approfondir/analyser (élève en ligne) et /api/poste/approfondir (ordinateur d'école relayé).
import { validerContenu } from '@/lib/approfondir/types';
import { texteDocument } from '@/lib/approfondir/document';

/**
 * « Approfondir le sujet » : découpe un PDF ou des notes de l'élève en notions, avec gemini-3.8-flash.
 * La clé Gemini reste sur le serveur. Rien n'est enregistré : le résultat repart vers le navigateur.
 * Un ordinateur d'école n'a pas de clé Gemini : il relaie l'analyse vers le site en ligne.
 */
const MODELE = 'gemini-3.8-flash';
const PDF_MAX = 4 * 1024 * 1024; // Vercel refuse les envois de plus de 4,5 Mo
const NOTES_MAX = 60_000;
const PAGES_MAX = 50; // coût : Gemini facture chaque page lue

/** Nombre de pages d'un PDF (objets « /Type /Page » et compteur « /Count »), sans bibliothèque. */
function pagesPdf(octets: Buffer): number {
  const texte = octets.toString('latin1');
  const objets = texte.match(/\/Type\s*\/Page(?![a-zA-Z])/g)?.length ?? 0;
  const compteurs = [...texte.matchAll(/\/Count\s+(\d+)/g)].map((m) => Number(m[1]));
  return Math.max(objets, ...compteurs, 0);
}

const CONSIGNE = `Tu prépares une leçon « Approfondir le sujet » en français pour des élèves débutants (cours CS50 en français).
À partir du document fourni, extrais de 3 à 8 notions clés à comprendre, dans l'ordre du document.
Pour chaque notion :
- "page" : le numéro de page d'origine pour un PDF (ex. "p. 4"), la diapositive pour un PowerPoint (repères [DIAPO n], ex. "diapo 3"), sinon "notes" ;
- "resume" : UNE seule phrase simple ;
- "schema" : choisis "cycle" (étapes qui se répètent), "etapes" (suite ordonnée), "comparaison" (2 ou 3 colonnes) ou "relations" (liens entre idées) ; remplis "etapes", "colonnes" ou "liens" en conséquence, avec 3 à 6 éléments courts ;
- "differences" : seulement si deux idées proches sont faciles à confondre (2 titres, 2 à 5 lignes critère / a / b) ;
- "passages" : 1 à 3 courts passages du document qui aident à comprendre, reformulés en français, avec leur page ;
- "infographie" : un titre et 3 à 5 points courts, chacun avec un émoji.
Tout en français, sans inventer ce qui n'est pas dans le document. Utilise "documentId": "doc-eleve".`;

const SCHEMA_REPONSE = {
  type: 'OBJECT',
  properties: {
    sujet: { type: 'STRING' },
    resume: { type: 'STRING' },
    notions: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          id: { type: 'STRING' }, titre: { type: 'STRING' }, resume: { type: 'STRING' }, page: { type: 'STRING' },
          documentId: { type: 'STRING' },
          schema: {
            type: 'OBJECT',
            properties: {
              type: { type: 'STRING', enum: ['cycle', 'etapes', 'comparaison', 'relations'] },
              etapes: { type: 'ARRAY', items: { type: 'OBJECT', properties: { titre: { type: 'STRING' }, texte: { type: 'STRING' } } } },
              colonnes: { type: 'ARRAY', items: { type: 'OBJECT', properties: { titre: { type: 'STRING' }, points: { type: 'ARRAY', items: { type: 'STRING' } } } } },
              liens: { type: 'ARRAY', items: { type: 'OBJECT', properties: { de: { type: 'STRING' }, vers: { type: 'STRING' }, label: { type: 'STRING' } } } },
            },
            required: ['type'],
          },
          differences: {
            type: 'OBJECT',
            properties: {
              titres: { type: 'ARRAY', items: { type: 'STRING' } },
              lignes: { type: 'ARRAY', items: { type: 'OBJECT', properties: { critere: { type: 'STRING' }, a: { type: 'STRING' }, b: { type: 'STRING' } } } },
            },
          },
          passages: { type: 'ARRAY', items: { type: 'OBJECT', properties: { texte: { type: 'STRING' }, documentId: { type: 'STRING' }, page: { type: 'STRING' } } } },
          infographie: {
            type: 'OBJECT',
            properties: {
              titre: { type: 'STRING' },
              points: { type: 'ARRAY', items: { type: 'OBJECT', properties: { icone: { type: 'STRING' }, texte: { type: 'STRING' } } } },
            },
          },
        },
        required: ['titre', 'resume', 'page', 'schema'],
      },
    },
  },
  required: ['sujet', 'resume', 'notions'],
};

export const erreur = (message: string, status: number) => Response.json({ error: message }, { status });

/**
 * Lit le formulaire (PDF ou notes), vérifie taille, type et nombre de pages, puis appelle Gemini.
 * avantAppel() est lancé juste avant l'appel payant (quota) : il renvoie une réponse pour bloquer.
 */
export async function analyserFormulaire(request: Request, avantAppel: () => Promise<Response | null>): Promise<Response> {
  const longueur = Number(request.headers.get('content-length') ?? 0);
  if (longueur > PDF_MAX + 100_000) return erreur('Le PDF dépasse 4 Mo.', 413);

  let form: FormData;
  try { form = await request.formData(); } catch { return erreur('Envoi illisible.', 400); }
  const fichier = form.get('fichier') ?? form.get('pdf');
  const notes = String(form.get('notes') ?? '').trim();

  const parts: Record<string, unknown>[] = [{ text: CONSIGNE }];
  let nomDocument = 'Mes notes';
  const estFichier = fichier instanceof File && fichier.size > 0;
  if (estFichier && (fichier as File).size > PDF_MAX) return erreur('Le fichier dépasse 4 Mo.', 413);
  if (!estFichier && notes.length < 40) return erreur('Envoyez un PDF ou collez au moins quelques phrases de notes.', 400);
  // Limite du jour vérifiée AVANT de lire le fichier : un envoi piégé répété est vite bloqué.
  { const bloque = await avantAppel(); if (bloque) return bloque; }
  const octets = estFichier ? Buffer.from(await (fichier as File).arrayBuffer()) : null;
  // Word, PowerPoint ou texte : on en extrait le texte, puis il est étudié comme des notes.
  const texteExtrait = octets && octets.subarray(0, 4).toString('latin1') !== '%PDF' ? texteDocument((fichier as File).name, octets) : null;
  if (octets && octets.subarray(0, 4).toString('latin1') !== '%PDF' && !texteExtrait) {
    return erreur('Format non pris en charge : envoyez un PDF, un Word (.docx), un PowerPoint (.pptx) ou un texte (.txt).', 415);
  }
  if (texteExtrait) {
    if (texteExtrait.trim().length < 40) return erreur("Ce document ne contient presque pas de texte.", 422);
    parts.push({ text: `--- DOCUMENT DE L'ÉLÈVE : ${(fichier as File).name.slice(0, 120)} ---\n${texteExtrait}` });
    nomDocument = (fichier as File).name.slice(0, 120);
  } else if (octets && fichier instanceof File) {
    // Vrai PDF seulement (signature « %PDF »), quel que soit le nom du fichier.
    if (pagesPdf(octets) > PAGES_MAX) return erreur(`Le PDF dépasse ${PAGES_MAX} pages : envoyez seulement le chapitre utile.`, 413);
    parts.push({ inlineData: { mimeType: 'application/pdf', data: octets.toString('base64') } });
    nomDocument = fichier.name.slice(0, 120) || 'Mon PDF';
  } else if (notes.length >= 40) {
    parts.push({ text: `--- NOTES DE L'ÉLÈVE ---\n${notes.slice(0, NOTES_MAX)}` });
  } else {
    return erreur('Envoyez un PDF ou collez au moins quelques phrases de notes.', 400);
  }

  const cle = process.env.GEMINI_API_KEY;
  if (!cle) return erreur('Service indisponible pour le moment.', 503);

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODELE}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': cle },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 8192, responseMimeType: 'application/json', responseSchema: SCHEMA_REPONSE },
      }),
      signal: AbortSignal.timeout(55_000),
    });
    if (!res.ok) {
      console.error('approfondir/analyser', res.status, (await res.text()).slice(0, 300));
      return erreur("L'analyse n'a pas abouti. Réessayez dans un instant.", 502);
    }
    const data = await res.json();
    const texte = data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text ?? '').join('') ?? '';
    let brut: any;
    try { brut = JSON.parse(texte); } catch { return erreur("L'analyse n'a pas abouti. Réessayez.", 502); }
    const contenu = validerContenu({
      ...brut,
      semaine: undefined,
      documents: [{ id: 'doc-eleve', titre: nomDocument, url: '', auteur: 'Vous', licence: 'Document personnel' }],
    });
    if (!contenu) return erreur("Aucune notion n'a pu être extraite de ce document.", 422);
    return Response.json(contenu);
  } catch (e) {
    console.error('approfondir/analyser', e);
    return erreur("L'analyse n'a pas abouti. Réessayez dans un instant.", 502);
  }
}
