/*
 * The Studio constellation.
 *
 * CHECKPOINT 2 (static): authored cluster positions in a fixed world space,
 * image accumulations, and a seeded SVG layer of lines / dots / stars.
 * Pan, zoom, drift and the hover state arrive in checkpoints 3–4 — but the
 * camera math below is already structured for them (world → screen).
 *
 * Everything procedural is seeded: the composition is identical on every
 * load. The user's authored positions are the anchor.
 */
import { useEffect, useMemo, useRef, useState } from 'react';

export type CImage = { src: string; w: number; h: number };

export type CCluster = {
  id: string;
  slug: string;
  title: string;
  x: number;
  y: number;
  width: number;
  driftRadius: number;
  color: string;
  projectCount: number;
  hoverDescription: string;
  featured: boolean;
  images: CImage[];
  connections: string[];
};

export type CConfig = {
  seed: number;
  world: { width: number; height: number };
};

type Props = {
  clusters: CCluster[];
  config: CConfig;
  basePath: string;
};

/* deterministic PRNG (mulberry32) — same composition on every load */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/* ── cluster image arrangement ────────────────────────────────────────────
   Hand-tuned slot patterns (x/y = top-left as fraction of the cluster box,
   w = image width as fraction). Material accumulating around an invisible
   centre — never a tidy grid. */

type Slot = { x: number; y: number; w: number; rot: number; z: number };

const PATTERNS: Array<Array<[number, number, number]>> = [
  [[0.18, 0.06, 0.64]],
  [
    [0.02, 0.04, 0.44],
    [0.5, 0.4, 0.48],
  ],
  [
    [0.32, 0.0, 0.5],
    [0.0, 0.26, 0.32],
    [0.56, 0.5, 0.4],
  ],
  [
    [0.24, 0.0, 0.46],
    [0.0, 0.28, 0.3],
    [0.54, 0.36, 0.4],
    [0.3, 0.68, 0.3],
  ],
  [
    [0.26, 0.0, 0.44],
    [0.0, 0.22, 0.28],
    [0.46, 0.34, 0.36],
    [0.12, 0.56, 0.26],
    [0.58, 0.64, 0.32],
  ],
];

function slotsFor(count: number, seedStr: string): Slot[] {
  const rand = mulberry32(hashStr(seedStr));
  const n = clamp(count, 1, PATTERNS.length);
  const pattern = PATTERNS[n - 1];
  return pattern.map(([x, y, w], i) => ({
    x: clamp(x + (rand() - 0.5) * 0.03, 0.01, 0.72),
    y: clamp(y + (rand() - 0.5) * 0.03, 0.01, 0.7),
    w,
    rot: (rand() - 0.5) * 4,
    z: i,
  }));
}

/* ── constellation marks (SVG) ────────────────────────────────────────────
   Thin lines (some dashed, some bowed, some overshooting), scattered dots,
   custom 4/8-point stars, open circles and dotted trails. Partly
   atmospheric rather than semantic, as intended. */

type Marks = {
  lines: Array<{ d: string; dashed: boolean }>;
  dots: Array<{ x: number; y: number; r: number; o: number }>;
  stars: Array<{ x: number; y: number; parts: Array<{ d: string; rot: number }> }>;
  circles: Array<{ x: number; y: number; r: number }>;
  trails: Array<Array<{ x: number; y: number; r: number }>>;
};

/* concave-sided sparkle — tips at N/E/S/W, sides pinched toward the centre */
function star4(x: number, y: number, size: number): string {
  const v = size;
  const h = size * 0.55;
  const k = size * 0.1;
  return (
    `M${x},${y - v} Q${x + k},${y - k} ${x + h},${y}` +
    ` Q${x + k},${y + k} ${x},${y + v}` +
    ` Q${x - k},${y + k} ${x - h},${y}` +
    ` Q${x - k},${y - k} ${x},${y - v} Z`
  );
}

/* 8-point sparkle: a 4-point star plus a smaller one rotated 45° */
function star8Parts(
  x: number,
  y: number,
  size: number,
): Array<{ d: string; rot: number }> {
  return [
    { d: star4(x, y, size), rot: 0 },
    { d: star4(x, y, size * 0.62), rot: 45 },
  ];
}

