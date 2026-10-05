'use client';

import { createZip, type ZipEntry } from '@/lib/zip';
import { AUDIO_CACHE } from '@/lib/offline';

// « Pack de la semaine » : un ZIP qui s'ouvre sans Internet ni application,
// partageable par Bluetooth, WhatsApp, Xender ou clé USB.

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const para = (s: unknown) => esc(s).replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br>');

function asList(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => (typeof x === 'string' ? x : x?.text ?? x?.label ?? x?.concept ?? x?.title ?? JSON.stringify(x)));
  if (v && typeof v === 'object') return Object.values(v as Record<string, unknown>).map((x) => String(x));
  return [];
}

function optionEntries(options: unknown): { key: string; label: string }[] {
  if (Array.isArray(options)) {
    return options.map((o, i) =>
      typeof o === 'string' ? { key: String.fromCharCode(65 + i), label: o } : { key: String(o?.key ?? o?.id ?? String.fromCharCode(65 + i)), label: String(o?.text ?? o?.label ?? o?.value ?? '') }
    );
  }
  if (options && typeof options === 'object') return Object.entries(options as Record<string, unknown>).map(([k, v]) => ({ key: k, label: String(v) }));
  return [];
}

export interface PackInput {
  week: number;
  title: string;
  description?: string;
  topics?: string[];
  summary?: any;
  quizzes?: any[];
  exercises?: any[];
  podcasts: { title: string; url: string }[];
  includeAudio: boolean;
  siteUrl: string;
}

