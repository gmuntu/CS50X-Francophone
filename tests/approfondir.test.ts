// « Approfondir le sujet » : vérification des cours préparés, interrupteur, route d'analyse des documents.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const { session, quota } = vi.hoisted(() => ({
  session: { valeur: null as null | { user: { id: string; role?: string } } },
  quota: { bloque: null as Response | null },
}));
vi.mock('@/auth', () => ({ auth: async () => session.valeur }));
vi.mock('@/lib/quota', () => ({ quotaIA: async () => quota.bloque }));

import { contexteTuteur, validerContenu } from '@/lib/approfondir/types';
import { contenuSemaine, salleActive } from '@/lib/approfondir/contenus';
import { POST as analyser } from '@/app/api/approfondir/analyser/route';

const exemple = {
  semaine: 0,
  sujet: 'Le binaire',
  resume: 'Comment un ordinateur représente tout avec des 0 et des 1.',
  documents: [
    { id: 'wp', titre: 'Système binaire', url: 'https://fr.wikipedia.org/wiki/Syst%C3%A8me_binaire', auteur: 'Contributeurs Wikipédia', licence: 'CC BY-SA 4.0' },
    { id: 'piege', titre: 'Lien piégé', url: 'javascript:alert(1)', auteur: 'x', licence: 'CC0' },
  ],
  notions: [{
    id: 'bit', titre: 'Le bit', resume: 'Un bit vaut 0 ou 1.', page: '§ Définition', documentId: 'wp',
    schema: { type: 'etapes', etapes: [{ titre: 'Courant coupé', texte: '0' }, { titre: 'Courant passe', texte: '1' }] },
  }],
};

const envoi = (form: FormData) => new Request('http://localhost/api/approfondir/analyser', { method: 'POST', body: form });

beforeEach(() => { session.valeur = { user: { id: 'eleve1', role: 'STUDENT' } }; quota.bloque = null; });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('Cours préparés (content/approfondir)', () => {
  it('garde la page d’origine de chaque notion', () => {
    const c = validerContenu(exemple)!;
    expect(c.notions[0].page).toBe('§ Définition');
    expect(c.notions[0].schema.etapes).toHaveLength(2);
  });

  it('refuse les liens qui ne sont pas http(s)', () => {
    const c = validerContenu(exemple)!;
    expect(c.documents.find((d) => d.id === 'piege')!.url).toBe('');
  });

  it('un contenu sans notion est rejeté', () => {
    expect(validerContenu({ ...exemple, notions: [] })).toBeNull();
  });

  it('le tuteur ne reçoit que le résumé et la notion affichée, en taille limitée', () => {
    const c = validerContenu({ ...exemple, resume: 'x'.repeat(50_000) })!;
    const ctx = contexteTuteur(c, c.notions[0]);
    expect(ctx).toContain('Sujet : Le binaire');
    expect(ctx.length).toBeLessThanOrEqual(6000);
  });

  it('chaque fichier semaine-N.json est valide, avec titre, auteur et licence pour chaque document', () => {
    const dossier = path.join(process.cwd(), 'content', 'approfondir');
    for (const f of readdirSync(dossier).filter((x) => /^semaine-\d+\.json$/.test(x))) {
      const brut = JSON.parse(readFileSync(path.join(dossier, f), 'utf8'));
      const c = validerContenu(brut);
      expect(c, f).not.toBeNull();
      for (const d of c!.documents) {
        expect(d.titre && d.auteur && d.licence && d.url, `${f} : ${d.id}`).toBeTruthy();
      }
      for (const n of c!.notions) expect(n.page, `${f} : ${n.id}`).toBeTruthy();
      expect(contenuSemaine(brut.semaine), f).not.toBeNull(); // bien importé dans lib/approfondir/contenus.ts
    }
  });
});

describe('Interrupteur SALLE_APPROFONDIR', () => {
  it('par défaut : Approfondir le sujet', () => {
    vi.stubEnv('SALLE_APPROFONDIR', '');
    expect(salleActive()).toBe('approfondir');
  });
  it('« notebooklm » réaffiche NotebookLM', () => {
    vi.stubEnv('SALLE_APPROFONDIR', 'NotebookLM');
    expect(salleActive()).toBe('notebooklm');
  });
});

describe('Analyse d’un PDF ou de notes', () => {
  it('pas connecté : refusé', async () => {
    session.valeur = null;
    expect((await analyser(envoi(new FormData()))).status).toBe(401);
  });

  it('ordinateur d’école sans Internet : « Disponible avec Internet »', async () => {
    vi.stubEnv('SAVOIRIA_LOCAL', '1');
    const r = await analyser(envoi(new FormData()));
    expect(r.status).toBe(503);
    expect((await r.json()).error).toBe('Disponible avec Internet');
  });

  it('un faux PDF est refusé', async () => {
    const f = new FormData();
    f.append('pdf', new File(['<html>pas un pdf</html>'], 'cours.pdf', { type: 'application/pdf' }));
    expect((await analyser(envoi(f))).status).toBe(415);
  });

  it('un PDF de plus de 4 Mo est refusé', async () => {
    const f = new FormData();
    f.append('pdf', new File([new Uint8Array(4 * 1024 * 1024 + 10)], 'gros.pdf', { type: 'application/pdf' }));
    expect((await analyser(envoi(f))).status).toBe(413);
  });

  it('limite du jour atteinte : Gemini n’est pas appelé', async () => {
    quota.bloque = new Response('{}', { status: 429 });
    const appel = vi.fn();
    vi.stubGlobal('fetch', appel);
    const f = new FormData();
    f.append('notes', 'Le binaire utilise deux chiffres, 0 et 1, pour représenter toute information.');
    expect((await analyser(envoi(f))).status).toBe(429);
    expect(appel).not.toHaveBeenCalled();
  });

  it('des notes sont découpées en notions avec gemini-3.8-flash, la clé dans un en-tête', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'cle-de-test');
    const appel = vi.fn(async (..._args: [string, RequestInit]) => Response.json({
      candidates: [{ content: { parts: [{ text: JSON.stringify({ sujet: 'Binaire', resume: 'R', notions: exemple.notions }) }] } }],
    }));
    vi.stubGlobal('fetch', appel);
    const f = new FormData();
    f.append('notes', 'Le binaire utilise deux chiffres, 0 et 1, pour représenter toute information.');
    const r = await analyser(envoi(f));
    expect(r.status).toBe(200);
    const c = await r.json();
    expect(c.notions[0].titre).toBe('Le bit');
    expect(c.documents[0].licence).toBe('Document personnel');
    const [url, init] = appel.mock.calls[0];
    expect(url).toContain('gemini-3.8-flash:generateContent');
    expect(url).not.toContain('cle-de-test');
    expect((init.headers as Record<string, string>)['x-goog-api-key']).toBe('cle-de-test');
  });
});
