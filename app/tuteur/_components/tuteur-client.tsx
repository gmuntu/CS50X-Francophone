'use client';

import { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import Header from '@/components/header';
import CourseAssistant from '@/components/course-assistant';
import { CS50_MODULES } from '@/config/course-modules';
import {
  BarChart3, BookOpen, Lightbulb, Clock, Code2, Search, Zap, Loader2,
  CheckCircle2, GraduationCap,
} from 'lucide-react';

type TabKey = 'markdown' | 'concepts' | 'timeline' | 'code';

interface ModuleContent {
  videoSummary: any | null;
  audioScripts: any[];
  quizzes: any[];
}

interface Props {
  user: { id: string; name?: string | null; email?: string | null };
  role: string;
  contentByModule: Record<number, ModuleContent>;
}

const EMPTY: ModuleContent = { videoSummary: null, audioScripts: [], quizzes: [] };

export default function TuteurClient({ role, contentByModule }: Props) {
  const [activeModuleId, setActiveModuleId] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<TabKey>('markdown');
  const [contentMap, setContentMap] = useState<Record<number, ModuleContent>>(contentByModule ?? {});
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationMsg, setGenerationMsg] = useState('');

  const canGenerate = role === 'ADMIN' || role === 'INSTRUCTOR';

  const activeModule = useMemo(
    () => CS50_MODULES.find((m) => m.id === activeModuleId) ?? CS50_MODULES[0],
    [activeModuleId],
  );
  const activeContent = contentMap[activeModuleId] ?? EMPTY;
  const videoSummary = activeContent.videoSummary;

  const refreshModule = useCallback(async (moduleId: number) => {
    try {
      const res = await fetch(`/api/content/modules/${moduleId}`);
      const json = await res.json();
      if (json?.success) {
        setContentMap((prev) => ({ ...prev, [moduleId]: json.data }));
      }
    } catch (e) {
      console.error('refreshModule error:', e);
    }
  }, []);

  const handleGenerate = useCallback(async () => {
    if (isGenerating || !canGenerate) return;
    setIsGenerating(true);
    setGenerationMsg('Génération du contenu pédagogique en cours...');
    try {
      const res = await fetch('/api/content/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduleId: activeModuleId }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || 'Erreur de génération');
      }
      setGenerationMsg('Contenu synchronisé ✓');
      await refreshModule(activeModuleId);
      setTimeout(() => setGenerationMsg(''), 2500);
    } catch (e: any) {
      console.error('generate error:', e);
      setGenerationMsg(e?.message || 'Échec de la génération');
      setTimeout(() => setGenerationMsg(''), 4000);
    } finally {
      setIsGenerating(false);
    }
  }, [activeModuleId, canGenerate, isGenerating, refreshModule]);

  const tabs: { key: TabKey; label: string; icon: any; count?: number }[] = [
    { key: 'markdown', label: 'Résumé Magistral', icon: BookOpen },
    { key: 'concepts', label: 'Concepts Clés', icon: Lightbulb, count: videoSummary?.keyConcepts?.length },
    { key: 'timeline', label: 'Découpage Vidéo', icon: Clock },
    { key: 'code', label: 'Extraits de Code', icon: Code2 },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <div className="flex-1 w-full max-w-[1700px] mx-auto flex flex-col lg:flex-row">
        {/* ===================== BARRE LATÉRALE GAUCHE ===================== */}
        {!isFocusMode && (
          <aside className="lg:w-80 shrink-0 border-b lg:border-b-0 lg:border-r border-border bg-card/50 backdrop-blur-sm flex flex-col">
            <div className="p-5 border-b border-border/70 flex items-center justify-between">
              <div>
                <h1 className="text-xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                  Savoir IA
                </h1>
                <p className="text-xs text-muted-foreground font-medium mt-0.5">CS50x Francophone</p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                Tuteur
              </span>
            </div>

            <div className="p-4">
              <Link
                href="/dashboard"
                className="w-full flex items-center gap-2 justify-center px-3.5 py-2.5 rounded-xl bg-background border border-border/80 text-sm font-semibold text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-200 shadow-sm"
              >
                <BarChart3 className="w-4 h-4" /> Ma Progression
              </Link>
            </div>

            <div className="px-4 pb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Programme du cours
            </div>

            <nav className="px-3 pb-5 space-y-1.5 overflow-y-auto lg:max-h-[calc(100vh-16rem)]">
              {CS50_MODULES.map((m) => {
                const isActive = m.id === activeModuleId;
                const hasContent = !!contentMap[m.id]?.videoSummary;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => { setActiveModuleId(m.id); setActiveTab('markdown'); }}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-between gap-2.5 ${
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 font-semibold'
                        : 'text-foreground/80 hover:bg-muted/70 hover:text-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`w-6 h-6 rounded-lg text-xs font-mono font-bold flex items-center justify-center shrink-0 ${
                        isActive
                          ? 'bg-primary-foreground/20 text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {m.id}
                      </span>
                      <span className="truncate leading-snug">{m.title}</span>
                    </div>
                    {hasContent && (
                      <CheckCircle2 className={`w-4 h-4 shrink-0 ${isActive ? 'text-primary-foreground' : 'text-emerald-500'}`} />
                    )}
                  </button>
                );
              })}
            </nav>
          </aside>
        )}

        {/* ===================== ZONE CENTRALE ===================== */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 space-y-6 overflow-y-auto">
          {/* En-tête du module */}
          <div className="bg-card/80 backdrop-blur-sm border border-border/80 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-primary/10 text-primary text-xs font-bold px-3 py-1 rounded-full border border-primary/20">
                  Semaine {activeModule.id}
                </span>
                {videoSummary && (
                  <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold px-3 py-1 rounded-full border border-emerald-500/20 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Contenus IA synchronisés
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">{activeModule.title}</h2>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              {generationMsg && (
                <span className="text-xs text-primary font-semibold bg-primary/10 px-3 py-1.5 rounded-xl border border-primary/20">{generationMsg}</span>
              )}
              <button
                type="button"
                onClick={() => setIsFocusMode(!isFocusMode)}
                className="px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-muted hover:bg-border text-foreground transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Search className="w-3.5 h-3.5" /> {isFocusMode ? 'Quitter Focus' : 'Mode Focus'}
              </button>
              {canGenerate && (
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#7c3aed] hover:bg-[#6d28d9] text-white shadow-md shadow-[#7c3aed]/20 transition-all duration-200 disabled:opacity-50 flex items-center gap-2"
                  title="Génère ou met à jour les résumés pédagogiques avec l'IA"
                >
                  {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                  {isGenerating ? 'Génération...' : videoSummary ? "Régénérer avec l'IA" : "Générer avec l'IA"}
                </button>
              )}
            </div>
          </div>

          {/* Lecteur vidéo */}
          <div className="w-full aspect-video bg-black rounded-2xl border border-border/80 shadow-md overflow-hidden ring-1 ring-black/5">
            {activeModule.videoUrl ? (
              <iframe
                key={activeModule.videoUrl}
                src={activeModule.videoUrl}
                className="w-full h-full"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                title={activeModule.title}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">Vidéo indisponible</div>
            )}
          </div>

          {/* Onglets segmented control */}
          <div className="p-1 bg-muted/60 backdrop-blur-sm rounded-xl border border-border/70 inline-flex gap-1 overflow-x-auto max-w-full">
            {tabs.map((t) => {
              const Icon = t.icon;
              const isActive = activeTab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setActiveTab(t.key)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all duration-200 whitespace-nowrap shrink-0 flex items-center gap-2 ${
                    isActive
                      ? 'bg-card text-foreground shadow-sm font-bold border border-border/50'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : ''}`} />
                  <span>{t.label}</span>
                  {typeof t.count === 'number' && t.count > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                      isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                    }`}>
                      {t.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Contenu des onglets */}
          {!videoSummary ? (
            <div className="py-16 text-center space-y-4 bg-card/60 backdrop-blur-sm border border-border rounded-2xl p-6">
              <div className="w-14 h-14 rounded-2xl bg-muted/70 text-muted-foreground flex items-center justify-center mx-auto">
                <GraduationCap className="w-7 h-7 text-muted-foreground/60" />
              </div>
              <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                Le résumé structuré de ce module n&apos;est pas encore disponible.
                {canGenerate ? " Cliquez sur « Générer avec l'IA » pour le créer." : ' Il sera bientôt ajouté par un enseignant. En attendant, discutez avec Socrate à droite — il connaît déjà le programme du module.'}
              </p>
              {canGenerate && (
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#7c3aed] hover:bg-[#6d28d9] text-white shadow-md shadow-[#7c3aed]/25 transition-all inline-flex items-center gap-2 disabled:opacity-50"
                >
                  {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />} Générer le résumé structuré
                </button>
              )}
            </div>
          ) : (
            <div className="pt-1">
              {/* Résumé Magistral */}
              {activeTab === 'markdown' && (
                <div className="bg-card border border-border/80 rounded-2xl p-6 sm:p-8 shadow-sm">
                  <div className="prose-cs50 max-w-none text-sm leading-relaxed text-foreground/90">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        code({ className, children, ...props }: any) {
                          const match = /language-(\w+)/.exec(className || '');
                          return match ? (
                            <div className="my-4 rounded-xl overflow-hidden border border-border shadow-sm">
                              <SyntaxHighlighter language={match[1]} style={oneLight as any} customStyle={{ margin: 0, fontSize: '0.8rem', padding: '1rem' }}>
                                {String(children).replace(/\n$/, '')}
                              </SyntaxHighlighter>
                            </div>
                          ) : (
                            <code className="bg-muted px-1.5 py-0.5 rounded text-primary font-mono text-[0.8em] font-semibold" {...props}>{children}</code>
                          );
                        },
                      }}
                    >
                      {videoSummary.fullMarkdown || videoSummary.overview}
                    </ReactMarkdown>
                  </div>
                </div>
              )}

              {/* Concepts Clés */}
              {activeTab === 'concepts' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(videoSummary.keyConcepts ?? []).map((c: any, i: number) => (
                    <div key={i} className="bg-card p-5 rounded-2xl border border-border hover:border-primary/30 transition-all duration-200 space-y-2.5 shadow-sm">
                      <div className="flex items-start gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                          <Lightbulb className="w-4 h-4" />
                        </div>
                        <h4 className="text-sm font-bold text-foreground leading-snug">{c?.term}</h4>
                      </div>
                      <p className="text-xs text-foreground/80 leading-relaxed pl-9">{c?.definition}</p>
                      {c?.importance && (
                        <div className="pt-2.5 mt-2 border-t border-border/70 pl-9">
                          <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Pourquoi c&apos;est capital :</span>
                          <p className="text-[11px] text-muted-foreground italic mt-0.5">{c.importance}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Découpage Vidéo */}
              {activeTab === 'timeline' && (
                <div className="space-y-3.5">
                  {(videoSummary.timelineBreakdown ?? []).map((item: any, i: number) => (
                    <div key={i} className="bg-card p-5 rounded-2xl border border-border hover:border-primary/30 transition-all flex gap-4 items-start shadow-sm">
                      <span className="bg-primary/10 text-primary font-mono text-xs font-bold px-3 py-1.5 rounded-xl border border-primary/20 shrink-0">
                        {item?.timestamp || `Partie ${i + 1}`}
                      </span>
                      <div className="space-y-1.5 flex-1">
                        <h4 className="text-sm font-bold text-foreground">{item?.title}</h4>
                        <p className="text-xs text-foreground/80 leading-relaxed">{item?.description}</p>
                        {Array.isArray(item?.keyPoints) && item.keyPoints.length > 0 && (
                          <ul className="list-disc list-inside text-xs text-muted-foreground pt-1.5 space-y-1">
                            {item.keyPoints.map((pt: string, pti: number) => <li key={pti}>{pt}</li>)}
                          </ul>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Extraits de Code */}
              {activeTab === 'code' && (
                <div className="space-y-5">
                  {Array.isArray(videoSummary.codeExamples) && videoSummary.codeExamples.length > 0 ? (
                    videoSummary.codeExamples.map((ex: any, i: number) => (
                      <div key={i} className="bg-card p-5 rounded-2xl border border-border space-y-3 shadow-sm">
                        <div className="flex justify-between items-center">
                          <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                            <Code2 className="w-4 h-4 text-primary" />
                            {ex?.title}
                          </h4>
                          <span className="text-[10px] uppercase font-mono px-2.5 py-1 bg-muted rounded-lg border border-border text-muted-foreground font-semibold">
                            {ex?.language}
                          </span>
                        </div>
                        <div className="rounded-xl overflow-hidden border border-border shadow-sm">
                          <SyntaxHighlighter language={(ex?.language || 'text').toLowerCase()} style={oneLight as any} customStyle={{ margin: 0, fontSize: '0.78rem', padding: '1rem' }}>
                            {String(ex?.code ?? '')}
                          </SyntaxHighlighter>
                        </div>
                        {ex?.explanation && <p className="text-xs text-muted-foreground leading-relaxed italic bg-muted/40 p-3 rounded-xl border border-border/50">{ex.explanation}</p>}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10 bg-card rounded-2xl border border-border">
                      <p className="text-xs text-muted-foreground">Consultez l&apos;onglet Résumé Magistral pour le code source annoté.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </main>

        {/* ===================== BARRE LATÉRALE DROITE (SOCRATE) ===================== */}
        {!isFocusMode && (
          <aside className="lg:w-[400px] shrink-0 border-t lg:border-t-0 lg:border-l border-border p-4 overflow-y-auto">
            <CourseAssistant
              key={activeModuleId}
              moduleConfig={activeModule}
              audioScripts={activeContent.audioScripts}
              quizzes={activeContent.quizzes}
            />
          </aside>
        )}
      </div>
    </div>
  );
}
