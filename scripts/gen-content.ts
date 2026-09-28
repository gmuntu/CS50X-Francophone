import { prisma } from '../lib/prisma';
import { generateModuleContent, generateWeeklyAudioScripts } from '../lib/content-generator';

async function main() {
  const ids = (process.argv[2] || '0').split(',').map((s) => parseInt(s.trim(), 10));
  const withAudio = (process.argv[3] || 'audio') !== 'noaudio';
  for (const id of ids) {
    try {
      console.log(`Generating module ${id}...`);
      const g = await generateModuleContent(id);
      await prisma.videoSummary.upsert({
        where: { lessonId: id },
        update: {
          title: g.title, overview: g.overview, keyConcepts: g.keyConcepts as any,
          timelineBreakdown: g.timelineBreakdown as any, codeExamples: g.codeExamples as any,
          pedagogicalTakeaway: g.pedagogicalTakeaway, fullMarkdown: g.fullMarkdown,
        },
        create: {
          lessonId: id, title: g.title, overview: g.overview, keyConcepts: g.keyConcepts as any,
          timelineBreakdown: g.timelineBreakdown as any, codeExamples: g.codeExamples as any,
          pedagogicalTakeaway: g.pedagogicalTakeaway, fullMarkdown: g.fullMarkdown,
        },
      });
      console.log(`  ✓ résumé module ${id}: ${g.keyConcepts.length} concepts, ${g.timelineBreakdown.length} sections, ${g.codeExamples.length} code`);

      if (withAudio) {
        const scripts = await generateWeeklyAudioScripts(id);
        for (const s of scripts) {
          await prisma.audioScript.upsert({
            where: { lessonId_dayOfWeek: { lessonId: id, dayOfWeek: s.dayOfWeek as any } },
            update: {
              title: s.title, pedagogicalObjective: s.pedagogicalObjective,
              targetDurationMinutes: s.targetDurationMinutes, dialogue: s.dialogue as any, cleanTtsText: s.cleanTtsText,
            },
            create: {
              lessonId: id, dayOfWeek: s.dayOfWeek as any, title: s.title,
              pedagogicalObjective: s.pedagogicalObjective, targetDurationMinutes: s.targetDurationMinutes,
              dialogue: s.dialogue as any, cleanTtsText: s.cleanTtsText,
            },
          });
          console.log(`  ✓ audio ${id}/${s.dayOfWeek}: ${s.dialogue.length} répliques, ${s.cleanTtsText.length} car.`);
        }
      }
    } catch (e: any) {
      console.error(`  ✗ module ${id}:`, e?.message || e);
    }
  }
  await prisma.$disconnect();
  process.exit(0);
}
main();
