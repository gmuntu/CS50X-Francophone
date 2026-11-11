'use client';

import type { VueTableau } from '@/lib/approfondir/tableau';

/**
 * Schéma du tableau, dessiné par le site (aucune image générée) : il se construit étape par étape.
 * `visible` = nombre d'éléments déjà tracés ; `actif` = élément dont le détail est affiché sous le tableau.
 */
interface Props { vue: VueTableau; titre: string; visible: number; actif: number; onChoisir: (i: number) => void }

const W = 1000;
const H = 500;
const BOITE_L = 214;
const BOITE_H = 86;
// Craie sur tableau bleu nuit SavoirIA : blanc cassé, bleu ciel, ambre.
export const CRAIE = '#f4f1e8';
export const BLEU = '#93c5fd';
export const AMBRE = '#fbbf24';
export const NUIT = '#14244f';
export const ENCRE = '#0b1a3d';

interface Point { x: number; y: number }

/** Point du bord de la boîte centrée en `de`, en direction de `vers` (avec une petite marge). */
function bord(de: Point, vers: Point, marge = 10): Point {
  const dx = vers.x - de.x;
  const dy = vers.y - de.y;
  const longueur = Math.hypot(dx, dy) || 1;
  const t = Math.min(dx ? BOITE_L / 2 / Math.abs(dx) : Infinity, dy ? BOITE_H / 2 / Math.abs(dy) : Infinity);
  return { x: de.x + dx * t + (dx / longueur) * marge, y: de.y + dy * t + (dy / longueur) * marge };
}

function anneau(n: number, rx: number, ry: number, departDeg: number): Point[] {
  return Array.from({ length: n }, (_, i) => {
    const a = ((departDeg + (i * 360) / n) * Math.PI) / 180;
    return { x: W / 2 + rx * Math.cos(a), y: H / 2 + ry * Math.sin(a) };
  });
}

/** Étapes en ligne (3 ou moins) ou en serpentin sur deux rangées. */
function serpentin(n: number): Point[] {
  const cols = n <= 3 ? n : Math.ceil(n / 2);
  const x = (c: number) => W / 2 + (c - (cols - 1) / 2) * 300;
  return Array.from({ length: n }, (_, i) => {
    if (n <= 3) return { x: x(i), y: H / 2 };
    return i < cols ? { x: x(i), y: 135 } : { x: x(cols - 1 - (i - cols)), y: 365 };
  });
}

/** Taille de la craie selon la longueur du texte : tout doit tenir dans la bulle. */
const taille = (t: string) => (t.length <= 16 ? 29 : t.length <= 26 ? 24 : t.length <= 40 ? 20 : 16);

function Fleche({ de, vers, etiquette }: { de: Point; vers: Point; etiquette?: string }) {
  const a = bord(de, vers);
  const b = bord(vers, de, 14);
  const milieu = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  return (
    <g>
      <line className="classe-trace" pathLength={1} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={CRAIE} strokeWidth={3} strokeLinecap="round" markerEnd="url(#classe-fleche)" opacity={0.85} />
      {etiquette && (
        <foreignObject x={milieu.x - 100} y={milieu.y - 24} width={200} height={48} className="classe-apparait pointer-events-none">
          <div className="flex h-full items-center justify-center">
            <span className="rounded px-1.5 py-0.5 text-center font-craie text-[21px] leading-none" style={{ background: NUIT, color: BLEU }}>{etiquette}</span>
          </div>
        </foreignObject>
      )}
    </g>
  );
}