function buildHtml(p: PackInput, audioFiles: { title: string; file: string }[]) {
  const s = p.summary;
  const concepts = asList(s?.keyConcepts);
  const quizzes = p.quizzes ?? [];
  const quizData = quizzes.map((q) => ({
    title: q?.title ?? 'Quiz',
    questions: (q?.questions ?? []).map((qq: any) => ({
      q: String(qq?.question ?? ''),
      options: optionEntries(qq?.options),
      correct: String(qq?.correctOption ?? ''),
      explanation: String(qq?.explanation ?? ''),
    })),
  }));

  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Semaine ${p.week} — ${esc(p.title)} | SavoirIA</title>
<style>
:root{--bg:#fff;--fg:#0f172a;--mut:#64748b;--card:#f8fafc;--bd:#e2e8f0;--pri:#cc0000;--ok:#059669;--ko:#dc2626}
@media(prefers-color-scheme:dark){:root{--bg:#0f172a;--fg:#e2e8f0;--mut:#94a3b8;--card:#1e293b;--bd:#334155}}
*{box-sizing:border-box}body{margin:0;font:16px/1.6 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:var(--bg);color:var(--fg)}
main{max-width:760px;margin:auto;padding:16px}h1{font-size:1.6rem;margin:.2em 0}h2{font-size:1.2rem;margin-top:2em;border-bottom:2px solid var(--pri);padding-bottom:4px}
.tag{display:inline-block;background:var(--pri);color:#fff;border-radius:99px;padding:2px 10px;font-size:.8rem;font-weight:700}
.card{background:var(--card);border:1px solid var(--bd);border-radius:12px;padding:14px;margin:10px 0}.mut{color:var(--mut);font-size:.9rem}
audio{width:100%;margin-top:6px}nav a{margin-right:12px;color:var(--pri);font-weight:600}
label{display:block;padding:8px 10px;border:1px solid var(--bd);border-radius:8px;margin:6px 0;cursor:pointer}
.ok{border-color:var(--ok);background:rgba(5,150,105,.12)}.ko{border-color:var(--ko);background:rgba(220,38,38,.1)}
button{background:var(--pri);color:#fff;border:0;border-radius:8px;padding:8px 14px;font-weight:700;cursor:pointer}
.exp{display:none;margin-top:6px}.done .exp{display:block}pre{white-space:pre-wrap}
</style></head><body><main>
<span class="tag">Semaine ${p.week}</span>
<h1>${esc(p.title)}</h1>
<p class="mut">${esc(p.description)}</p>
<nav>${audioFiles.length ? '<a href="#podcasts">Podcasts</a>' : ''}<a href="#resume">Résumé</a>${quizData.length ? '<a href="#quiz">Quiz</a>' : ''}${p.exercises?.length ? '<a href="#exercices">Exercices</a>' : ''}</nav>

${audioFiles.length ? `<h2 id="podcasts">Podcasts</h2>${audioFiles.map((a) => `<div class="card"><strong>${esc(a.title)}</strong><audio controls preload="none" src="${esc(a.file)}"></audio></div>`).join('')}` : p.podcasts.length ? `<p class="card mut">Pack léger : les podcasts ne sont pas inclus. Téléchargez le pack complet quand vous aurez du Wi-Fi.</p>` : ''}

<h2 id="resume">Résumé</h2>
${s ? `<div class="card"><strong>${esc(s.title)}</strong><p>${para(s.overview)}</p></div>
${concepts.length ? `<h3>Notions clés</h3><ul>${concepts.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>` : ''}
${s.pedagogicalTakeaway ? `<div class="card"><strong>À retenir</strong><p>${para(s.pedagogicalTakeaway)}</p></div>` : ''}
${s.fullMarkdown ? `<details class="card"><summary><strong>Résumé détaillé</strong></summary><pre>${esc(s.fullMarkdown)}</pre></details>` : ''}` : '<p class="mut">Le résumé de cette semaine n\'est pas encore disponible.</p>'}

${quizData.length ? `<h2 id="quiz">Quiz (corrigé automatique)</h2><div id="quizzes"></div>` : ''}

${p.exercises?.length ? `<h2 id="exercices">Exercices</h2>${p.exercises.map((e: any) => `<div class="card"><strong>${esc(e?.title)}</strong> <span class="mut">(${esc(e?.difficulty)})</span><p>${para(e?.description)}</p><pre>${esc(e?.instructions)}</pre></div>`).join('')}<p class="mut">Rendez vos exercices sur ${esc(p.siteUrl)} quand vous aurez une connexion.</p>` : ''}

<p class="mut" style="margin-top:3em">Pack SavoirIA — accompagnement indépendant en français pour CS50x (cours de l'Université Harvard, non affilié). Généré le ${new Date().toLocaleDateString('fr-FR')}. ${esc(p.siteUrl)}</p>
</main>
<script>
var Q=${JSON.stringify(quizData).replace(/</g, '\\u003c')};
var root=document.getElementById('quizzes');
if(root){Q.forEach(function(qz,qi){var h='<div class="card"><strong>'+esc(qz.title)+'</strong>';
qz.questions.forEach(function(q,i){h+='<div class="q" data-c="'+esc(q.correct)+'"><p><b>'+(i+1)+'.</b> '+esc(q.q)+'</p>';
q.options.forEach(function(o){h+='<label><input type="radio" name="q'+qi+'_'+i+'" value="'+esc(o.key)+'"> '+esc(o.label)+'</label>'});
h+='<div class="exp mut">'+esc(q.explanation)+'</div></div>'});
h+='<button data-qi="'+qi+'">Corriger</button> <span class="score"></span></div>';root.insertAdjacentHTML('beforeend',h)});
root.addEventListener('click',function(ev){var b=ev.target;if(!b.dataset||b.dataset.qi===undefined)return;var card=b.parentNode,good=0,qs=card.querySelectorAll('.q');
qs.forEach(function(q){q.classList.add('done');var c=q.dataset.c;q.querySelectorAll('label').forEach(function(l){var inp=l.querySelector('input');l.classList.remove('ok','ko');
var isC=inp.value===c||l.textContent.trim()===c;if(isC)l.classList.add('ok');else if(inp.checked)l.classList.add('ko');if(isC&&inp.checked)good++})});
card.querySelector('.score').textContent=good+' / '+qs.length})}
function esc(s){return String(s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
</script></body></html>`;
}

const slug = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 40) || 'podcast';

async function getAudio(url: string): Promise<Uint8Array> {
  const abs = new URL(url, window.location.origin).toString();
  // Déjà enregistré pour le hors ligne ? On ne retélécharge pas (économie de données).
  if ('caches' in window) {
    const hit = await (await caches.open(AUDIO_CACHE)).match(abs, { ignoreSearch: true });
    if (hit) return new Uint8Array(await hit.arrayBuffer());
  }
  const res = await fetch(abs, new URL(abs).origin === window.location.origin ? {} : { mode: 'cors' });
  if (!res.ok) throw new Error(String(res.status));
  return new Uint8Array(await res.arrayBuffer());
}

export async function buildWeekPack(p: PackInput, onProgress?: (done: number, total: number) => void) {
  const entries: ZipEntry[] = [];
  const audioFiles: { title: string; file: string }[] = [];
  const failed: string[] = [];
  const list = p.includeAudio ? p.podcasts : [];
  const total = list.length + 1;
  let done = 0;

  for (const [i, pod] of list.entries()) {
    try {
      const data = await getAudio(pod.url);
      if (data.length > 0) {
        const file = `podcasts/${String(i + 1).padStart(2, '0')}-${slug(pod.title)}.mp3`;
        entries.push({ name: file, data });
        audioFiles.push({ title: pod.title, file });
      }
    } catch {
      failed.push(pod.title);
    }
    onProgress?.(++done, total);
  }

  entries.unshift({ name: 'OUVRIR-MOI.html', data: buildHtml(p, audioFiles) });
  entries.push({
    name: 'LISEZMOI.txt',
    data: `SavoirIA — Semaine ${p.week} : ${p.title}\r\n\r\n1. Décompressez ce fichier (appui long > Extraire, ou double-clic sur ordinateur).\r\n2. Ouvrez OUVRIR-MOI.html avec votre navigateur (Chrome, Safari...).\r\n3. Tout fonctionne sans Internet : résumé, podcasts, quiz corrigé.\r\n\r\nVous pouvez partager ce fichier avec vos camarades par Bluetooth, WhatsApp, Xender ou clé USB.\r\nSite : ${p.siteUrl}\r\n`,
  });
  onProgress?.(++done, total);

  const blob = createZip(entries);
  const name = `savoiria-semaine-${p.week}${p.includeAudio ? '' : '-leger'}.zip`;
  return { blob, name, failed };
}

export function downloadBlob(blob: Blob, name: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 30_000);
}

/** Partage natif (WhatsApp, Bluetooth...) quand le téléphone le permet. */
export async function shareBlob(blob: Blob, name: string) {
  const file = new File([blob], name, { type: 'application/zip' });
  const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
  if (nav.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: name });
    return true;
  }
  return false;
}
