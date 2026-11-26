// Jeton éphémère Gemini Live (usage unique, quelques minutes) : la vraie clé GEMINI_API_KEY reste
// sur le serveur. Partagé par /api/live-token (élève en ligne) et /api/poste/live-token (ordinateur d'école).

/**
 * Choisit automatiquement un modèle Live réellement disponible pour cette clé :
 * on demande la liste à Google (ListModels) et on garde ceux qui acceptent
 * bidiGenerateContent. GEMINI_LIVE_MODEL est utilisé seulement s'il est dans la liste.
 */
let cached: { model: string; at: number } | null = null;

export async function pickLiveModel(key: string): Promise<string | null> {
  if (cached && Date.now() - cached.at < 3_600_000) return cached.model;
  const res = await fetch('https://generativelanguage.googleapis.com/v1alpha/models?pageSize=1000', {
    headers: { 'x-goog-api-key': key },
  });
  if (!res.ok) return null;
  const data = await res.json().catch(() => ({}));
  const live: string[] = (data?.models ?? [])
    .filter((m: any) => (m?.supportedGenerationMethods ?? []).includes('bidiGenerateContent'))
    .map((m: any) => String(m.name).replace(/^models\//, ''));
  console.log('Modèles Live disponibles :', live.join(', '));
  if (!live.length) return null;

  const wanted = process.env.GEMINI_LIVE_MODEL?.trim().replace(/^models\//, '');
  const score = (n: string) =>
    (n.includes('live') ? 4 : 0) + (n.includes('native-audio') ? 2 : 0) + (n.includes('flash') ? 1 : 0)
    - (n.includes('exp') ? 1 : 0) + (parseFloat(n.match(/gemini-(\d+(?:\.\d+)?)/)?.[1] ?? '0') / 10);
  const model = wanted && live.includes(wanted) ? wanted : [...live].sort((a, b) => score(b) - score(a))[0];
  cached = { model, at: Date.now() };
  return model;
}

/**
 * Corps de la demande de jeton : usage unique, 15 minutes au plus, verrouillé sur le modèle choisi ici
 * et sur la réponse en audio (format REST v1alpha de /auth_tokens : bidiGenerateContentSetup + fieldMask,
 * ce que produit le SDK Google à partir de « liveConnectConstraints »). Le navigateur ne peut donc pas
 * s'en servir avec un autre modèle.
 * La consigne (systemInstruction) n'est volontairement PAS verrouillée : hooks/useGeminiLive.ts envoie la
 * sienne, avec le contenu de la leçon, dans son propre message « setup » ; la verrouiller ici (vide)
 * casserait le tuteur vocal. Le fieldMask limite donc le verrou aux champs donnés ici (le modèle est
 * toujours verrouillé). Aucun outil n'est déclaré, ni ici ni dans le setup du navigateur.
 */
export function corpsJetonLive(model: string, now = Date.now(), verrouille = true) {
  return {
    uses: 1,
    expireTime: new Date(now + 15 * 60_000).toISOString(),
    newSessionExpireTime: new Date(now + 2 * 60_000).toISOString(),
    ...(verrouille ? {
      bidiGenerateContentSetup: {
        model: `models/${model}`,
        generationConfig: { responseModalities: ['AUDIO'] },
      },
      fieldMask: 'generationConfig.responseModalities',
    } : {}),
  };
}

/** Crée un jeton Live à usage unique. Réponse prête à renvoyer au navigateur (jeton + modèle, ou erreur). */
export async function reponseJetonLive(key: string): Promise<Response> {
  const model = await pickLiveModel(key).catch(() => null);
  if (!model) {
    return Response.json({ error: 'Aucun modèle Live disponible pour cette clé Gemini' }, { status: 502 });
  }
  const now = Date.now();
  const demander = (verrouille: boolean) => fetch('https://generativelanguage.googleapis.com/v1alpha/auth_tokens', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify(corpsJetonLive(model, now, verrouille)),
  });
  try {
    let res = await demander(true);
    // Verrou refusé par Google (format changé) : on ne casse pas le tuteur vocal, on le signale dans les journaux.
    if (res.status === 400) {
      console.warn('live-token : verrou refusé par Google, jeton NON verrouillé', (await res.text().catch(() => '')).slice(0, 300));
      res = await demander(false);
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.name) {
      console.error('live-token error', res.status, JSON.stringify(data).slice(0, 300));
      return Response.json({ error: 'Jeton Live indisponible' }, { status: 502 });
    }
    return Response.json({ token: data.name, model });
  } catch (e) {
    console.error('live-token fetch failed', e);
    return Response.json({ error: 'Jeton Live indisponible' }, { status: 502 });
  }
}
