// Choix du moteur de Socrate (Auto / Gemini / Gemma local) et relais de l'ordinateur d'école
// vers le site en ligne avec la clé de poste (aucune clé Gemini sur les ordinateurs).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { session, quota } = vi.hoisted(() => ({
  session: { valeur: null as null | { user: { id: string; role?: string } } },
  quota: { bloque: null as Response | null, depasse: false, cles: [] as { cle: string; limite: number }[] },
}));
vi.mock('@/auth', () => ({ auth: async () => session.valeur }));
vi.mock('@/lib/quota', () => ({
  quotaIA: async () => quota.bloque,
  depasse: async (cle: string, limite: number) => { quota.cles.push({ cle, limite }); return quota.depasse; },
}));
// Fausse base des postes : « poste_ok » est actif ; « poste_revoque » a été désactivé dans l'admin
// (posteDeLaRequete renvoie alors null, comme pour une clé inconnue).
vi.mock('@/lib/poste-ecole', () => ({
  ENTETE_POSTE: 'x-savoiria-poste',
  posteDeLaRequete: async (r: Request) => (r.headers.get('x-savoiria-poste') === 'poste_ok' ? { id: 'p1' } : null),
}));
vi.mock('@/lib/tuteur-contexte', () => ({ systemeTuteur: async () => 'CONSIGNES DU TUTEUR' }));
vi.mock('@/lib/acces-formation', () => ({ refusSiPasInscrit: async () => null }));

import { POST as tuteur } from '@/app/api/tutor/route';
import { POST as posteTuteur } from '@/app/api/poste/tuteur/route';
import { GET as posteLiveVerifie, POST as posteLive } from '@/app/api/poste/live-token/route';
import { POST as jetonLive } from '@/app/api/live-token/route';
import { oublierEchecRelais } from '@/lib/relais-poste-ia';
import { CONSIGNE_SOCRATE_VOCAL, CONSIGNE_SOCRATE_VOCAL_LOCAL, REPONSE_VOCALE_COURTE } from '@/lib/socrate-vocal';

const CLE_POSTE = 'poste_cle_secrete_de_test';
const enc = new TextEncoder();

const fluxGeminiSSE = (texte: string) => new Response(new ReadableStream({
  start(c) {
    c.enqueue(enc.encode(`data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text: texte }] } }] })}\n\n`));
    c.close();
  },
}), { status: 200 });

