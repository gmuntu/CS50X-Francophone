// SavoirIA LOCAL : prépare à l'avance, avec la voix naturelle du poste (Javert et Estelle), tous les
// podcasts du cours. Chaque réplique est gardée sur le disque :
// quand l'élève clique sur « Écouter le podcast du jour », elle est rejouée aussitôt.
// Lancé en arrière-plan après l'installation et chaque mise à jour (savoiria-podcasts.service).
// Les demandes des élèves passent toujours avant : la préparation ne ralentit personne.
import { PrismaClient } from '@prisma/client';
import { repliquePodcast, texteVoixLocale } from '../lib/voix-texte';

const prisma = new PrismaClient();
const VOIX = process.env.VOIX_LOCALE_URL?.trim().replace(/\/$/, '');

async function main() {
  if (!VOIX) { console.log('Pas de voix naturelle sur ce poste : rien à préparer.'); return; }
  const scripts = await prisma.audioScript.findMany({
    orderBy: [{ lessonId: 'asc' }, { dayOfWeek: 'asc' }],
    select: { lessonId: true, dayOfWeek: true, dialogue: true },
  });
  let faites = 0;
  for (const s of scripts) {
    const lignes = (Array.isArray(s.dialogue) ? s.dialogue : []) as { speaker?: string; text?: string }[];
    const debut = Date.now();
    for (const l of lignes) {
      const texte = texteVoixLocale(repliquePodcast(String(l?.text ?? '')));
      if (!texte.trim()) continue;
      // Poste très occupé par les élèves : on patiente et on réessaie (10 fois au plus).
      let r: Response | null = null;
      for (let essai = 0; essai < 10; essai++) {
        r = await fetch(`${VOIX}/tts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          // Même voix que le site : Socrate = homme, l'étudiante = femme.
          body: JSON.stringify({ texte, voix: l?.speaker === 'Socrate' ? 'homme' : 'femme', garder: true, prepa: true }),
        }).catch(() => null);
        if (r?.status !== 503) break;
        await new Promise((ok) => setTimeout(ok, 60_000));
      }
      if (!r?.ok) { console.log(`Voix indisponible (${r?.status ?? 'pas de réponse'}) : on reprendra à la prochaine mise à jour.`); return; }
      await r.arrayBuffer();
      faites++;
    }
    console.log(`   Semaine ${s.lessonId}, ${s.dayOfWeek} : prêt (${Math.round((Date.now() - debut) / 1000)} s)`);
  }
  console.log(`Podcasts préparés : ${scripts.length} (${faites} répliques).`);
}

main().finally(() => prisma.$disconnect());
