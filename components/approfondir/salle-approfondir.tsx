'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { FileUp, ClipboardPaste, BookOpen, Sparkles, HelpCircle, RefreshCw, Lightbulb, Send, Mic, GraduationCap } from 'lucide-react';
import { contexteTuteur, type ContenuApprofondir, type Notion } from '@/lib/approfondir/types';
import { ORDINATEUR_LOCAL } from '@/lib/socrate-local';
import SchemaTableau from './schema-tableau';
import Infographie from './infographie';
import TuteurVocal, { type ModeVocal } from './tuteur-vocal';

const PDF_MAX = 4 * 1024 * 1024;

/** En ligne = Internet disponible ET pas sur un ordinateur d'école (qui utilise Gemma, Whisper et la voix locale). */
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
 * « Salle d’étude · Approfondir le sujet » : un tableau (la notion) et un cahier (les notions et les questions).
 * Une nouvelle vue du même tuteur que l’assistant de cours, affichée dans la page « Salle d’étude ».
 */
export default function SalleApprofondir({ moduleId, prepare }: { moduleId: number; prepare: ContenuApprofondir | null }) {
  const enLigne = useEnLigne();
  const [contenu, setContenu] = useState<ContenuApprofondir | null>(prepare);
  const [notionId, setNotionId] = useState<string | undefined>(prepare?.notions[0]?.id);
  const [panneau, setPanneau] = useState<'ferme' | 'pdf' | 'notes'>(prepare ? 'ferme' : 'notes');
  const [notes, setNotes] = useState('');
  const [analyse, setAnalyse] = useState<{ enCours: boolean; erreur?: string }>({ enCours: false });
  const [infoOuverte, setInfoOuverte] = useState(false);
  const [vocal, setVocal] = useState<ModeVocal | null>(null);
  const [echanges, setEchanges] = useState<Echange[]>([]);
  const [question, setQuestion] = useState('');
  const [attente, setAttente] = useState(false);
  const fichierRef = useRef<HTMLInputElement>(null);
  const tableauRef = useRef<HTMLDivElement>(null);
  // Les réponses du tuteur défilent DANS le cahier : la page ne bouge pas, le tableau reste visible.
  const reponsesRef = useRef<HTMLDivElement>(null);
  const suivreReponse = () => requestAnimationFrame(() => {
    const z = reponsesRef.current;
    if (z) z.scrollTop = z.scrollHeight;
  });

  const notion: Notion | undefined = useMemo(() => contenu?.notions.find((n) => n.id === notionId) ?? contenu?.notions[0], [contenu, notionId]);
  const doc = contenu?.documents.find((d) => d.id === notion?.documentId) ?? contenu?.documents[0];
  const contexte = contenu ? contexteTuteur(contenu, notion) : '';
  const contexteCourt = notion ? `${notion.titre} : ${notion.resume} ${(notion.schema.etapes ?? []).map((e) => e.titre).join(', ')}`.slice(0, 700) : '';

  const choisirNotion = (id: string) => {
    setNotionId(id);
    setEchanges([]);
    setVocal(null);
    tableauRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const charger = (c: ContenuApprofondir) => { setContenu(c); setNotionId(c.notions[0]?.id); setEchanges([]); setVocal(null); setPanneau('ferme'); };

  const analyser = async (form: FormData) => {
    setAnalyse({ enCours: true });
    try {
      const r = await fetch('/api/approfondir/analyser', { method: 'POST', body: form });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d?.error || "L'analyse n'a pas abouti.");
      charger(d as ContenuApprofondir);
      setAnalyse({ enCours: false });
    } catch (e: any) {
      setAnalyse({ enCours: false, erreur: e?.message || "L'analyse n'a pas abouti." });
    }
  };

  const envoyerPdf = (f?: File) => {
    if (!f) return;
    if (f.size > PDF_MAX) { setAnalyse({ enCours: false, erreur: 'Le PDF dépasse 4 Mo.' }); return; }
    const form = new FormData();
    form.append('pdf', f);
    analyser(form);
  };

  const poser = async (texte: string, libelle = texte, mode?: 'expliquer') => {
    if (!texte.trim() || attente || !notion) return;
    setAttente(true);
    setQuestion('');
    setEchanges((e) => [...e, { question: libelle, reponse: '' }]);
    suivreReponse();
    try {
      await demanderTuteur(
        {
          moduleId,
          // Cours préparé : le serveur relit lui-même le contexte ; document de l'élève : on l'envoie.
          approfondir: contenu?.semaine !== undefined ? { semaine: contenu.semaine, notionId: notion.id, mode } : { contexte, mode },
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

  const BOUTONS = notion ? [
    { icone: HelpCircle, libelle: "Je n'ai pas compris cette partie", texte: `Je n'ai pas compris la notion « ${notion.titre} ». Réexplique-la très simplement, étape par étape.` },
    { icone: RefreshCw, libelle: 'Explique autrement', texte: `Explique la notion « ${notion.titre} » autrement, avec une image ou une comparaison différente.` },
    { icone: Lightbulb, libelle: 'Donne un exemple de la vie de tous les jours', texte: `Donne un exemple de la vie de tous les jours, en Afrique francophone si possible, pour la notion « ${notion.titre} ».` },
  ] : [];

  const indispo = !enLigne;
  const btnPanneau = 'inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <section aria-labelledby="titre-approfondir" className="rounded-3xl border border-border bg-card p-4 sm:p-6 shadow-soft-sm">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="titre-approfondir" className="sr-only">Approfondir le sujet</h2>
          {contenu && <p className="text-base text-muted-foreground">Sujet : <strong className="text-foreground">{contenu.sujet}</strong></p>}
        </div>
        {!enLigne && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900 dark:bg-amber-900/40 dark:text-amber-100">Mode sans Internet</span>}
      </header>

      {/* Commencer ou changer de document */}
      <details className="mt-4 rounded-2xl border border-border bg-muted/40 p-3" open={!contenu}>
        <summary className="cursor-pointer text-sm font-bold text-foreground">Commencer ou changer de document</summary>
        <div className="mt-3 space-y-3">
          {prepare && prepare.documents.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Documents de la semaine</p>
              <button type="button" onClick={() => charger(prepare)} className={`${btnPanneau} mt-1 border-primary/30 bg-card text-primary hover:bg-primary/10`}>
                <BookOpen className="h-4 w-4" /> Le cours préparé ({prepare.notions.length} notions)
              </button>
              <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                {prepare.documents.map((d) => (
                  <li key={d.id}>
                    {d.url ? <a href={d.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">{d.titre}</a> : d.titre}
                    {d.auteur && ` — ${d.auteur}`}{d.licence && ` · ${d.licence}`}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={indispo || analyse.enCours} onClick={() => fichierRef.current?.click()}
              className={`${btnPanneau} border-border bg-card hover:bg-muted`}><FileUp className="h-4 w-4" /> Envoyer un PDF</button>
            <button type="button" disabled={indispo || analyse.enCours} onClick={() => setPanneau(panneau === 'notes' ? 'ferme' : 'notes')}
              className={`${btnPanneau} border-border bg-card hover:bg-muted`}><ClipboardPaste className="h-4 w-4" /> Coller mes notes</button>
            <input ref={fichierRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => { envoyerPdf(e.target.files?.[0]); e.target.value = ''; }} />
          </div>
          {indispo && <p className="text-xs font-semibold text-muted-foreground">Disponible avec Internet</p>}
          {!indispo && panneau === 'notes' && (
            <div>
              <label htmlFor="mes-notes" className="sr-only">Coller mes notes</label>
              <textarea id="mes-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} maxLength={60000}
                placeholder="Collez ici vos notes de cours (quelques paragraphes au moins)…"
                className="w-full rounded-xl border border-input bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              <button type="button" disabled={notes.trim().length < 40 || analyse.enCours}
                onClick={() => { const f = new FormData(); f.append('notes', notes); analyser(f); }}
                className="mt-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">Découper en notions</button>
            </div>
          )}
          {!indispo && <p className="text-[11px] text-muted-foreground">PDF de 4 Mo au plus. Votre document n'est pas enregistré : il disparaît quand vous fermez la page.</p>}
          {analyse.enCours && <p className="text-sm font-semibold text-primary" role="status">Analyse du document en cours… (jusqu'à une minute)</p>}
          {analyse.erreur && <p className="text-sm text-destructive" role="alert">{analyse.erreur}</p>}
        </div>
      </details>

      {!contenu ? (
        <p className="mt-6 rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          {enLigne ? 'Le cours préparé de cette semaine arrive bientôt. En attendant, envoyez un PDF ou collez vos notes.' : 'Le cours préparé de cette semaine arrive bientôt.'}
        </p>
      ) : notion && (
        <div className="mt-5 grid gap-5 2xl:grid-cols-5 2xl:items-start">
          {/* Le tableau */}
          <div ref={tableauRef} className="2xl:col-span-3 2xl:sticky 2xl:top-24 scroll-mt-24 rounded-3xl border-4 border-blue-900/60 bg-blue-950 p-5 text-white shadow-lg dark:border-blue-800/60">
            <p className="text-[11px] font-bold uppercase tracking-wide text-sky-200">Au tableau{notion.page ? ` · ${notion.page}` : ''}</p>
            <h3 className="mt-1 font-craie text-3xl font-bold leading-tight">{notion.titre}</h3>
            <p className="mt-2 text-base text-white/90">{notion.resume}</p>
            <div className="mt-4"><SchemaTableau key={notion.id} schema={notion.schema} /></div>
            <button type="button" onClick={() => setInfoOuverte(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-sky-300 px-4 py-2.5 text-sm font-extrabold text-blue-950 hover:bg-sky-200">
              <Sparkles className="h-4 w-4" /> Créer une infographie
            </button>
            {doc && <p className="mt-3 text-[11px] text-white/60">Source : {doc.titre}{doc.auteur ? ` — ${doc.auteur}` : ''}{doc.licence ? ` · ${doc.licence}` : ''}</p>}
          </div>

          {/* Le cahier */}
          <div className="2xl:col-span-2 rounded-3xl border border-border bg-card p-5 shadow-soft-sm"
            style={{ backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0, transparent 31px, hsl(var(--primary) / 0.12) 31px, hsl(var(--primary) / 0.12) 32px)' }}>
            <p className="text-[11px] font-bold uppercase tracking-wide text-primary">Mon cahier</p>
            <p className="font-extrabold text-foreground">{contenu.sujet}</p>
            <ol className="mt-2 space-y-1">
              {contenu.notions.map((n, i) => (
                <li key={n.id}>
                  <button type="button" onClick={() => choisirNotion(n.id)} aria-current={n.id === notion.id}
                    className={`w-full rounded-lg px-2 py-1.5 text-left text-sm transition ${n.id === notion.id ? 'bg-primary text-primary-foreground font-bold' : 'text-foreground hover:bg-primary/10'}`}>
                    {i + 1}. {n.titre}{n.page && <span className={`ml-1 text-[11px] ${n.id === notion.id ? 'opacity-80' : 'text-muted-foreground'}`}>({n.page})</span>}
                  </button>
                </li>
              ))}
            </ol>

            {notion.differences && (
              <div className="mt-4">
                <p className="text-sm font-extrabold text-foreground">Les différences, côte à côte</p>
                <div className="mt-1 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead><tr className="text-primary"><th className="py-1 pr-2"></th><th className="py-1 pr-2">{notion.differences.titres[0]}</th><th className="py-1">{notion.differences.titres[1]}</th></tr></thead>
                    <tbody>
                      {notion.differences.lignes.map((l, i) => (
                        <tr key={i} className="border-t border-border/60 align-top"><th className="py-1 pr-2 font-semibold">{l.critere}</th><td className="py-1 pr-2">{l.a}</td><td className="py-1">{l.b}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {notion.passages && notion.passages.length > 0 && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-bold text-foreground">Ce que dit le document</summary>
                <ul className="mt-1 space-y-2 text-xs text-muted-foreground">
                  {notion.passages.map((p, i) => <li key={i}>« {p.texte} » <span className="font-semibold">({p.page})</span></li>)}
                </ul>
              </details>
            )}

            <div className="mt-4 flex flex-col gap-2">
              {BOUTONS.map((b) => (
                <button key={b.libelle} type="button" disabled={attente} onClick={() => poser(b.texte, b.libelle)}
                  className="inline-flex items-center gap-2 rounded-xl border border-primary/25 bg-card px-3 py-2 text-left text-sm font-semibold text-foreground hover:bg-primary/10 disabled:opacity-60">
                  <b.icone className="h-4 w-4 shrink-0 text-primary" /> {b.libelle}
                </button>
              ))}
            </div>
            <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); poser(question); }}>
              <label htmlFor="question-libre" className="sr-only">Votre question sur cette notion</label>
              <input id="question-libre" value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={1000}
                placeholder="Votre question sur cette notion…" className="min-w-0 flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              <button type="submit" disabled={attente || !question.trim()} aria-label="Envoyer la question"
                className="rounded-xl bg-primary px-3 text-primary-foreground hover:bg-primary/90 disabled:opacity-50"><Send className="h-4 w-4" /></button>
            </form>

            {echanges.length > 0 && (
              <div ref={reponsesRef} className="mt-3 max-h-[45vh] space-y-3 overflow-y-auto overscroll-contain rounded-xl pr-1 [overflow-anchor:none]" aria-live="polite">
                {echanges.map((e, i) => (
                  <div key={i} className="rounded-xl bg-muted/60 p-3 text-sm">
                    <p className="font-bold text-primary">{e.question}</p>
                    <p className="mt-1 whitespace-pre-wrap text-foreground">{e.reponse || 'Le tuteur réfléchit…'}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 grid grid-cols-1 gap-2 border-t border-border pt-4 sm:grid-cols-2">
              <button type="button" onClick={() => setVocal('parler')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90">
                <Mic className="h-4 w-4" /> Parler au tuteur
              </button>
              <button type="button" onClick={() => setVocal('expliquer')} className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-primary px-3 py-2.5 text-sm font-bold text-primary hover:bg-primary/10">
                <GraduationCap className="h-4 w-4" /> À vous d'expliquer
              </button>
            </div>
          </div>

          {vocal && (
            <div className="2xl:col-span-5">
              <TuteurVocal key={`${vocal}-${notion.id}-${enLigne}`} mode={vocal} contexte={contexte} contexteCourt={contexteCourt} moduleId={moduleId}
                enLigne={enLigne} titreNotion={notion.titre} onFermer={() => setVocal(null)} />
            </div>
          )}
        </div>
      )}

      {infoOuverte && notion && <Infographie notion={notion} source={doc ? `${doc.titre}${doc.licence ? ` (${doc.licence})` : ''}` : undefined} onFermer={() => setInfoOuverte(false)} />}
    </section>
  );
}
