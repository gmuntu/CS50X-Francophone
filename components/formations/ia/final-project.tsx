'use client';

import { useEffect, useState } from 'react';
import OralDefense from '@/components/formations/ia/oral-defense';
import VoiceEnroll from '@/components/formations/ia/voice-enroll';
import { useSession } from 'next-auth/react';
import { defensePrompt, PROJECT_PARTS, type ProjectFields } from '@/lib/courses/final-project';

type Project = ProjectFields & { status: string; defenseCount: number; voiceRefUrl?: string | null };



export default function FinalProject({ course }: { course: string }) {
  const PARTS = PROJECT_PARTS[course] ?? [];
  const { data: session } = useSession();
  const [project, setProject] = useState<Project | null>(null);
  const [form, setForm] = useState<ProjectFields>({ prompt: '', aiResponse: '', verification: '', finalVersion: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const load = async () => {
    const d = await fetch(`/api/formations/projet?course=${course}`).then((r) => r.json()).catch(() => ({}));
    if (d?.project) { setProject(d.project); setForm({ prompt: d.project.prompt, aiResponse: d.project.aiResponse, verification: d.project.verification, finalVersion: d.project.finalVersion }); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const submit = async () => {
    setSaving(true); setMsg('');
    try {
      const res = await fetch('/api/formations/projet', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ course, ...form }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error || 'Erreur');
      await load();
    } catch (e: any) { setMsg(e?.message || 'Erreur'); } finally { setSaving(false); }
  };

  const eraseVoice = async () => {
    setMsg('');
    const res = await fetch(`/api/formations/projet/voix?course=${course}`, { method: 'DELETE' });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { setMsg(d?.error || 'Erreur'); return; }
    await load();
  };

  const status = project?.status;
  const step = !project ? 1 : status === 'SUBMITTED' || status === 'REDO' ? 2 : 3;

  return (
    <div id="projet-final" className="rounded-3xl border-2 border-blue-600 bg-card p-5 sm:p-6 space-y-4 scroll-mt-20">
      <div>
        <p className="text-xs font-extrabold tracking-wide text-blue-700 dark:text-blue-300">PROJET FINAL</p>
        <p className="text-xl font-extrabold">Votre projet et sa défense orale avec Socrate</p>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-bold">
        {['1. Dépôt du projet', '2. Défense orale', '3. Validation'].map((t, i) => (
          <span key={t} className={`rounded-lg py-2 ${step === i + 1 ? 'bg-blue-600 text-white' : step > i + 1 ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200' : 'bg-muted text-muted-foreground'}`}>{t}{step > i + 1 ? ' ✓' : ''}</span>
        ))}
      </div>

      {loading && <p className="text-sm text-muted-foreground">Chargement…</p>}

      {!loading && (step === 1 || (step === 2 && status !== 'REDO')) && (
        <div className="space-y-3">
          {PARTS.map((p) => (
            <label key={p.key} className="block">
              <span className="text-sm font-bold">{p.label}</span>
              <span className="block text-xs text-muted-foreground mb-1">{p.hint}</span>
              <textarea value={form[p.key]} onChange={(e) => setForm((f) => ({ ...f, [p.key]: e.target.value }))} rows={4}
                disabled={status === 'VALIDATED'}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" />
            </label>
          ))}
          <button onClick={submit} disabled={saving} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">
            {saving ? 'Envoi…' : project ? 'Mettre à jour mon projet' : 'Déposer mon projet'}
          </button>
          {msg && <p className="text-sm text-red-600">{msg}</p>}
        </div>
      )}

      {!loading && step === 2 && project && (
        <div className="space-y-2">
          {status === 'REDO' && <p className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-3 text-sm">Votre formateur demande une nouvelle défense orale.</p>}
          <p className="text-sm">Projet déposé ✓. Prenez 10 minutes au calme, avec un micro : Socrate va vous poser 5 questions sur <b>votre</b> projet.</p>
          {!project.voiceRefUrl
            ? <VoiceEnroll course={course} name={session?.user?.name || ''} onDone={load} />
            : <>
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/60 dark:bg-blue-950/30 p-3">
                  <p className="text-sm text-blue-700 dark:text-blue-300 font-bold">✓ Empreinte vocale enregistrée</p>
                  <audio controls preload="none" src={project.voiceRefUrl} className="h-9" />
                  <button onClick={eraseVoice} className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-bold">🗑 Effacer et recommencer</button>
                </div>
                {msg && <p className="text-sm text-red-600">{msg}</p>}
                <OralDefense course={course} systemPrompt={defensePrompt(course, project)} onDone={load} />
              </>}
        </div>
      )}

      {!loading && step === 3 && (
        <div className="rounded-xl bg-muted/50 p-4 text-sm">
          {status === 'VALIDATED'
            ? <p><b>🎉 Projet validé !</b> Votre attestation SavoirIA sera disponible ici très bientôt.</p>
            : <p><b>Défense orale terminée ✓.</b> Votre formateur va examiner votre projet et votre défense. Vous serez prévenu de la validation.</p>}
        </div>
      )}
    </div>
  );
}
