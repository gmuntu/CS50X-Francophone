'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, ChevronLeft, ChevronRight, FileUp, Image as ImageIcon, Loader2, RotateCcw, Send } from 'lucide-react';
import { contexteTuteur, type ContenuApprofondir, type Notion } from '@/lib/approfondir/types';
import { LIBELLE_TYPE, texteNotion, vueTableau } from '@/lib/approfondir/tableau';
import { ORDINATEUR_LOCAL } from '@/lib/socrate-local';
import SchemaTableau, { AMBRE, BLEU, CRAIE, ENCRE } from './schema-tableau';
import Infographie from './infographie';
import BarreTuteur from './tuteur-vocal';

const PAS_MS = 1600; // le schéma se construit tout seul, une étape toutes les 1,6 s
const FICHIER_MAX = 4 * 1024 * 1024;
const NOTES_MIN = 200;
const QUESTIONS = ["Je n'ai pas compris cette partie", 'Explique autrement', 'Donne un exemple de la vie de tous les jours'];
const CONSIGNES: Record<string, (t: string) => string> = {
  [QUESTIONS[0]]: (t) => `Je n'ai pas compris la notion « ${t} ». Réexplique-la très simplement, étape par étape.`,
  [QUESTIONS[1]]: (t) => `Explique la notion « ${t} » autrement, avec une image ou une comparaison différente.`,
  [QUESTIONS[2]]: (t) => `Donne un exemple de la vie de tous les jours, en Afrique francophone si possible, pour la notion « ${t} ».`,
};

/** Tuteur vocal en direct : Internet disponible ET pas sur un ordinateur d'école (qui utilise Gemma, Whisper, voix locale). */
function useEnLigne() {
  const [enLigne, setEnLigne] = useState(true);
  useEffect(() => {
    const maj = () => setEnLigne(!ORDINATEUR_LOCAL && navigator.onLine);
    maj();
    window.addEventListener('online', maj);
    window.addEventListener('offline', maj);
    return () => { window.removeEventListener('online', maj); window.removeEventListener('offline', maj); };
  }, []);
  return enLigne;
}

/**
 * « Envoyer un PDF » / « Coller vos notes » : possible dès qu'il y a Internet, y compris sur un ordinateur
 * d'école (il relaie vers le site en ligne). Demandé au serveur, revérifié à chaque changement de connexion.
 */
function useAnalyseDisponible() {
  const [dispo, setDispo] = useState<boolean | null>(null);
  useEffect(() => {
    let actif = true;
    const verifier = () => {
      if (!navigator.onLine) { setDispo(false); return; }
      fetch('/api/approfondir/disponible', { cache: 'no-store' })
        .then((r) => r.json())
        .then((d) => { if (actif) setDispo(d?.disponible === true); })
        .catch(() => { if (actif) setDispo(false); });
    };
    verifier();
    window.addEventListener('online', verifier);
    window.addEventListener('offline', verifier);
    return () => { actif = false; window.removeEventListener('online', verifier); window.removeEventListener('offline', verifier); };
  }, []);
  return dispo;
}

type Echange = { question: string; reponse: string };

/** Réponse écrite du tuteur (même route que l'assistant de cours), en flux. */
async function demanderTuteur(corps: object, surTexte: (t: string) => void) {
  const r = await fetch('/api/tutor', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps) });
  if (!r.ok || !r.body) {
    const e = await r.json().catch(() => ({}));
    throw new Error(e?.error || 'Le tuteur ne répond pas pour le moment.');
  }
  const lecteur = r.body.getReader();
  const dec = new TextDecoder();
  let reste = '';
  let texte = '';
  for (;;) {
    const { value, done } = await lecteur.read();
    if (done) break;
    reste += dec.decode(value, { stream: true });
    const lignes = reste.split('\n');
    reste = lignes.pop() ?? '';
    for (const l of lignes) {
      if (!l.startsWith('data: ') || l.includes('[DONE]')) continue;
      try { texte += JSON.parse(l.slice(6))?.choices?.[0]?.delta?.content ?? ''; } catch {}
    }
    surTexte(texte);
  }
}

/**
 * « Salle d'étude · Approfondir le sujet » : le tableau (la notion, son schéma, le tuteur) et le cahier d'étude
 * (sujet, notions, différences côte à côte, questions). Une nouvelle vue du même tuteur que l'assistant de cours.
 */
