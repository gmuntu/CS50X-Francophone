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

/** Crée un jeton Live à usage unique. Réponse prête à renvoyer au navigateur (jeton + modèle, ou erreur). */
export async function reponseJetonLive(key: string): Promise<Response> {
  const model = await pickLiveModel(key).catch(() => null);
  if (!model) {
    return Response.json({ error: 'Aucun modèle Live disponible pour cette clé Gemini' }, { status: 502 });
  }
  const now = Date.now();
  try {
    const res = await fetch('https://generativelanguage.googleapis.com/v1alpha/auth_tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        uses: 1,
        expireTime: new Date(now + 30 * 60_000).toISOString(),
        newSessionExpireTime: new Date(now + 2 * 60_000).toISOString(),
      }),
    });
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
