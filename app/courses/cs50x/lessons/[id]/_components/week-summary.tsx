import { BookOpen, Lightbulb, ListOrdered, Code2, Target } from 'lucide-react';

// Résumé complet de la semaine (généré en base) : affiché en texte, jamais en HTML brut.
type Concept = { term?: string; definition?: string; importance?: string };
type Etape = { title?: string; description?: string; keyPoints?: string[] };
type Exemple = { title?: string; language?: string; code?: string; explanation?: string };

const liste = <T,>(v: unknown): T[] => (Array.isArray(v) ? v.filter((x) => x && typeof x === 'object') : []);

/** Texte avec `code` entre accents graves. */
function Texte({ children }: { children?: string }) {
  if (!children) return null;
  return (
    <>
      {children.split(/(`[^`]+`)/g).map((morceau, i) =>
        morceau.startsWith('`') && morceau.endsWith('`') && morceau.length > 2 ? (
          <code key={i} className="px-1 py-0.5 rounded bg-muted text-[0.9em] font-mono">{morceau.slice(1, -1)}</code>
        ) : (
          morceau
        )
      )}
    </>
  );
}

function Bloc({ icon: Icon, titre, children }: { icon: any; titre: string; children: React.ReactNode }) {
  return (
    <section className="bg-card border border-border/80 rounded-2xl p-6 sm:p-7 shadow-soft-sm space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-extrabold text-foreground tracking-tight">
        <Icon className="w-5 h-5 text-primary" /> {titre}
      </h2>
      {children}
    </section>
  );
}

export default function WeekSummary({ summary }: { summary: any }) {
  if (!summary) {
    return (
      <div className="bg-card border border-border/80 rounded-2xl p-8 text-center shadow-soft-sm">
        <BookOpen className="w-10 h-10 text-muted-foreground/60 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Le résumé de la semaine sera bientôt disponible.</p>
      </div>
    );
  }

  const concepts = liste<Concept>(summary.keyConcepts);
  const etapes = liste<Etape>(summary.timelineBreakdown);
  const exemples = liste<Exemple>(summary.codeExamples);

  return (
    <div className="space-y-6">
      <Bloc icon={BookOpen} titre={summary.title || 'Résumé de la semaine'}>
        <p className="text-sm sm:text-base text-foreground/90 leading-relaxed whitespace-pre-line">{summary.overview}</p>
      </Bloc>

      {concepts.length > 0 && (
        <Bloc icon={Lightbulb} titre="Les notions clés">
          <dl className="grid gap-3 sm:grid-cols-2">
            {concepts.map((c, i) => (
              <div key={i} className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-1.5">
                <dt className="font-bold text-foreground text-sm">{c.term}</dt>
                <dd className="text-sm text-foreground/85 leading-relaxed"><Texte>{c.definition}</Texte></dd>
                {c.importance && (
                  <dd className="text-xs text-muted-foreground leading-relaxed"><span className="font-semibold">Pourquoi c'est important : </span><Texte>{c.importance}</Texte></dd>
                )}
              </div>
            ))}
          </dl>
        </Bloc>
      )}

      {etapes.length > 0 && (
        <Bloc icon={ListOrdered} titre="Le déroulé du cours">
          <ol className="space-y-4">
            {etapes.map((e, i) => (
              <li key={i} className="flex gap-3">
                <span className="shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-extrabold flex items-center justify-center">{i + 1}</span>
                <div className="space-y-1.5">
                  <h3 className="font-bold text-foreground text-sm">{e.title}</h3>
                  {e.description && <p className="text-sm text-foreground/85 leading-relaxed"><Texte>{e.description}</Texte></p>}
                  {Array.isArray(e.keyPoints) && e.keyPoints.length > 0 && (
                    <ul className="list-disc pl-5 space-y-0.5 text-sm text-muted-foreground">
                      {e.keyPoints.filter((p) => typeof p === 'string').map((p, j) => <li key={j}><Texte>{p}</Texte></li>)}
                    </ul>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </Bloc>
      )}

      {exemples.length > 0 && (
        <Bloc icon={Code2} titre="Exemples de code">
          <div className="space-y-5">
            {exemples.map((x, i) => (
              <div key={i} className="space-y-2">
                <h3 className="font-bold text-foreground text-sm">{x.title}</h3>
                {x.code && (
                  <pre className="overflow-x-auto rounded-xl bg-zinc-950 text-zinc-100 p-4 text-xs sm:text-sm leading-relaxed"><code>{x.code}</code></pre>
                )}
                {x.explanation && <p className="text-sm text-foreground/85 leading-relaxed"><Texte>{x.explanation}</Texte></p>}
              </div>
            ))}
          </div>
        </Bloc>
      )}

      {summary.pedagogicalTakeaway && (
        <Bloc icon={Target} titre="À retenir">
          <p className="text-sm sm:text-base text-foreground/90 leading-relaxed"><Texte>{summary.pedagogicalTakeaway}</Texte></p>
        </Bloc>
      )}
    </div>
  );
}