export default function SalleApprofondir({ moduleId, prepare, libelleSemaine }: { moduleId: number; prepare: ContenuApprofondir | null; libelleSemaine?: string }) {
  const enLigne = useEnLigne();
  const analyseDispo = useAnalyseDisponible();
  const [contenu, setContenu] = useState<ContenuApprofondir | null>(prepare);
  const [panneau, setPanneau] = useState(!prepare);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(1);
  const [actif, setActif] = useState(0);
  const [lecture, setLecture] = useState(true);
  const [infographie, setInfographie] = useState(false);
  const [notes, setNotes] = useState('');
  const [analyse, setAnalyse] = useState<{ nom?: string; erreur?: string }>({});
  const [echanges, setEchanges] = useState<Echange[]>([]);
  const [question, setQuestion] = useState('');
  const [attente, setAttente] = useState(false);
  const fichierRef = useRef<HTMLInputElement>(null);
  const reponsesRef = useRef<HTMLDivElement>(null);

  const notion: Notion | null = contenu ? contenu.notions[Math.min(index, contenu.notions.length - 1)] ?? null : null;
  const vue = useMemo(() => (notion ? vueTableau(notion) : null), [notion]);
  const nbEtapes = vue?.etapes.length ?? 0;
  const doc = contenu?.documents.find((d) => d.id === notion?.documentId) ?? contenu?.documents[0];
  const nomSource = contenu?.semaine !== undefined ? `Cours préparé · ${libelleSemaine ?? `Semaine ${contenu.semaine}`}` : doc?.titre ?? 'Mon document';
  const contexte = contenu ? contexteTuteur(contenu, notion ?? undefined) : '';
  const contexteCourt = notion ? `${notion.titre} : ${notion.resume} ${vue?.etapes.map((e) => e.label).filter(Boolean).join(', ') ?? ''}`.slice(0, 700) : '';
  const comparaisons = (contenu?.notions ?? []).filter((n) => n.differences);

  // Le schéma se construit tout seul, étape par étape.
  useEffect(() => {
    if (!lecture || !notion || visible >= nbEtapes) return;
    const t = setTimeout(() => { setActif(visible); setVisible(visible + 1); }, PAS_MS);
    return () => clearTimeout(t);
  }, [lecture, notion, nbEtapes, visible]);

  const repartir = () => { setVisible(1); setActif(0); setLecture(true); };
  const choisirNotion = (i: number) => { setIndex(i); setPanneau(false); setEchanges([]); repartir(); };
  const allerA = (n: number) => { const s = Math.max(1, Math.min(nbEtapes, n)); setLecture(false); setVisible(s); setActif(s - 1); };
  const charger = (c: ContenuApprofondir) => { setContenu(c); setPanneau(false); setAnalyse({}); choisirNotion(0); };

  const analyser = async (form: FormData, nom: string) => {
    setAnalyse({ nom });
    try {
      const r = await fetch('/api/approfondir/analyser', { method: 'POST', body: form });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d?.error || "L'analyse n'a pas abouti.");
      charger(d as ContenuApprofondir);
    } catch (e: any) {
      setAnalyse({ erreur: e?.message || "L'analyse n'a pas abouti." });
    }
  };
  const envoyerFichier = (f?: File) => {
    if (!f) return;
    if (f.size > FICHIER_MAX) { setAnalyse({ erreur: 'Le fichier dépasse 4 Mo.' }); return; }
    const form = new FormData();
    form.append('fichier', f);
    void analyser(form, f.name);
  };

  // Les réponses écrites défilent DANS le cahier : la page ne bouge pas, le tableau reste visible.
  const suivreReponse = () => requestAnimationFrame(() => { const z = reponsesRef.current; if (z) z.scrollTop = z.scrollHeight; });
  const poser = async (libelle: string, texte = libelle) => {
    if (!texte.trim() || attente || !notion || !contenu) return;
    setAttente(true);
    setEchanges((e) => [...e, { question: libelle, reponse: '' }]);
    suivreReponse();
    try {
      await demanderTuteur(
        {
          moduleId,
          // Cours préparé : le serveur relit lui-même le contexte ; document de l'élève : on l'envoie.
          approfondir: contenu.semaine !== undefined ? { semaine: contenu.semaine, notionId: notion.id } : { contexte },
          messages: [{ role: 'user', content: texte }],
        },
        (rep) => { setEchanges((e) => [...e.slice(0, -1), { question: libelle, reponse: rep }]); suivreReponse(); },
      );
    } catch (err: any) {
      setEchanges((e) => [...e.slice(0, -1), { question: libelle, reponse: `⚠️ ${err?.message ?? 'Le tuteur ne répond pas.'}` }]);
    } finally {
      setAttente(false);
    }
  };

  const indispo = analyseDispo !== true;
  const enCours = !!analyse.nom && !analyse.erreur;
  const etapeActive = vue?.etapes[Math.min(actif, nbEtapes - 1)];

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
      {/* ─── Le tableau ─── */}
      <section className="classe-tableau flex min-h-[640px] min-w-0 flex-col p-5 sm:p-7" aria-labelledby="titre-salle">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h1 id="titre-salle" className="font-craie text-4xl leading-none" style={{ color: CRAIE }}>📚 Salle d’étude</h1>
          <span className="truncate text-sm text-white/60">· Approfondir le sujet{contenu ? ` · ${nomSource}` : ''}</span>
          <button type="button" onClick={() => setPanneau((o) => !o || !contenu)} className="ml-auto flex items-center gap-2 rounded-full border border-white/40 px-4 py-1.5 text-sm font-semibold text-white hover:bg-white/10">
            <BookOpen className="h-4 w-4" />
            {panneau && contenu ? 'Revenir au tableau' : 'Commencer ou changer de document'}
          </button>
        </div>

        {panneau || !contenu || !notion || !vue ? (
          <div className="flex-1">
            <h2 className="font-craie text-3xl" style={{ color: BLEU }}>Commencer ou changer de document</h2>
            <p className="mb-5 text-sm text-white/75">Choisissez le cours de la semaine, envoyez un PDF ou collez vos notes : la salle d’étude se construit autour de votre document.</p>

            {enCours ? (
              <div className="flex items-center gap-3 rounded-xl border border-white/25 bg-white/5 p-5 text-white" role="status">
                <Loader2 className="h-6 w-6 animate-spin" style={{ color: BLEU }} />
                <div>
                  <p className="font-semibold">Lecture de « {analyse.nom} », page par page…</p>
                  <p className="text-sm text-white/70">Le document est découpé en notions. Cela prend environ une minute.</p>
                </div>
              </div>
            ) : (
              <div className="grid gap-5 xl:grid-cols-2">
                <div className="space-y-5">
                  <div>
                    <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-white/60">Documents de la semaine</h3>
                    {prepare ? (
                      <>
                        <button type="button" onClick={() => charger(prepare)} className="w-full rounded-xl border border-white/25 bg-white/5 p-3 text-left hover:bg-white/10">
                          <span className="text-2xl">📚</span>
                          <span className="mt-1 block font-craie text-2xl leading-none" style={{ color: BLEU }}>{libelleSemaine ?? 'Cours de la semaine'}</span>
                          <span className="mt-1 block text-xs leading-snug text-white/70">{prepare.sujet} · {prepare.notions.length} notions</span>
                        </button>
                        <ul className="mt-2 space-y-0.5 text-xs text-white/60">
                          {prepare.documents.map((d) => (
                            <li key={d.id}>
                              {d.url ? <a href={d.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-white">{d.titre}</a> : d.titre}
                              {d.licence && ` · ${d.licence}`}
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : (
                      <p className="text-sm text-white/70">Le cours préparé de cette semaine arrive bientôt.</p>
                    )}
                  </div>
                  <div>
                    <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-white/60">Votre document</h3>
                    <input ref={fichierRef} type="file" hidden accept=".pdf,.docx,.pptx,.txt,.md,application/pdf" onChange={(e) => { envoyerFichier(e.target.files?.[0]); e.target.value = ''; }} />
                    <button type="button" disabled={indispo} onClick={() => fichierRef.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 font-bold hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50" style={{ background: BLEU, color: ENCRE }}>
                      <FileUp className="h-5 w-5" /> Envoyer un PDF
                    </button>
                    <p className="mt-1 text-xs text-white/55">
                      {indispo ? (analyseDispo === null ? 'Vérification de la connexion…' : 'Disponible avec Internet') : 'PDF, Word, PowerPoint ou texte. 4 Mo et 50 pages au plus.'}
                    </p>
                  </div>
                </div>
                <div>
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-white/60">Ou collez vos notes</h3>
                  <label htmlFor="mes-notes" className="sr-only">Coller vos notes</label>
                  <textarea id="mes-notes" value={notes} onChange={(e) => setNotes(e.target.value)} disabled={indispo} maxLength={60000}
                    placeholder={analyseDispo === false ? 'Disponible avec Internet' : 'Collez ici le texte de votre cours ou vos notes…'}
                    className="h-56 w-full resize-y rounded-xl border border-white/25 bg-black/20 p-3 text-sm text-white placeholder:text-white/40 focus:outline-none disabled:opacity-50" />
                  <button type="button" disabled={indispo || notes.trim().length < NOTES_MIN} onClick={() => { const f = new FormData(); f.append('notes', notes); void analyser(f, 'Mes notes'); }}
                    className="mt-2 rounded-full px-5 py-2 text-sm font-bold hover:brightness-105 disabled:opacity-40" style={{ background: AMBRE, color: ENCRE }}>
                    Étudier ces notes
                  </button>
                  {!indispo && notes.trim().length > 0 && notes.trim().length < NOTES_MIN && <span className="ml-3 text-xs text-white/55">Encore un peu de texte ({NOTES_MIN} caractères au minimum).</span>}
                  <p className="mt-2 text-xs text-white/45">Votre document n’est pas enregistré : il disparaît quand vous fermez la page.</p>
                </div>
              </div>
            )}
            {analyse.erreur && <p className="mt-4 rounded-lg border p-3 text-sm text-[#ffe4b5]" style={{ borderColor: AMBRE, background: 'rgba(251,191,36,0.1)' }} role="alert">{analyse.erreur}</p>}
          </div>
        ) : (
          <>
            <div className="mb-2 flex flex-wrap items-start gap-3">
              <div className="w-full min-w-0 sm:w-auto sm:flex-1">
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: AMBRE }}>
                  Notion {index + 1} sur {contenu.notions.length} · {LIBELLE_TYPE[vue.type]}{notion.page ? ` · ${notion.page}` : ''}
                </p>
                <h2 className="font-craie text-5xl leading-[1.05]" style={{ color: BLEU }}>{notion.titre}</h2>
                <p className="mt-1 max-w-3xl text-lg leading-snug text-white">{notion.resume}</p>
              </div>
              <button type="button" onClick={() => setInfographie(true)} className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold hover:brightness-105" style={{ background: BLEU, color: ENCRE }}>
                <ImageIcon className="h-4 w-4" /> Créer une infographie
              </button>
            </div>

            <div className="flex flex-1 items-center py-2">
              <SchemaTableau key={`${moduleId}-${contenu.semaine ?? 'doc'}-${notion.id}`} vue={vue} titre={notion.titre} visible={visible} actif={actif}
                onChoisir={(i) => { setLecture(false); setActif(i); }} />
            </div>

            <div className="flex flex-wrap items-center gap-3 border-t border-white/15 pt-3">
              <div className="flex items-center gap-1">
                <button type="button" aria-label="Étape précédente" disabled={visible <= 1} onClick={() => allerA(visible - 1)} className="rounded-full border border-white/35 p-1.5 text-white hover:bg-white/10 disabled:opacity-30">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="w-14 text-center text-sm tabular-nums text-white/80">{Math.min(visible, nbEtapes)} / {nbEtapes}</span>
                <button type="button" aria-label="Étape suivante" disabled={visible >= nbEtapes} onClick={() => allerA(visible + 1)} className="rounded-full border border-white/35 p-1.5 text-white hover:bg-white/10 disabled:opacity-30">
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button type="button" aria-label="Rejouer le schéma" onClick={repartir} className="ml-1 rounded-full border border-white/35 p-1.5 text-white hover:bg-white/10">
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>
              {etapeActive && (
                <p key={actif} className="classe-apparait w-full min-w-0 text-sm leading-snug text-white sm:w-auto sm:flex-1">
                  <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-extrabold" style={{ background: AMBRE, color: ENCRE }}>{actif + 1}</span>
                  {etapeActive.label && <strong style={{ color: BLEU }}>{etapeActive.label}</strong>}
                  {etapeActive.label ? ` — ${etapeActive.detail}` : etapeActive.detail}
                </p>
              )}
            </div>

            <BarreTuteur contexte={contexte} contexteCourt={contexteCourt} notionTexte={texteNotion(notion)} titreNotion={notion.titre} moduleId={moduleId} enLigne={enLigne} />
          </>
        )}
      </section>

      {/* ─── Le cahier d'étude ─── */}
      <aside className="classe-cahier self-start py-5 pl-11 pr-5 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
        <h2 className="font-craie text-3xl leading-none text-[#1e3a8a]">Cahier d’étude</h2>
        {!contenu ? (
          <p className="mt-4 text-sm leading-7 text-[#4a483f]">Votre cahier se remplira ici : le sujet du document, ses notions fondamentales, les différences côte à côte et des questions toutes prêtes pour le tuteur.</p>
        ) : (
          <>
            <section className="mt-4">
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#1d4ed8]">Sujet principal</h3>
              <p className="text-lg font-bold leading-7">{contenu.sujet}</p>
              <p className="text-sm leading-7 text-[#4a483f]">{contenu.resume}</p>
            </section>

            <section className="mt-5">
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#1d4ed8]">Notions fondamentales</h3>
              <ol className="mt-1">
                {contenu.notions.map((n, i) => {
                  const courante = i === index && !panneau;
                  return (
                    <li key={n.id}>
                      <button type="button" onClick={() => choisirNotion(i)} aria-current={courante}
                        className={`flex w-full items-baseline gap-2 rounded px-1.5 text-left leading-7 ${courante ? 'bg-[#bfdbfe] font-bold' : 'hover:bg-[#bfdbfe]/50'}`}>
                        <span className="w-5 shrink-0 text-right text-sm font-bold text-[#1e3a8a]">{i + 1}.</span>
                        <span className="min-w-0 flex-1 text-[15px]">{n.titre}</span>
                        {n.page && <span className="shrink-0 text-xs text-[#6b6857]">{/^\d+$/.test(n.page) ? `p. ${n.page}` : n.page}</span>}
                      </button>
                    </li>
                  );
                })}
              </ol>
            </section>

            {comparaisons.length > 0 && (
              <section className="mt-5">
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#1d4ed8]">Les différences, côte à côte</h3>
                {comparaisons.map((n) => (
                  <table key={n.id} className="mt-2 w-full border-collapse text-[13px] leading-5">
                    <caption className="pb-1 text-left text-sm font-bold">{n.titre}</caption>
                    <thead>
                      <tr>
                        <th className="w-1/4" />
                        <th className="border-b-2 border-[#3b82f6] px-1.5 py-1 text-left">{n.differences!.titres[0]}</th>
                        <th className="border-b-2 border-[#f59e0b] px-1.5 py-1 text-left">{n.differences!.titres[1]}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {n.differences!.lignes.map((l, j) => (
                        <tr key={j} className="border-b border-[#2b2a26]/10 align-top">
                          <td className="py-1 pr-1.5 font-semibold text-[#1e3a8a]">{l.critere}</td>
                          <td className="bg-[#93c5fd]/25 px-1.5 py-1">{l.a}</td>
                          <td className="bg-[#fbbf24]/20 px-1.5 py-1">{l.b}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ))}
              </section>
            )}

            <section className="mt-5">
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#1d4ed8]">Demander au tuteur</h3>
              <div className="mt-2 space-y-1.5">
                {QUESTIONS.map((q) => (
                  <button key={q} type="button" disabled={panneau || attente} onClick={() => notion && void poser(q, CONSIGNES[q](notion.titre))}
                    className="block w-full rounded-lg border border-[#1e3a8a]/30 bg-white/60 px-3 py-2 text-left text-sm font-medium hover:border-[#1e3a8a] hover:bg-white disabled:opacity-50">
                    « {q} »
                  </button>
                ))}
              </div>
              <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); void poser(question); setQuestion(''); }}>
                <input value={question} onChange={(e) => setQuestion(e.target.value)} disabled={panneau} maxLength={1000} placeholder="Écrivez votre question…" aria-label="Votre question"
                  className="min-w-0 flex-1 rounded-lg border border-[#1e3a8a]/30 bg-white px-3 py-2 text-sm text-[#2b2a26] placeholder:text-[#8a8776] focus:border-[#1e3a8a] focus:outline-none" />
                <button type="submit" disabled={panneau || attente || !question.trim()} aria-label="Envoyer la question" className="rounded-lg bg-[#1e3a8a] px-3 text-white hover:brightness-110 disabled:opacity-40">
                  <Send className="h-4 w-4" />
                </button>
              </form>
              {echanges.length > 0 ? (
                <div ref={reponsesRef} className="mt-3 max-h-[45vh] space-y-2 overflow-y-auto overscroll-contain pr-1 [overflow-anchor:none]" aria-live="polite">
                  {echanges.map((e, i) => (
                    <div key={i} className="rounded-lg border border-[#1e3a8a]/20 bg-white/70 p-2.5 text-sm leading-6">
                      <p className="font-bold text-[#1e3a8a]">« {e.question} »</p>
                      <p className="mt-1 whitespace-pre-wrap text-[#2b2a26]">{e.reponse || 'Le tuteur réfléchit…'}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-1 text-xs leading-5 text-[#6b6857]">Le tuteur répond ici, à propos de la notion affichée au tableau.</p>
              )}
            </section>
          </>
        )}
      </aside>

      {infographie && contenu && notion && <Infographie notion={notion} sujet={contenu.sujet} source={doc ? `${doc.titre}${doc.licence ? ` (${doc.licence})` : ''}` : nomSource} onFermer={() => setInfographie(false)} />}
    </div>
  );
}
