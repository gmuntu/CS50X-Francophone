'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/header';
import toast from 'react-hot-toast';
import { ArrowLeft, Building2, CalendarDays, KeyRound, Copy, Plus, RefreshCw, Power } from 'lucide-react';

type Data = { institutions: any[]; courses: any[]; sessions: any[] };

const fmt = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

export default function PartnersClient() {
  const [data, setData] = useState<Data | null>(null);
  const [busy, setBusy] = useState(false);

  // Formulaires
  const [inst, setInst] = useState({ name: '', acronym: '', country: '', type: 'UNIVERSITY', contactEmail: '' });
  const [plan, setPlan] = useState({ courseId: '', year: new Date().getFullYear() + 1, firstStart: '' });

  const load = async () => {
    const res = await fetch('/api/admin/partners');
    const json = await res.json();
    if (!res.ok) return toast.error(json?.error || 'Erreur');
    setData(json);
    setPlan((p) => ({ ...p, courseId: p.courseId || json.courses?.[0]?.id || '' }));
  };

  useEffect(() => {
    load();
  }, []);

  const act = async (payload: Record<string, unknown>, success: string) => {
    setBusy(true);
    try {
      const res = await fetch('/api/admin/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Erreur');
      setData(json);
      toast.success(success);
      return true;
    } catch (e: any) {
      toast.error(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const now = Date.now();
  const openSessions = useMemo(
    () => (data?.sessions ?? []).filter((s) => new Date(s.endDate).getTime() >= now),
    [data, now],
  );
  const selectedCourse = data?.courses.find((c) => c.id === plan.courseId);

  const copy = (code: string) => {
    navigator.clipboard?.writeText(code);
    toast.success('Code copié');
  };

  const input = 'w-full px-3 py-2 rounded-lg bg-background border border-border text-sm';
  const card = 'bg-card border border-border rounded-xl p-5';
  const btn = 'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold disabled:opacity-50';

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Retour au panel
        </Link>
        <h1 className="text-2xl font-extrabold text-foreground">Établissements partenaires & sessions</h1>

        {!data ? (
          <p className="text-muted-foreground">Chargement…</p>
        ) : (
          <>
            {/* 1. Calendrier des sessions */}
            <section className={card}>
              <h2 className="font-bold text-foreground flex items-center gap-2 mb-1">
                <CalendarDays className="w-5 h-5 text-primary" /> 1. Planifier les sessions de l&apos;année
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Chaque session dure la durée du cours, suivie d&apos;une pause de transition. Le nombre de sessions par an est calculé automatiquement.
              </p>
              <div className="grid sm:grid-cols-5 gap-3 items-end">
                <label className="text-xs font-bold sm:col-span-2">
                  Cours
                  <select className={input} value={plan.courseId} onChange={(e) => setPlan({ ...plan, courseId: e.target.value })}>
                    {data.courses.map((c) => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-bold">
                  Année
                  <input type="number" className={input} value={plan.year} onChange={(e) => setPlan({ ...plan, year: Number(e.target.value) })} />
                </label>
                <label className="text-xs font-bold">
                  Début de la 1re session
                  <input type="date" className={input} value={plan.firstStart} onChange={(e) => setPlan({ ...plan, firstStart: e.target.value })} />
                </label>
                <button
                  disabled={busy || !plan.courseId || !plan.firstStart}
                  onClick={() => act({ action: 'generateSessions', ...plan }, 'Sessions planifiées')}
                  className={`${btn} bg-primary text-primary-foreground justify-center`}
                >
                  <Plus className="w-4 h-4" /> Générer
                </button>
              </div>
              {selectedCourse && (
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span>
                    Calendrier : <b>{selectedCourse.durationWeeks}</b> semaines de cours + <b>{selectedCourse.breakWeeks}</b> de transition ={' '}
                    <b>{Math.max(1, Math.floor(364 / ((selectedCourse.durationWeeks + selectedCourse.breakWeeks) * 7)))}</b> sessions/an
                  </span>
                  <button
                    className="underline"
                    onClick={() => {
                      const d = prompt('Durée du cours (semaines)', String(selectedCourse.durationWeeks));
                      const b = prompt('Pause entre sessions (semaines)', String(selectedCourse.breakWeeks));
                      if (d && b) act({ action: 'updateCourseCalendar', courseId: selectedCourse.id, durationWeeks: d, breakWeeks: b }, 'Calendrier mis à jour');
                    }}
                  >
                    Modifier
                  </button>
                </div>
              )}

              {data.sessions.length > 0 && (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs text-muted-foreground">
                      <tr><th className="py-2">Session</th><th>Dates</th><th>Étudiants</th><th>Codes</th><th /></tr>
                    </thead>
                    <tbody>
                      {data.sessions.map((s) => {
                        const ended = new Date(s.endDate).getTime() < now;
                        return (
                          <tr key={s.id} className={`border-t border-border ${ended ? 'opacity-50' : ''}`}>
                            <td className="py-2 font-semibold">{s.course.title} · S{s.number} {s.year}</td>
                            <td>{fmt(s.startDate)} → {fmt(s.endDate)}</td>
                            <td>{s._count.students}</td>
                            <td>{s._count.codes}</td>
                            <td className="text-right">
                              {!ended && (
                                <button
                                  disabled={busy}
                                  onClick={() => act({ action: 'generateCodesForSession', sessionId: s.id }, 'Codes générés pour les établissements actifs')}
                                  className={`${btn} border border-border`}
                                >
                                  <KeyRound className="w-4 h-4" /> Codes pour tous
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* 2. Ajouter un établissement */}
            <section className={card}>
              <h2 className="font-bold text-foreground flex items-center gap-2 mb-4">
                <Building2 className="w-5 h-5 text-primary" /> 2. Ajouter un établissement partenaire
              </h2>
              <div className="grid sm:grid-cols-6 gap-3 items-end">
                <label className="text-xs font-bold sm:col-span-2">
                  Nom complet
                  <input className={input} value={inst.name} placeholder="Université Officielle de Mbuji-Mayi" onChange={(e) => setInst({ ...inst, name: e.target.value })} />
                </label>
                <label className="text-xs font-bold">
                  Sigle
                  <input className={input} value={inst.acronym} placeholder="UOM" onChange={(e) => setInst({ ...inst, acronym: e.target.value })} />
                </label>
                <label className="text-xs font-bold">
                  Pays
                  <input className={input} value={inst.country} placeholder="RDC" onChange={(e) => setInst({ ...inst, country: e.target.value })} />
                </label>
                <label className="text-xs font-bold">
                  Type
                  <select className={input} value={inst.type} onChange={(e) => setInst({ ...inst, type: e.target.value })}>
                    <option value="UNIVERSITY">Université</option>
                    <option value="INSTITUTE">Institut technologique</option>
                  </select>
                </label>
                <button
                  disabled={busy || inst.name.trim().length < 3}
                  onClick={async () => {
                    if (await act({ action: 'createInstitution', ...inst }, 'Établissement ajouté')) {
                      setInst({ name: '', acronym: '', country: '', type: 'UNIVERSITY', contactEmail: '' });
                    }
                  }}
                  className={`${btn} bg-primary text-primary-foreground justify-center`}
                >
                  <Plus className="w-4 h-4" /> Ajouter
                </button>
              </div>
            </section>

            {/* 3. Établissements et codes */}
            <section className="space-y-3">
              <h2 className="font-bold text-foreground flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-primary" /> 3. Établissements et codes de convention
              </h2>
              {data.institutions.length === 0 && <p className="text-sm text-muted-foreground">Aucun établissement pour l&apos;instant.</p>}
              {data.institutions.map((i) => {
                const missing = openSessions.filter((s) => !i.codes.some((c: any) => c.sessionId === s.id));
                return (
                  <div key={i.id} className={`${card} ${i.active ? '' : 'opacity-60'}`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-foreground">
                          {i.name} {i.acronym && <span className="text-muted-foreground">({i.acronym})</span>}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {i.type === 'INSTITUTE' ? 'Institut technologique' : 'Université'}
                          {i.country ? ` · ${i.country}` : ''} · {i._count.students} étudiant(s) {i.active ? '' : '· convention inactive'}
                        </p>
                      </div>
                      <button disabled={busy} onClick={() => act({ action: 'toggleInstitution', id: i.id }, i.active ? 'Convention désactivée' : 'Convention réactivée')} className={`${btn} border border-border`}>
                        <Power className="w-4 h-4" /> {i.active ? 'Désactiver' : 'Réactiver'}
                      </button>
                    </div>

                    <div className="mt-3 space-y-2">
                      {i.codes.map((c: any) => {
                        const expired = new Date(c.session.endDate).getTime() < now;
                        return (
                          <div key={c.id} className="flex flex-wrap items-center gap-2 text-sm">
                            <code className={`px-2 py-1 rounded bg-muted font-mono ${!c.active || expired ? 'line-through opacity-60' : ''}`}>{c.code}</code>
                            <span className="text-xs text-muted-foreground">
                              {c.session.course.title} · S{c.session.number} {c.session.year} · jusqu&apos;au {fmt(c.session.endDate)}
                              {expired ? ' · expiré' : !c.active ? ' · désactivé' : ''}
                            </span>
                            {!expired && (
                              <>
                                <button onClick={() => copy(c.code)} className="p-1.5 rounded hover:bg-muted" title="Copier"><Copy className="w-4 h-4" /></button>
                                <button disabled={busy} onClick={() => confirm('Remplacer ce code ? L’ancien ne fonctionnera plus.') && act({ action: 'createCode', institutionId: i.id, sessionId: c.sessionId }, 'Nouveau code généré')} className="p-1.5 rounded hover:bg-muted" title="Nouveau code"><RefreshCw className="w-4 h-4" /></button>
                                <button disabled={busy} onClick={() => act({ action: 'toggleCode', id: c.id }, 'Code mis à jour')} className="p-1.5 rounded hover:bg-muted" title={c.active ? 'Désactiver' : 'Réactiver'}><Power className="w-4 h-4" /></button>
                              </>
                            )}
                          </div>
                        );
                      })}
                      {i.active && missing.map((s) => (
                        <button key={s.id} disabled={busy} onClick={() => act({ action: 'createCode', institutionId: i.id, sessionId: s.id }, 'Code généré')} className={`${btn} border border-dashed border-border text-muted-foreground`}>
                          <KeyRound className="w-4 h-4" /> Générer le code · {s.course.title} S{s.number} {s.year}
                        </button>
                      ))}
                      {i.active && openSessions.length === 0 && (
                        <p className="text-xs text-muted-foreground">Planifiez d&apos;abord une session (étape 1) pour générer un code.</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
