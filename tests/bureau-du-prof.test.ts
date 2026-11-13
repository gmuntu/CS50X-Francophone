import { describe, it, expect, vi, beforeEach } from 'vitest';

const resume = {
  title: 'Semaine 1 — C',
  overview: 'Découverte du langage C.',
  timelineBreakdown: [
    { timestamp: '00:05:10', title: 'Hello, world', description: 'Premier programme.' },
    { timestamp: '00:42:00', title: 'Boucles', description: 'while et for.' },
  ],
  keyConcepts: [{ term: 'boucle', definition: 'répète des instructions' }],
  pedagogicalTakeaway: 'À retenir.',
};
vi.mock('@/lib/prisma', () => ({ prisma: { videoSummary: { findUnique: vi.fn(async () => resume) } } }));
vi.mock('@/lib/content-generator', () => ({ readCourseSource: () => 'NOTES DE COURS' }));

import { CONSIGNE_SOCRATE_VOCAL, CONSIGNE_SOCRATE_VOCAL_LOCAL, LECON_VOCALE_MAX, leconVocale } from '@/lib/socrate-vocal';
import { MEMOIRE_MAX, creerDetecteurDeSilence, memoriser } from '@/lib/conversation-locale';
import { CS50_MODULES } from '@/config/course-modules';

const charger = async (local: boolean) => {
  vi.resetModules();
  vi.stubEnv('SAVOIRIA_LOCAL', local ? '1' : '0');
  return (await import('@/lib/tuteur-contexte')).systemeTuteur;
};
beforeEach(() => vi.unstubAllEnvs());

describe('Demande au prof : même Socrate en ligne et sans Internet', () => {
  it('les deux consignes partagent la méthode, le ton, le déroulement et la règle des deux langues', () => {
    const communes = [
      'Tu es Socrate, tuteur vocal du cours CS50 en français',
      'Tu parles français par défaut',
      'le terme anglais de CS50 entre parenthèses',
      "Si l'étudiant te demande d'expliquer en anglais, explique en anglais, puis reviens au français",
      'Tu guides l\'étudiant par des questions plutôt que de donner directement les réponses.',
      "Réponds en 2 à 4 phrases maximum, puis laisse l'étudiant parler.",
      'cite les moments précis',
      'Si une question sort du cours, réponds brièvement puis ramène l\'étudiant à la leçon.',
    ];
    for (const ligne of communes) {
      expect(CONSIGNE_SOCRATE_VOCAL).toContain(ligne);
      expect(CONSIGNE_SOCRATE_VOCAL_LOCAL).toContain(ligne);
    }
    expect(CONSIGNE_SOCRATE_VOCAL).not.toMatch(/uniquement français/);
    expect(CONSIGNE_SOCRATE_VOCAL_LOCAL).toContain('pas de code, pas de liste');
  });

  it('contenu de la leçon sans Internet : titre, aperçu et chronologie, limité en longueur', () => {
    const lecon = leconVocale(resume);
    expect(lecon).toContain('Titre : Semaine 1 — C');
    expect(lecon).toContain('[00:42:00] Boucles — while et for.');
    expect(leconVocale(null)).toBe('');
    expect(leconVocale({ title: 'T', overview: 'x'.repeat(10_000) }).length).toBe(LECON_VOCALE_MAX);
  });

  it('ordinateur SavoirIA + Demande au prof : la consigne de /agora et la chronologie de la vidéo', async () => {
    const systemeTuteur = await charger(true);
    const s = await systemeTuteur({ moduleId: CS50_MODULES[1].id, voix: true, bureau: true });
    expect(s.startsWith(CONSIGNE_SOCRATE_VOCAL_LOCAL)).toBe(true);
    expect(s).toContain('--- CONTENU DE LA LEÇON ---');
    expect(s).toContain('[00:05:10] Hello, world');
    expect(s).not.toContain('Réponds TOUJOURS en français');
    expect(s).not.toContain('NOTES DE COURS');
    // Le petit modèle local reçoit en plus un exemple de dialogue socratique, après la leçon.
    expect(s.indexOf('--- MANIÈRE DE RÉPONDRE ---')).toBeGreaterThan(s.indexOf('[00:42:00] Boucles'));
    expect(s).toContain('Tu ne donnes donc jamais la définition en premier');
  });

  it('la Salle d’étude et les autres pages à voix haute gardent leur consigne habituelle', async () => {
    const systemeTuteur = await charger(true);
    const s = await systemeTuteur({ moduleId: CS50_MODULES[1].id, voix: true });
    expect(s).toContain('Réponds TOUJOURS en français');
    expect(s).not.toContain('tuteur vocal du cours CS50');
  });

  it('en ligne, le tuteur écrit ne change pas, même si « bureau » est envoyé', async () => {
    const systemeTuteur = await charger(false);
    const s = await systemeTuteur({ moduleId: CS50_MODULES[1].id, voix: true, bureau: true });
    expect(s).toContain('Réponds TOUJOURS en français');
    expect(s).toContain('NOTES DE COURS');
  });

  it('mémoire de la conversation : les derniers échanges seulement, rien si la question ou la réponse manque', () => {
    let h = memoriser([], 'Question 1', 'Réponse 1');
    expect(h).toEqual([{ role: 'user', content: 'Question 1' }, { role: 'assistant', content: 'Réponse 1' }]);
    expect(memoriser(h, '', 'Je n’ai pas bien entendu')).toBe(h);
    expect(memoriser(h, 'Question', '  ')).toBe(h);
    for (let i = 2; i <= 10; i++) h = memoriser(h, `Question ${i}`, `Réponse ${i}`);
    expect(h).toHaveLength(MEMOIRE_MAX);
    expect(h[h.length - 1].content).toBe('Réponse 10');
    expect(h[0].content).toBe('Question 5');
  });

  it('fin de parole : Socrate répond après 1,5 s de silence, et s’arrête si personne ne parle', () => {
    let t = 0;
    const mesurer = (detecteur: ReturnType<typeof creerDetecteurDeSilence>, volume: number, dureeMs: number) => {
      let verdict: string | null = null;
      for (let i = 0; i < dureeMs / 100 && !verdict; i++) { t += 100; verdict = detecteur(volume); }
      return verdict;
    };
    // L'élève parle 2 s puis se tait.
    t = 0; let d = creerDetecteurDeSilence(() => t);
    expect(mesurer(d, 0.004, 500)).toBeNull();   // bruit de la salle
    expect(mesurer(d, 0.12, 2000)).toBeNull();   // il parle
    expect(mesurer(d, 0.004, 1400)).toBeNull();  // courte pause : on attend encore
    expect(mesurer(d, 0.004, 300)).toBe('fin');
    // Une hésitation au milieu de la phrase ne coupe pas l'élève.
    t = 0; d = creerDetecteurDeSilence(() => t);
    mesurer(d, 0.004, 400); mesurer(d, 0.1, 1000);
    expect(mesurer(d, 0.004, 1000)).toBeNull();
    expect(mesurer(d, 0.1, 1000)).toBeNull();
    // Personne ne parle : arrêt après 12 s.
    t = 0; d = creerDetecteurDeSilence(() => t);
    expect(mesurer(d, 0.004, 11_900)).toBeNull();
    expect(mesurer(d, 0.004, 300)).toBe('personne');
    // Un bruit bref (porte, toux) n'est pas pris pour une question.
    t = 0; d = creerDetecteurDeSilence(() => t);
    mesurer(d, 0.004, 400); mesurer(d, 0.2, 200);
    expect(mesurer(d, 0.004, 3000)).toBeNull();
  });
});