function Bulle({ en, texte, numero, actif, accent, onClick }: { en: Point; texte: string; numero?: number; actif?: boolean; accent?: boolean; onClick?: () => void }) {
  const trait = actif ? AMBRE : accent ? BLEU : CRAIE;
  return (
    <g className="classe-apparait" style={{ transformOrigin: `${en.x}px ${en.y}px`, cursor: onClick ? 'pointer' : undefined }} onClick={onClick}>
      <rect x={en.x - BOITE_L / 2} y={en.y - BOITE_H / 2} width={BOITE_L} height={BOITE_H} rx={14} fill="rgba(255,255,255,0.05)" stroke={trait} strokeWidth={actif || accent ? 3.5 : 2.5} />
      <foreignObject x={en.x - BOITE_L / 2 + 8} y={en.y - BOITE_H / 2 + 4} width={BOITE_L - 16} height={BOITE_H - 8}>
        <div className="flex h-full items-center justify-center overflow-hidden text-center font-craie leading-[0.95]" style={{ color: accent ? BLEU : CRAIE, fontSize: taille(texte) }}>
          {texte}
        </div>
      </foreignObject>
      {numero !== undefined && (
        <>
          <circle cx={en.x - BOITE_L / 2} cy={en.y - BOITE_H / 2} r={17} fill={actif ? AMBRE : BLEU} />
          <text x={en.x - BOITE_L / 2} y={en.y - BOITE_H / 2 + 6} textAnchor="middle" fontSize={18} fontWeight={800} fill={ENCRE}>{numero}</text>
        </>
      )}
    </g>
  );
}

function Comparaison({ vue, visible, actif, onChoisir }: Props) {
  const colonnes = vue.colonnes ?? [];
  const couleurs = [BLEU, AMBRE, CRAIE];
  const grille = { gridTemplateColumns: `minmax(0,0.8fr) repeat(${colonnes.length}, minmax(0,1.3fr))` };
  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="grid gap-x-3 gap-y-2" style={grille}>
        <div />
        {colonnes.map((c, k) => (
          <div key={k} className="border-b-2 pb-1 text-center font-craie text-3xl" style={{ borderColor: couleurs[k % 3], color: couleurs[k % 3] }}>{c}</div>
        ))}
        {vue.etapes.slice(0, visible).map((e, i) => (
          <button key={i} type="button" onClick={() => onChoisir(i)} className="classe-apparait grid items-center rounded-lg text-left"
            style={{ ...grille, gridColumn: '1 / -1', background: i === actif ? 'rgba(255,255,255,0.07)' : undefined }}>
            <span className="flex items-center gap-2 py-2 pl-2 text-sm font-semibold text-white/80">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-extrabold" style={{ background: i === actif ? AMBRE : BLEU, color: ENCRE }}>{i + 1}</span>
              {e.label}
            </span>
            {(e.valeurs ?? []).map((v, k) => (
              <span key={k} className="px-2 py-2 text-center font-craie text-2xl leading-tight" style={{ color: CRAIE }}>{v}</span>
            ))}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function SchemaTableau(props: Props) {
  const { vue, titre, visible, actif, onChoisir } = props;
  if (vue.type === 'comparaison') return <Comparaison {...props} />;

  const n = vue.etapes.length;
  if (!n) return null;
  const relations = vue.type === 'relations';
  const centre = { x: W / 2, y: H / 2 };
  const points = relations
    ? n === 4
      ? [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => ({ x: W / 2 + sx * 350, y: H / 2 + sy * 180 })) // aux quatre coins
      : anneau(n, 360, 185, n === 2 ? 180 : -90)
    : vue.type === 'cycle'
      ? anneau(n, 350, 185, -90)
      : serpentin(n);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Schéma : ${titre}`}>
      <defs>
        <marker id="classe-fleche" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill={CRAIE} />
        </marker>
      </defs>
      {relations && <Bulle en={centre} texte={vue.centre || titre} accent />}
      {points.slice(0, visible).map((p, i) => (
        <g key={i}>
          {relations && <Fleche de={centre} vers={p} etiquette={vue.etapes[i].lien} />}
          {!relations && i > 0 && <Fleche de={points[i - 1]} vers={p} />}
          <Bulle en={p} texte={vue.etapes[i].label} numero={i + 1} actif={i === actif} onClick={() => onChoisir(i)} />
        </g>
      ))}
      {vue.type === 'cycle' && visible >= n && n > 2 && <Fleche de={points[n - 1]} vers={points[0]} />}
    </svg>
  );
}