const fluxOpenAI = (texte: string) => new Response(new ReadableStream({
  start(c) {
    c.enqueue(enc.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: texte } }] })}\n\n`));
    c.enqueue(enc.encode('data: [DONE]\n\n'));
    c.close();
  },
}), { status: 200, headers: { 'X-Savoiria-Moteur': 'gemini' } });

type Appel = { url: string; init?: RequestInit };
let appels: Appel[] = [];
/** Faux réseau : Google (détourné vers Gemma sur le poste) et le site en ligne. */
function reseau(siteEnLigne: (init?: RequestInit) => Response | Promise<Response>) {
  appels = [];
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    appels.push({ url: String(url), init });
    if (String(url).includes('generativelanguage.googleapis.com')) return fluxGeminiSSE('Réponse Gemma');
    if (String(url).startsWith('https://www.savoiria.online/')) return siteEnLigne(init);
    throw new Error(`adresse inattendue : ${url}`);
  }));
}
const appelsGoogle = () => appels.filter((a) => a.url.includes('generativelanguage'));
const appelsSite = () => appels.filter((a) => a.url.includes('savoiria.online'));

const historique = [
  { role: 'user', content: 'Bonjour' },
  { role: 'assistant', content: 'Bonjour ! Que veux-tu comprendre ?' },
  { role: 'user', content: "C'est quoi une boucle ?" },
];
const demande = (corps: Record<string, unknown>) => tuteur(new Request('http://localhost/api/tutor', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ moduleId: 1, messages: historique, ...corps }),
}) as any);

/** Texte de la réponse en flux (format OpenAI). */
async function texte(r: Response) {
  const brut = await r.text();
  return brut.split('\n').filter((l) => l.startsWith('data: ') && !l.includes('[DONE]'))
    .map((l) => JSON.parse(l.slice(6))?.choices?.[0]?.delta?.content ?? '').join('');
}

beforeEach(() => {
  session.valeur = { user: { id: 'eleve1', role: 'STUDENT' } };
  quota.bloque = null; quota.depasse = false; quota.cles = [];
  oublierEchecRelais();
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('Ordinateur d’école : moteur Auto', () => {
  beforeEach(() => {
    vi.stubEnv('SAVOIRIA_LOCAL', '1');
    vi.stubEnv('GEMINI_API_KEY', 'local');
    vi.stubEnv('POSTE_CLE', CLE_POSTE);
  });

  it('le site en ligne répond vite : Gemini (en-tête X-Savoiria-Moteur)', async () => {
    reseau(() => fluxOpenAI('Réponse Gemini'));
    const r = await demande({ moteur: 'auto' });
    expect(r.status).toBe(200);
    expect(r.headers.get('X-Savoiria-Moteur')).toBe('gemini');
    expect(await texte(r)).toBe('Réponse Gemini');
    expect(appelsGoogle()).toHaveLength(0);
  });

  it('la clé de poste part en en-tête, jamais dans l’adresse, et ne revient pas au navigateur', async () => {
    reseau(() => fluxOpenAI('Réponse Gemini'));
    const r = await demande({ moteur: 'auto' });
    const a = appelsSite()[0];
    expect(a.url).toBe('https://www.savoiria.online/api/poste/tuteur');
    expect(a.url).not.toContain(CLE_POSTE);
    expect((a.init?.headers as Record<string, string>)['x-savoiria-poste']).toBe(CLE_POSTE);
    expect(String(a.init?.body)).not.toContain(CLE_POSTE);
    const entetes = JSON.stringify([...r.headers.entries()]);
    expect(entetes).not.toContain(CLE_POSTE);
    expect(await r.text()).not.toContain(CLE_POSTE);
  });

  it('la conversation transmise est la même, quel que soit le moteur', async () => {
    reseau(() => fluxOpenAI('ok'));
    await demande({ moteur: 'auto' });
    const envoye = JSON.parse(String(appelsSite()[0].init?.body));
    expect(envoye.messages).toEqual(historique);
    expect(envoye.systeme).toBe('CONSIGNES DU TUTEUR');
    // Même conversation pour Gemma
    reseau(() => fluxOpenAI('ok'));
    await demande({ moteur: 'gemma' });
    const g = JSON.parse(String(appelsGoogle()[0].init?.body));
    expect(g.contents.map((c: any) => c.parts[0].text)).toEqual(historique.map((m) => m.content));
  });

  it('le site en ligne se tait plus de 5 s : Gemma répond', async () => {
    vi.useFakeTimers();
    reseau((init) => new Promise<Response>((_, ko) => {
      init?.signal?.addEventListener('abort', () => ko(new DOMException('arrêt', 'AbortError')));
    }));
    const p = demande({ moteur: 'auto' });
    await vi.advanceTimersByTimeAsync(5_001);
    const r = await p;
    expect(r.headers.get('X-Savoiria-Moteur')).toBe('gemma4:e2b');
    expect(await texte(r)).toBe('Réponse Gemma');
  });

  it('en-têtes reçus mais aucun mot en 5 s : Gemma répond', async () => {
    vi.useFakeTimers();
    reseau((init) => new Response(new ReadableStream({
      start(c) { init?.signal?.addEventListener('abort', () => c.error(new DOMException('arrêt', 'AbortError'))); },
    }), { status: 200 }));
    const p = demande({ moteur: 'auto' });
    await vi.advanceTimersByTimeAsync(5_001);
    const r = await p;
    expect(r.headers.get('X-Savoiria-Moteur')).toBe('gemma4:e2b');
  });

  it.each([500, 429])('le site en ligne répond %i : Gemma répond', async (status) => {
    reseau(() => Response.json({ error: 'non' }, { status }));
    const r = await demande({ moteur: 'auto' });
    expect(r.status).toBe(200);
    expect(r.headers.get('X-Savoiria-Moteur')).toBe('gemma4:e2b');
  });

  it('hors ligne : Gemma, sans aucun appel au site en ligne', async () => {
    reseau(() => fluxOpenAI('ne doit pas servir'));
    const r = await demande({ moteur: 'auto', horsLigne: true });
    expect(r.headers.get('X-Savoiria-Moteur')).toBe('gemma4:e2b');
    expect(appelsSite()).toHaveLength(0);
  });

  it('pas de clé de poste : Gemma, sans appel au site en ligne', async () => {
    vi.stubEnv('POSTE_CLE', '');
    reseau(() => fluxOpenAI('ne doit pas servir'));
    const r = await demande({ moteur: 'auto' });
    expect(r.headers.get('X-Savoiria-Moteur')).toBe('gemma4:e2b');
    expect(appelsSite()).toHaveLength(0);
  });
});

describe('Ordinateur d’école : moteurs forcés', () => {
  beforeEach(() => {
    vi.stubEnv('SAVOIRIA_LOCAL', '1');
    vi.stubEnv('GEMINI_API_KEY', 'local');
    vi.stubEnv('POSTE_CLE', CLE_POSTE);
  });

  it('Gemini forcé et indisponible : message clair, pas de repli sur Gemma', async () => {
    reseau(() => Response.json({ error: 'Poste inconnu ou désactivé' }, { status: 401 }));
    const r = await demande({ moteur: 'gemini' });
    expect(r.status).toBe(503);
    expect((await r.json()).error).toMatch(/^Gemini indisponible : /);
    expect(appelsGoogle()).toHaveLength(0);
  });

  it('Gemini forcé hors ligne : message clair, aucun appel réseau', async () => {
    reseau(() => fluxOpenAI('x'));
    const r = await demande({ moteur: 'gemini', horsLigne: true });
    expect(r.status).toBe(503);
    expect((await r.json()).error).toContain('pas de connexion Internet');
    expect(appels).toHaveLength(0);
  });

  it('Gemma forcé : jamais le site en ligne', async () => {
    reseau(() => fluxOpenAI('x'));
    const r = await demande({ moteur: 'gemma' });
    expect(r.headers.get('X-Savoiria-Moteur')).toBe('gemma4:e2b');
    expect(appelsSite()).toHaveLength(0);
  });

  it('réponse vocale sur Gemma : jetons plafonnés ; réponse écrite inchangée', async () => {
    reseau(() => fluxOpenAI('x'));
    await demande({ moteur: 'gemma', voix: true, bureau: true });
    expect(JSON.parse(String(appelsGoogle()[0].init?.body)).generationConfig.maxOutputTokens).toBe(160);
    reseau(() => fluxOpenAI('x'));
    await demande({ moteur: 'gemma' });
    expect(JSON.parse(String(appelsGoogle()[0].init?.body)).generationConfig.maxOutputTokens).toBe(2048);
  });

  it('sans champ moteur : chemin historique (pas de relais, pas d’en-tête)', async () => {
    reseau(() => fluxOpenAI('ne doit pas servir'));
    const r = await demande({});
    expect(r.headers.get('X-Savoiria-Moteur')).toBeNull();
    expect(appelsSite()).toHaveLength(0);
    expect(await texte(r)).toBe('Réponse Gemma');
  });
});

describe('Site en ligne (pas d’ordinateur d’école)', () => {
  beforeEach(() => { vi.stubEnv('GEMINI_API_KEY', 'cle-serveur'); });

  it('Gemma demandé : 503 clair', async () => {
    reseau(() => fluxOpenAI('x'));
    const r = await demande({ moteur: 'gemma' });
    expect(r.status).toBe(503);
    expect((await r.json()).error).toContain("n'est disponible que sur l'ordinateur SavoirIA");
    expect(appels).toHaveLength(0);
  });

  it('moteur inconnu : refusé', async () => {
    reseau(() => fluxOpenAI('x'));
    const r = await demande({ moteur: 'gpt-5' });
    expect(r.status).toBe(400);
    expect(appels).toHaveLength(0);
  });

  it('Auto : Gemini comme d’habitude, avec l’en-tête du moteur', async () => {
    reseau(() => fluxOpenAI('x'));
    const r = await demande({ moteur: 'auto' });
    expect(r.headers.get('X-Savoiria-Moteur')).toBe('gemini');
    expect(appelsGoogle()[0].url).toContain('gemini-3.6-flash:streamGenerateContent');
  });

  it('sans champ moteur : chemin historique inchangé', async () => {
    reseau(() => fluxOpenAI('x'));
    const r = await demande({});
    expect(r.status).toBe(200);
    expect(r.headers.get('X-Savoiria-Moteur')).toBeNull();
    expect(appelsGoogle()[0].url).toContain('gemini-3.6-flash:streamGenerateContent');
    expect(await texte(r)).toBe('Réponse Gemma'); // (faux Google de ce test)
  });

  it('l’élève non connecté est refusé, quel que soit le moteur', async () => {
    session.valeur = null;
    reseau(() => fluxOpenAI('x'));
    expect((await demande({ moteur: 'auto' })).status).toBe(401);
  });

  it('le quota de l’élève s’applique aussi avec un moteur choisi', async () => {
    quota.bloque = new Response('{}', { status: 429 });
    reseau(() => fluxOpenAI('x'));
    expect((await demande({ moteur: 'gemini' })).status).toBe(429);
  });
});

describe('Route en ligne /api/poste/tuteur', () => {
  beforeEach(() => { vi.stubEnv('GEMINI_API_KEY', 'cle-serveur'); });
  const relais = (cle: string | null, corps: Record<string, unknown> = { systeme: 'CONSIGNE', messages: historique }) =>
    posteTuteur(new Request('http://localhost/api/poste/tuteur', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(cle ? { 'x-savoiria-poste': cle } : {}) },
      body: JSON.stringify(corps),
    }));

  it('clé absente, inconnue ou révoquée : 401, sans appel à Gemini', async () => {
    reseau(() => fluxOpenAI('x'));
    for (const cle of [null, 'poste_faux', 'poste_revoque']) expect((await relais(cle)).status).toBe(401);
    expect(appels).toHaveLength(0);
  });

  it('limite par appareil dépassée : 429 clair', async () => {
    quota.depasse = true;
    reseau(() => fluxOpenAI('x'));
    const r = await relais('poste_ok');
    expect(r.status).toBe(429);
    expect((await r.json()).error).toContain('Limite du jour');
    expect(quota.cles[0].cle).toMatch(/^ia:tutor-poste:p1:/);
    expect(quota.cles[0].limite).toBe(1500);
    expect(appels).toHaveLength(0);
  });

  it('limite réglable par POSTE_TUTEUR_PAR_JOUR', async () => {
    vi.stubEnv('POSTE_TUTEUR_PAR_JOUR', '42');
    reseau(() => fluxOpenAI('x'));
    await relais('poste_ok');
    expect(quota.cles[0].limite).toBe(42);
  });

  it('le poste ne peut choisir ni le modèle ni l’adresse ; flux au format OpenAI', async () => {
    reseau(() => fluxOpenAI('x'));
    const r = await relais('poste_ok', { systeme: 'CONSIGNE', messages: historique, modele: 'gemini-ultra', model: 'x', url: 'https://pirate.example' });
    expect(r.status).toBe(200);
    expect(r.headers.get('X-Savoiria-Moteur')).toBe('gemini');
    expect(appels).toHaveLength(1);
    expect(appels[0].url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:streamGenerateContent?alt=sse');
    expect((appels[0].init?.headers as Record<string, string>)['x-goog-api-key']).toBe('cle-serveur');
    expect(await texte(r)).toBe('Réponse Gemma');
  });

  it('consigne et messages bornés (30 derniers messages)', async () => {
    reseau(() => fluxOpenAI('x'));
    const beaucoup = Array.from({ length: 50 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: `m${i} ${'x'.repeat(20_000)}` }));
    await relais('poste_ok', { systeme: 'C'.repeat(100_000), messages: beaucoup });
    const g = JSON.parse(String(appels[0].init?.body));
    expect(g.systemInstruction.parts[0].text.length).toBeLessThanOrEqual(20_000);
    expect(g.contents.length).toBeLessThanOrEqual(30);
    expect(g.contents[0].parts[0].text.startsWith('m20 ')).toBe(true);
  });
});

describe('Route en ligne /api/poste/live-token', () => {
  beforeEach(() => { vi.stubEnv('GEMINI_API_KEY', 'cle-serveur'); });
  const req = (cle: string | null, method = 'POST') => new Request('http://localhost/api/poste/live-token', {
    method, headers: cle ? { 'x-savoiria-poste': cle } : {},
  });

  it('clé invalide : 401 ; vérification sans jeton consommé', async () => {
    reseau(() => fluxOpenAI('x'));
    expect((await posteLive(req('poste_faux'))).status).toBe(401);
    expect((await posteLiveVerifie(req('poste_ok', 'GET'))).status).toBe(200);
    expect(appels).toHaveLength(0);
  });

  it('limite par appareil dépassée : 429', async () => {
    quota.depasse = true;
    reseau(() => fluxOpenAI('x'));
    expect((await posteLive(req('poste_ok'))).status).toBe(429);
    expect(quota.cles[0].cle).toMatch(/^ia:live-poste:p1:/);
  });
});

describe('Ordinateur d’école : /api/live-token relaie vers le site en ligne', () => {
  it('jeton demandé avec la clé de poste en en-tête ; aucune clé Gemini sur le poste', async () => {
    vi.stubEnv('SAVOIRIA_LOCAL', '1');
    vi.stubEnv('GEMINI_API_KEY', 'local');
    vi.stubEnv('POSTE_CLE', CLE_POSTE);
    reseau(() => Response.json({ token: 'auth_tokens/abc', model: 'gemini-live' }));
    const r = await jetonLive();
    expect(await r.json()).toEqual({ token: 'auth_tokens/abc', model: 'gemini-live' });
    expect(appels).toHaveLength(1);
    expect(appels[0].url).toBe('https://www.savoiria.online/api/poste/live-token');
    expect((appels[0].init?.headers as Record<string, string>)['x-savoiria-poste']).toBe(CLE_POSTE);
  });

  it('site en ligne en panne : erreur (le tuteur vocal passe alors au tour par tour local)', async () => {
    vi.stubEnv('SAVOIRIA_LOCAL', '1');
    vi.stubEnv('POSTE_CLE', CLE_POSTE);
    reseau(() => Response.json({ error: 'Limite du jour atteinte' }, { status: 429 }));
    const r = await jetonLive();
    expect(r.status).toBe(429);
  });
});

describe('Consignes vocales', () => {
  it('la variante vocale locale demande 2 à 3 phrases ; la consigne en ligne (Live) ne change pas', () => {
    expect(REPONSE_VOCALE_COURTE).toMatch(/2 ou 3 phrases/);
    expect(CONSIGNE_SOCRATE_VOCAL_LOCAL).toContain(REPONSE_VOCALE_COURTE);
    expect(CONSIGNE_SOCRATE_VOCAL).not.toContain(REPONSE_VOCALE_COURTE);
  });
});

describe('IA locale (lib/local-ai.ts)', () => {
  it('ne détourne pas les appels vers le site en ligne', async () => {
    const vrai = vi.fn(async () => new Response('ok'));
    vi.stubGlobal('fetch', vrai);
    const g = globalThis as any;
    const { activerIALocale } = await import('@/lib/local-ai');
    try {
      activerIALocale();
      const r = await fetch('https://www.savoiria.online/api/poste/tuteur', { method: 'POST', body: '{}' });
      expect(await r.text()).toBe('ok');
      expect((vrai.mock.calls as any[]).some((c) => String(c[0]) === 'https://www.savoiria.online/api/poste/tuteur')).toBe(true);
    } finally {
      delete g.__savoiriaLocal; delete g.__savoiriaFetchOriginal;
    }
  });
});