function buildMarks(clusters: CCluster[], config: CConfig): Marks {
  const rand = mulberry32(config.seed);
  const W = config.world.width;
  const H = config.world.height;
  const byId = new Map(clusters.map((c) => [c.id, c]));
  const lines: Marks['lines'] = [];
  const dots: Marks['dots'] = [];
  const stars: Marks['stars'] = [];
  const circles: Marks['circles'] = [];
  const trails: Marks['trails'] = [];

  const seen = new Set<string>();
  for (const c of clusters) {
    for (const t of c.connections) {
      const key = [c.id, t].sort().join('~');
      if (seen.has(key) || !byId.has(t)) continue;
      seen.add(key);
      const b = byId.get(t)!;
      const dashed = rand() < 0.35;
      const bow = (rand() - 0.5) * 90;
      const over = rand() < 0.3 ? 26 + rand() * 36 : 0;
      const dx = b.x - c.x;
      const dy = b.y - c.y;
      const len = Math.hypot(dx, dy) || 1;
      const bx = b.x + (dx / len) * over;
      const by = b.y + (dy / len) * over;
      const mx = (c.x + bx) / 2 - (dy / len) * bow;
      const my = (c.y + by) / 2 + (dx / len) * bow;
      lines.push({
        d: `M${c.x.toFixed(1)},${c.y.toFixed(1)} Q${mx.toFixed(1)},${my.toFixed(1)} ${bx.toFixed(1)},${by.toFixed(1)}`,
        dashed,
      });
    }
  }

  for (let i = 0; i < 85; i++) {
    dots.push({ x: rand() * W, y: rand() * H, r: 0.7 + rand() * 1.4, o: 0.18 + rand() * 0.4 });
  }
  for (let i = 0; i < 12; i++) {
    const statement = rand() < 0.3;
    const size = statement ? 13 + rand() * 9 : 4 + rand() * 6;
    const x = rand() * W;
    const y = rand() * H;
    const kind = rand() < 0.55 ? 4 : 8;
    stars.push({
      x,
      y,
      parts:
        kind === 4
          ? [{ d: star4(x, y, size), rot: rand() * 90 }]
          : star8Parts(x, y, size),
    });
  }
  for (let i = 0; i < 6; i++) {
    circles.push({ x: rand() * W, y: rand() * H, r: 3.5 + rand() * 4.5 });
  }
  for (let i = 0; i < 4; i++) {
    const x0 = rand() * W;
    const y0 = rand() * H;
    const a = rand() * Math.PI * 2;
    const len = 60 + rand() * 90;
    const pts = [];
    for (let k = 0; k < 6; k++) {
      const t = k / 5;
      pts.push({ x: x0 + Math.cos(a) * len * t, y: y0 + Math.sin(a) * len * t, r: 1.7 - t * 1.25 });
    }
    trails.push(pts);
  }
  return { lines, dots, stars, circles, trails };
}

/* ── component ──────────────────────────────────────────────────────────── */

export default function Constellation({ clusters, config, basePath }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [vp, setVp] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setVp({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* static camera for checkpoint 2: fit the whole world into view */
  const cam = useMemo(() => {
    if (!vp) return null;
    const scale =
      Math.min(vp.w / config.world.width, vp.h / config.world.height) * 0.98;
    return {
      scale,
      tx: (vp.w - config.world.width * scale) / 2,
      ty: (vp.h - config.world.height * scale) / 2,
    };
  }, [vp, config.world]);

  const marks = useMemo(() => buildMarks(clusters, config), [clusters, config]);

  const clusterLayouts = useMemo(
    () =>
      clusters.map((c) => ({
        c,
        slots: slotsFor(c.images.length, c.id),
      })),
    [clusters],
  );

  return (
    <div ref={wrapRef} className="constellation" aria-label="Studio constellation">
      {cam && (
        <>
          <svg
            className="star-layer"
            width="100%"
            height="100%"
            aria-hidden="true"
            style={{ position: 'absolute', inset: 0 }}
          >
            <g transform={`translate(${cam.tx} ${cam.ty}) scale(${cam.scale})`}>
              {marks.lines.map((l, i) => (
                <path
                  key={`l${i}`}
                  d={l.d}
                  fill="none"
                  stroke="#1a1915"
                  strokeWidth={0.8}
                  strokeOpacity={0.55}
                  strokeLinecap="round"
                  strokeDasharray={l.dashed ? '1 5' : undefined}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              {marks.trails.map((trail, i) => (
                <g key={`t${i}`}>
                  {trail.map((p, k) => (
                    <circle
                      key={k}
                      cx={p.x}
                      cy={p.y}
                      r={p.r}
                      fill="#1a1915"
                      opacity={0.45}
                    />
                  ))}
                </g>
              ))}
              {marks.dots.map((d, i) => (
                <circle key={`d${i}`} cx={d.x} cy={d.y} r={d.r} fill="#1a1915" opacity={d.o} />
              ))}
              {marks.circles.map((c, i) => (
                <circle
                  key={`c${i}`}
                  cx={c.x}
                  cy={c.y}
                  r={c.r}
                  fill="none"
                  stroke="#1a1915"
                  strokeWidth={0.8}
                  strokeOpacity={0.5}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              {marks.stars.map((s, i) => (
                <g key={`s${i}`}>
                  {s.parts.map((p, k) => (
                    <path
                      key={k}
                      d={p.d}
                      fill="#1a1915"
                      transform={`rotate(${p.rot.toFixed(1)} ${s.x} ${s.y})`}
                    />
                  ))}
                </g>
              ))}
            </g>
          </svg>

          {clusterLayouts.map(({ c, slots }) => {
            const boxW = c.width * cam.scale;
            const boxH = boxW * 0.78;
            return (
              <a
                key={c.id}
                href={`${basePath}/studio/clusters/${c.slug}/`}
                className="constellation-cluster"
                aria-label={`${c.title} — ${c.projectCount} projects`}
                style={{
                  left: cam.tx + (c.x - c.width / 2) * cam.scale,
                  top: cam.ty + (c.y - (c.width * 0.78) / 2) * cam.scale,
                  width: boxW,
                  height: boxH,
                }}
              >
                {c.images.map((im, i) => {
                  const slot = slots[i % slots.length];
                  return (
                    <img
                      key={i}
                      src={im.src}
                      alt={`${c.title} — preview ${i + 1}`}
                      width={im.w}
                      height={im.h}
                      loading={i === 0 ? 'eager' : 'lazy'}
                      style={{
                        left: `${(slot.x * 100).toFixed(2)}%`,
                        top: `${(slot.y * 100).toFixed(2)}%`,
                        width: `${(slot.w * 100).toFixed(2)}%`,
                        transform: `rotate(${slot.rot.toFixed(2)}deg)`,
                        zIndex: slot.z,
                      }}
                    />
                  );
                })}
              </a>
            );
          })}
        </>
      )}
    </div>
  );
}
