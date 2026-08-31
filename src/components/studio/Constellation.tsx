/*
 * The Studio constellation — homepage, menu, and instrument.
 *
 * World space: authored cluster anchors (never randomised). All procedural
 * motion is seeded and bounded around those anchors.
 *
 * Checkpoint 3: drag pan, wheel zoom (bounded), map mode when zoomed out,
 * ambient drift with per-cluster depth, cursor rubber-band drag on marks.
 *
 * Checkpoint 4: hover/focus — seeded blob splotch grows from the cluster,
 * marks turn white and twinkle (pointillist spawn/despawn + line shimmer),
 * other clusters fade out, focused cluster scales 1.25 and spreads,
 * info block anchored to the cluster. Keyboard + touch equivalents.
 * prefers-reduced-motion: instant colour, no twinkle/spread/drift.
 *
 * Debug: /studio/?hover=<cluster-id> forces the hover state (for testing
 * and screenshots).
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
  depth: number;
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
  zoom: { min: number; max: number; mapBelow: number };
  drift: { periodSeconds: number; hoverMultiplier: number };
};

type Props = {
  clusters: CCluster[];
  config: CConfig;
  basePath: string;
};

/* ── deterministic randomness ───────────────────────────────────────────── */

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

/* ── cluster image arrangement (no rotation — content stays upright) ───── */

type Slot = { x: number; y: number; w: number; z: number; sx: number; sy: number };

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
    z: i,
    // radial spread direction (unit vector from cluster centre), used on hover
    sx: x + w / 2 - 0.5,
    sy: y + w * 0.39 - 0.39,
  }));
}

/* ── constellation marks ───────────────────────────────────────────────────
   Thin lines (straight / bowed / dashed / overshooting / occasional
   doubles), scattered dots, pointillist patches, cell micro-grids, orbital
   node+ring systems, arc fragments, dash clusters, dotted trails, and a
   family of 4/8-point sparkles. Partly atmospheric by design. */

type Line = { d: string; dashed: boolean; double: boolean };
type Dot = { x: number; y: number; r: number; o: number };
type StarPart = { d: string; rot: number };
type Star = { x: number; y: number; parts: StarPart[] };
type Circle = { x: number; y: number; r: number };
type Arc = { d: string };
type Dash = { x: number; y: number; len: number };
type Patch = { cx: number; cy: number; rx: number; ry: number; n: number; rot: number };
type Lattice = { x: number; y: number; cell: number; n: number; rot: number };
type Orbit = { x: number; y: number; rx: number; ry: number; rot: number };
type Trail = Array<{ x: number; y: number; r: number }>;

type Marks = {
  lines: Line[];
  dots: Dot[];
  stars: Star[];
  circles: Circle[];
  arcs: Arc[];
  dashes: Dash[];
  patches: Patch[];
  lattices: Lattice[];
  orbits: Orbit[];
  trails: Trail[];
};

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

function star8Parts(x: number, y: number, size: number): StarPart[] {
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

  const lines: Line[] = [];
  const dots: Dot[] = [];
  const stars: Star[] = [];
  const circles: Circle[] = [];
  const arcs: Arc[] = [];
  const dashes: Dash[] = [];
  const patches: Patch[] = [];
  const lattices: Lattice[] = [];
  const orbits: Orbit[] = [];
  const trails: Trail[] = [];

  /* cluster-to-cluster edges */
  const seen = new Set<string>();
  const edge = (a: { x: number; y: number }, b: { x: number; y: number }, atmosphere = false) => {
    const dashed = atmosphere ? rand() < 0.6 : rand() < 0.3;
    const bow = (rand() - 0.5) * (atmosphere ? 260 : 110);
    const over = rand() < 0.3 ? 26 + rand() * 40 : 0;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const bx = b.x + (dx / len) * over;
    const by = b.y + (dy / len) * over;
    const mx = (a.x + bx) / 2 - (dy / len) * bow;
    const my = (a.y + by) / 2 + (dx / len) * bow;
    lines.push({
      d: `M${a.x.toFixed(1)},${a.y.toFixed(1)} Q${mx.toFixed(1)},${my.toFixed(1)} ${bx.toFixed(1)},${by.toFixed(1)}`,
      dashed,
      double: !dashed && !atmosphere && rand() < 0.22,
    });
  };

  for (const c of clusters) {
    for (const t of c.connections) {
      const key = [c.id, t].sort().join('~');
      if (seen.has(key) || !byId.has(t)) continue;
      seen.add(key);
      edge(c, byId.get(t)!);
    }
  }

  /* atmospheric lines between scattered points */
  for (let i = 0; i < 5; i++) {
    edge({ x: rand() * W, y: rand() * H }, { x: rand() * W, y: rand() * H }, true);
  }

  /* scattered dots */
  for (let i = 0; i < 150; i++) {
    dots.push({ x: rand() * W, y: rand() * H, r: 0.6 + rand() * 1.4, o: 0.15 + rand() * 0.4 });
  }

  /* sparkles — a few statement stars, many small */
  for (let i = 0; i < 26; i++) {
    const statement = rand() < 0.28;
    const size = statement ? 12 + rand() * 10 : 3.5 + rand() * 6;
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

  /* open circles */
  for (let i = 0; i < 8; i++) {
    circles.push({ x: rand() * W, y: rand() * H, r: 3.5 + rand() * 5 });
  }

  /* large arc fragments (partial circles, thin) */
  for (let i = 0; i < 3; i++) {
    const cx = rand() * W;
    const cy = rand() * H;
    const r = 130 + rand() * 220;
    const a0 = rand() * Math.PI * 2;
    const a1 = a0 + 0.7 + rand() * 1.1;
    const x0 = cx + Math.cos(a0) * r;
    const y0 = cy + Math.sin(a0) * r;
    const x1 = cx + Math.cos(a1) * r;
    const y1 = cy + Math.sin(a1) * r;
    arcs.push({ d: `M${x0.toFixed(1)},${y0.toFixed(1)} A${r},${r} 0 0 1 ${x1.toFixed(1)},${y1.toFixed(1)}` });
  }

  /* clusters of tiny vertical dashes */
  for (let i = 0; i < 6; i++) {
    const x0 = rand() * W;
    const y0 = rand() * H;
    for (let k = 0; k < 6 + Math.floor(rand() * 6); k++) {
      dashes.push({
        x: x0 + (rand() - 0.5) * 46,
        y: y0 + (rand() - 0.5) * 60,
        len: 3 + rand() * 7,
      });
    }
  }

  /* pointillist patches — dense dot clouds */
  for (let i = 0; i < 3; i++) {
    patches.push({
      cx: rand() * W,
      cy: rand() * H,
      rx: 40 + rand() * 60,
      ry: 26 + rand() * 40,
      n: 42,
      rot: rand() * Math.PI,
    });
  }

  /* cell micro-grids of tiny connected stars */
  for (let i = 0; i < 2; i++) {
    lattices.push({
      x: rand() * (W - 220),
      y: rand() * (H - 220),
      cell: 26 + rand() * 16,
      n: 3,
      rot: (rand() - 0.5) * 30,
    });
  }

  /* orbital node + ring systems */
  for (let i = 0; i < 3; i++) {
    orbits.push({
      x: rand() * W,
      y: rand() * H,
      rx: 22 + rand() * 26,
      ry: 7 + rand() * 9,
      rot: rand() * 180,
    });
  }

  /* dotted trails */
  for (let i = 0; i < 6; i++) {
    const x0 = rand() * W;
    const y0 = rand() * H;
    const a = rand() * Math.PI * 2;
    const len = 60 + rand() * 110;
    const pts = [];
    for (let k = 0; k < 6; k++) {
      const t = k / 5;
      pts.push({ x: x0 + Math.cos(a) * len * t, y: y0 + Math.sin(a) * len * t, r: 1.7 - t * 1.25 });
    }
    trails.push(pts);
  }

  return { lines, dots, stars, circles, arcs, dashes, patches, lattices, orbits, trails };
}

/* irregular blob (the hover splotch) — seeded per cluster, unit radius 100 */
function blobPath(seedStr: string): string {
  const rand = mulberry32(hashStr(seedStr));
  const lobes = 5 + Math.floor(rand() * 3);
  const N = 26;
  const radii: number[] = [];
  for (let i = 0; i < N; i++) {
    const t = (i / N) * lobes * Math.PI * 2;
    const lobe = 0.62 + 0.38 * (0.5 + 0.5 * Math.sin(t + rand() * 0.6));
    radii.push(100 * clamp(lobe * (0.82 + rand() * 0.36), 0.45, 1.35));
  }
  /* smooth closed curve through the radius points (Catmull-Rom → bezier) */
  const pts = radii.map((r, i) => {
    const a = (i / N) * Math.PI * 2;
    return [Math.cos(a) * r, Math.sin(a) * r] as const;
  });
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < N; i++) {
    const p0 = pts[(i - 1 + N) % N];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % N];
    const p3 = pts[(i + 2) % N];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d + ' Z';
}

/* twinkle dots — appear/despawn across the field while hovering */
function twinkleDots(config: CConfig): Array<{ x: number; y: number; delay: number; dur: number; r: number }> {
  const rand = mulberry32(config.seed ^ 0x9e3779b9);
  const out = [];
  for (let i = 0; i < 130; i++) {
    out.push({
      x: rand() * config.world.width,
      y: rand() * config.world.height,
      delay: rand() * 9,
      dur: 5 + rand() * 6,
      r: 0.7 + rand() * 1.6,
    });
  }
  return out;
}

/* ── component ──────────────────────────────────────────────────────────── */

export default function Constellation({ clusters, config, basePath }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const markLayerRef = useRef<SVGGElement>(null);
  const twinkleLayerRef = useRef<SVGGElement>(null);
  const splotchRef = useRef<SVGPathElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);
  const clusterRefs = useRef<Map<string, HTMLElement>>(new Map());
  const labelRefs = useRef<Map<string, HTMLElement>>(new Map());

  const [vp, setVp] = useState<{ w: number; h: number } | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isTouch, setIsTouch] = useState(false);

  const reduced = useRef(false);
  const cam = useRef({ cx: config.world.width / 2, cy: config.world.height / 2, scale: 0.6 });
  const camTarget = useRef({ ...cam.current });
  const drag = useRef<{ on: boolean; x: number; y: number; moved: boolean }>({ on: false, x: 0, y: 0, moved: false });
  const pointerVel = useRef({ x: 0, y: 0, vx: 0, vy: 0, lx: 0, ly: 0 });
  const markOffset = useRef({ x: 0, y: 0, vx: 0, vy: 0 });
  const mapMode = useRef(false);
  const activeRef = useRef<string | null>(null);

  const layouts = useMemo(
    () =>
      clusters.map((c) => ({
        c,
        slots: slotsFor(c.images.length, c.id),
        blob: blobPath(c.id),
        phase: hashStr(c.id) % 1000,
      })),
    [clusters],
  );

  const marks = useMemo(() => buildMarks(clusters, config), [clusters, config]);
  const twinkles = useMemo(() => twinkleDots(config), [config]);

  /* initial forced hover (debug/preview) + touch detection + reduced motion */
  useEffect(() => {
    const forced = new URLSearchParams(window.location.search).get('hover');
    if (forced && clusters.some((c) => c.id === forced)) setActiveId(forced);
    setIsTouch(window.matchMedia('(hover: none)').matches);
    reduced.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, [clusters]);

  /* size */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setVp({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* initial camera: frame the featured clusters */
  useEffect(() => {
    if (!vp) return;
    const featured = clusters.filter((c) => c.featured);
    const box = featured.length
      ? featured.reduce(
          (acc, c) => ({
            x0: Math.min(acc.x0, c.x - c.width),
            y0: Math.min(acc.y0, c.y - c.width * 0.6),
            x1: Math.max(acc.x1, c.x + c.width),
            y1: Math.max(acc.y1, c.y + c.width * 0.6),
          }),
          { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity },
        )
      : { x0: 0, y0: 0, x1: config.world.width, y1: config.world.height };
    const cx = (box.x0 + box.x1) / 2;
    const cy = (box.y0 + box.y1) / 2;
    const scale = clamp(
      Math.min(vp.w / (box.x1 - box.x0), vp.h / (box.y1 - box.y0)) * 0.94,
      config.zoom.min,
      1.1,
    );
    cam.current = { cx, cy, scale };
    camTarget.current = { cx, cy, scale };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vp]);

  /* pointer velocity + rubber-band mark drag */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const onMove = (e: PointerEvent) => {
      pointerVel.current.vx = e.clientX - pointerVel.current.lx;
      pointerVel.current.vy = e.clientY - pointerVel.current.ly;
      pointerVel.current.lx = e.clientX;
      pointerVel.current.ly = e.clientY;

      if (drag.current.on) {
        const t = camTarget.current;
        const s = t.scale;
        t.cx -= (e.clientX - drag.current.x) / s;
        t.cy -= (e.clientY - drag.current.y) / s;
        drag.current.x = e.clientX;
        drag.current.y = e.clientY;
        drag.current.moved = drag.current.moved || Math.abs(e.movementX ?? 0) + Math.abs(e.movementY ?? 0) > 2;
        clampCamera(t, config);
      }
    };
    const onDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest('.constellation-cluster')) return;
      drag.current = { on: true, x: e.clientX, y: e.clientY, moved: false };
      el.classList.add('grabbing');
    };
    const onUp = () => {
      drag.current.on = false;
      el.classList.remove('grabbing');
    };

    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);
    return () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
    };
  }, [config]);

  /* wheel zoom to cursor (non-passive) */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const t = { ...camTarget.current };
      const factor = Math.exp(-e.deltaY * 0.0016);
      const next = clamp(t.scale * factor, config.zoom.min, config.zoom.max);
      const rect = el.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      /* keep the point under the cursor fixed */
      const wx = t.cx + (px - vp!.w / 2) / t.scale;
      const wy = t.cy + (py - vp!.h / 2) / t.scale;
      t.cx = wx - (px - vp!.w / 2) / next;
      t.cy = wy - (py - vp!.h / 2) / next;
      t.scale = next;
      clampCamera(t, config);
      camTarget.current = t;
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [config, vp]);

  /* the rAF loop: camera lerp, drift, mark drag, map mode, hover geometry */
  useEffect(() => {
    if (!vp) return;
    let raf = 0;
    let last = performance.now();
    let running = true;

    const tick = (now: number) => {
      if (!running) return;
            last = now;
      const t = now / 1000;

      /* camera easing */
      const c = cam.current;
      const tg = camTarget.current;
      c.cx += (tg.cx - c.cx) * 0.16;
      c.cy += (tg.cy - c.cy) * 0.16;
      c.scale += (tg.scale - c.scale) * 0.16;

      const active = activeRef.current;

      /* mark layer rubber-band drag toward pointer movement */
      const mo = markOffset.current;
      const dragK = reduced.current ? 0 : 2.2;
      mo.vx += (pointerVel.current.vx * dragK - mo.vx) * 0.09;
      mo.vy += (pointerVel.current.vy * dragK - mo.vy) * 0.09;
      pointerVel.current.vx *= 0.82;
      pointerVel.current.vy *= 0.82;
      mo.vx *= 0.9;
      mo.vy *= 0.9;
      mo.x += mo.vx * 0.02;
      mo.y += mo.vy * 0.02;
      mo.x = clamp(mo.x, -26, 26);
      mo.y = clamp(mo.y, -26, 26);

      const tx = vp.w / 2 - c.cx * c.scale + mo.x;
      const ty = vp.h / 2 - c.cy * c.scale + mo.y;
      markLayerRef.current?.setAttribute('transform', `translate(${tx} ${ty}) scale(${c.scale})`);
      twinkleLayerRef.current?.setAttribute('transform', `translate(${tx} ${ty}) scale(${c.scale})`);

      /* map mode toggling */
      const map = c.scale < config.zoom.mapBelow;
      if (map !== mapMode.current) {
        mapMode.current = map;
        wrapRef.current?.classList.toggle('map', map);
      }

      /* clusters: drift + camera + hover geometry */
      for (const { c: cl, phase } of layouts) {
        const el = clusterRefs.current.get(cl.id);
        if (!el) continue;
        const hovered = active === cl.id;
        /* hovered cluster holds still so its info block stays anchored */
        const driftAmp = hovered || reduced.current ? 0 : cl.driftRadius * cl.depth * (active ? config.drift.hoverMultiplier : 1);
        const dx =
          Math.sin(t * ((2 * Math.PI) / config.drift.periodSeconds) + phase) * driftAmp +
          Math.sin(t * ((2 * Math.PI) / (config.drift.periodSeconds * 0.53)) + phase * 1.7) * driftAmp * 0.6;
        const dy =
          Math.cos(t * ((2 * Math.PI) / (config.drift.periodSeconds * 0.77)) + phase * 2.3) * driftAmp +
          Math.sin(t * ((2 * Math.PI) / (config.drift.periodSeconds * 0.41)) + phase * 0.6) * driftAmp * 0.55;

        const sx = vp.w / 2 + (cl.x + dx - c.cx) * c.scale;
        const sy = vp.h / 2 + (cl.y + dy - c.cy) * c.scale;
        const boxW = cl.width;
        el.style.transform = `translate(${sx - boxW / 2}px, ${sy - boxW * 0.39}px) scale(${c.scale})`;

        const label = labelRefs.current.get(cl.id);
        if (label) {
          label.style.left = `${sx}px`;
          label.style.top = `${sy}px`;
        }
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    const onVis = () => {
      running = !document.hidden && !reduced.current;
      if (running) {
        last = performance.now();
        raf = requestAnimationFrame(tick);
      }
    };
    document.addEventListener('visibilitychange', onVis);
    if (reduced.current) {
      /* static render: one frame, no loop */
      running = false;
      raf = requestAnimationFrame(tick);
    }
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vp, layouts, clusters, config]);

  /* hover state ↔ body hook (hides hint/footer) + splotch open/withdraw */
  const lastActive = useRef<string | null>(null);
  useEffect(() => {
    const prev = lastActive.current;
    activeRef.current = activeId;
    const on = Boolean(activeId);
    document.body.dataset.studioHover = on ? '1' : '';

    /* the splotch is positioned once per state change and CSS-animated —
       the active cluster holds still (drift paused), so the anchor is stable */
    const position = (clusterId: string, open: boolean) => {
      const sp = splotchRef.current;
      if (!sp || !vp) return;
      const cl = clusters.find((x) => x.id === clusterId);
      if (!cl) return;
      const c = cam.current;
      const sx = vp.w / 2 + (cl.x - c.cx) * c.scale;
      const sy = vp.h / 2 + (cl.y - c.cy) * c.scale;
      /* blob radii range ~45–135 units; scale so the SHALLOWEST lobe still
         covers the farthest viewport corner */
      const coverNeeded = Math.hypot(Math.max(sx, vp.w - sx), Math.max(sy, vp.h - sy)) * 1.06;
      sp.setAttribute(
        'transform',
        `translate(${sx.toFixed(1)} ${sy.toFixed(1)}) scale(${open ? (coverNeeded / 42).toFixed(2) : '0.02'})`,
      );
      sp.classList.toggle('open', open);
    };

    if (activeId) {
      position(activeId, true);
      const info = infoRef.current;
      const cl = clusters.find((x) => x.id === activeId);
      if (info && cl && vp) {
        const c = cam.current;
        const sx = vp.w / 2 + (cl.x - c.cx) * c.scale;
        const sy = vp.h / 2 + (cl.y - c.cy) * c.scale;
        const placeRight = sx < vp.w * 0.58;
        info.style.left = placeRight ? `${sx + (cl.width * c.scale) / 2 + 44}px` : '';
        info.style.right = placeRight ? '' : `${vp.w - sx + (cl.width * c.scale) / 2 + 44}px`;
        info.style.top = `${sy - 44}px`;
      }
    } else if (prev) position(prev, false);

    lastActive.current = activeId;
    return () => {
      document.body.dataset.studioHover = '';
    };
  }, [activeId, clusters, vp]);

  const activate = (id: string | null) => {
    setActiveId(id);
  };

  const onClusterClick = (id: string) => (e: import("react").MouseEvent) => {
    if (drag.current.moved) {
      e.preventDefault();
      return;
    }
    if (isTouch && activeId !== id) {
      e.preventDefault();
      activate(id);
    }
  };

  const activeCluster = clusters.find((c) => c.id === activeId) ?? null;
  const splotchCluster = layouts.find((l) => l.c.id === activeId);

  return (
    <div
      ref={wrapRef}
      className={'constellation' + (activeId ? ' hovered' : '')}
      aria-label="Studio constellation"
    >
      {vp && (
        <>
          {/* hover colour — the seeded splotch */}
          <svg className="splotch-layer" width="100%" height="100%" aria-hidden="true">
            {splotchCluster && (
              <path
                ref={splotchRef}
                d={splotchCluster.blob}
                fill={splotchCluster.c.color}
                transform="translate(-4000 -4000) scale(0.01)"
              />
            )}
          </svg>

          {/* black / white constellation geometry */}
          <svg className="star-layer" width="100%" height="100%" aria-hidden="true">
            <g ref={markLayerRef} transform={`translate(${vp.w / 2} ${vp.h / 2})`}>
              {marks.lines.map((l, i) => (
                <path
                  key={`l${i}`}
                  className="ln"
                  d={l.d}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={0.8}
                  strokeOpacity={0.55}
                  strokeLinecap="round"
                  strokeDasharray={l.dashed ? '1 5' : undefined}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              {marks.lines
                .filter((l) => l.double)
                .map((l, i) => (
                  <path
                    key={`ld${i}`}
                    className="ln"
                    d={l.d}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={0.8}
                    strokeOpacity={0.25}
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                    transform="translate(3 3)"
                  />
                ))}
              {marks.arcs.map((a, i) => (
                <path
                  key={`a${i}`}
                  d={a.d}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={0.7}
                  strokeOpacity={0.3}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              {marks.trails.map((trail, i) => (
                <g key={`t${i}`}>
                  {trail.map((p, k) => (
                    <circle key={k} cx={p.x} cy={p.y} r={p.r} fill="currentColor" opacity={0.45} />
                  ))}
                </g>
              ))}
              {marks.dots.map((d, i) => (
                <circle key={`d${i}`} cx={d.x} cy={d.y} r={d.r} fill="currentColor" opacity={d.o} />
              ))}
              {marks.patches.map((p, i) => {
                const rand = mulberry32(config.seed + i * 7);
                const cell = [];
                for (let k = 0; k < p.n; k++) {
                  const a = rand() * Math.PI * 2;
                  const rr = Math.sqrt(rand());
                  cell.push(
                    <circle
                      key={k}
                      cx={p.cx + Math.cos(a) * rr * p.rx}
                      cy={p.cy + Math.sin(a) * rr * p.ry}
                      r={0.5 + rand()}
                      fill="currentColor"
                      opacity={0.2 + rand() * 0.45}
                    />,
                  );
                }
                return <g key={`p${i}`}>{cell}</g>;
              })}
              {marks.dashes.map((d, i) => (
                <line
                  key={`dh${i}`}
                  x1={d.x}
                  y1={d.y}
                  x2={d.x}
                  y2={d.y + d.len}
                  stroke="currentColor"
                  strokeWidth={0.9}
                  strokeOpacity={0.4}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              {marks.lattices.map((l, i) => {
                const cell = [];
                for (let r = 0; r < l.n; r++) {
                  for (let c2 = 0; c2 < l.n; c2++) {
                    const x = l.x + c2 * l.cell;
                    const y = l.y + r * l.cell;
                    cell.push(<path key={`s${r}${c2}`} d={star4(x, y, 3.4)} fill="currentColor" opacity={0.75} />);
                    if (c2 < l.n - 1)
                      cell.push(
                        <line key={`h${r}${c2}`} x1={x} y1={y} x2={x + l.cell} y2={y} stroke="currentColor" strokeWidth={0.5} strokeOpacity={0.35} vectorEffect="non-scaling-stroke" />,
                      );
                    if (r < l.n - 1)
                      cell.push(
                        <line key={`v${r}${c2}`} x1={x} y1={y} x2={x} y2={y + l.cell} stroke="currentColor" strokeWidth={0.5} strokeOpacity={0.35} vectorEffect="non-scaling-stroke" />,
                      );
                  }
                }
                return (
                  <g key={`lat${i}`} transform={`rotate(${l.rot} ${l.x} ${l.y})`}>
                    {cell}
                  </g>
                );
              })}
              {marks.orbits.map((o, i) => (
                <g key={`o${i}`} transform={`rotate(${o.rot} ${o.x} ${o.y})`}>
                  <ellipse cx={o.x} cy={o.y} rx={o.rx} ry={o.ry} fill="none" stroke="currentColor" strokeWidth={0.7} strokeOpacity={0.5} vectorEffect="non-scaling-stroke" />
                  <circle cx={o.x + o.rx} cy={o.y} r={1.6} fill="currentColor" />
                  <path d={star4(o.x, o.y, 5)} fill="currentColor" opacity={0.8} />
                </g>
              ))}
              {marks.circles.map((c, i) => (
                <circle key={`c${i}`} cx={c.x} cy={c.y} r={c.r} fill="none" stroke="currentColor" strokeWidth={0.8} strokeOpacity={0.5} vectorEffect="non-scaling-stroke" />
              ))}
              {marks.stars.map((s, i) => (
                <g key={`s${i}`} className="pulse">
                  {s.parts.map((p, k) => (
                    <path key={k} d={p.d} fill="currentColor" transform={`rotate(${p.rot.toFixed(1)} ${s.x} ${s.y})`} />
                  ))}
                </g>
              ))}
            </g>
          </svg>

          {/* pointillist spawn/despawn layer — visible only on hover */}
          <svg className="twinkle-layer" width="100%" height="100%" aria-hidden="true">
            <g ref={twinkleLayerRef} transform={`translate(${vp.w / 2} ${vp.h / 2})`}>
              {twinkles.map((d, i) => (
                <circle
                  key={i}
                  cx={d.x}
                  cy={d.y}
                  r={d.r}
                  fill="currentColor"
                  className="tw"
                  style={{ animationDelay: `${d.delay.toFixed(2)}s`, animationDuration: `${d.dur.toFixed(2)}s` }}
                />
              ))}
            </g>
          </svg>

          {/* clusters */}
          {layouts.map(({ c, slots }) => (
            <a
              key={c.id}
              ref={(el) => {
                if (el) clusterRefs.current.set(c.id, el);
                else clusterRefs.current.delete(c.id);
              }}
              href={`${basePath}/studio/clusters/${c.slug}/`}
              className={[
                'constellation-cluster',
                activeId === c.id ? 'active' : '',
                Boolean(activeId) && activeId !== c.id ? 'dimmed' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-label={`${c.title} — ${c.projectCount} projects`}
              style={{ width: c.width, height: c.width * 0.78 }}
              onPointerEnter={() => !isTouch && activate(c.id)}
              onPointerLeave={() => !isTouch && activeId === c.id && activate(null)}
              onFocus={() => activate(c.id)}
              onBlur={() => activeId === c.id && activate(null)}
              onClick={onClusterClick(c.id)}
            >
              <span className="cluster-inner">
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
                      style={
                        {
                          left: `${(slot.x * 100).toFixed(2)}%`,
                          top: `${(slot.y * 100).toFixed(2)}%`,
                          width: `${(slot.w * 100).toFixed(2)}%`,
                          zIndex: slot.z,
                          '--sx': `${(slot.sx * 26).toFixed(1)}px`,
                          '--sy': `${(slot.sy * 26).toFixed(1)}px`,
                        } as import('react').CSSProperties
                      }
                    />
                  );
                })}
              </span>
            </a>
          ))}

          {/* map-mode titles (screen space, readable when zoomed out) */}
          {layouts.map(({ c }) => (
            <span
              key={`m${c.id}`}
              ref={(el) => {
                if (el) labelRefs.current.set(c.id, el);
                else labelRefs.current.delete(c.id);
              }}
              className="map-label"
              aria-hidden="true"
            >
              {c.title}
            </span>
          ))}

          {/* cluster info (hover/focus) */}
          {activeCluster && (
            <div ref={infoRef} className="cluster-info">
              <p className="ci-kicker">● cluster {String(clusters.findIndex((x) => x.id === activeCluster.id) + 1).padStart(2, '0')}</p>
              <h2 className="ci-title">{activeCluster.title}</h2>
              <p className="ci-desc">{activeCluster.hoverDescription}</p>
              <p className="ci-meta">{activeCluster.projectCount} projects</p>
              <a className="ci-link" href={`${basePath}/studio/clusters/${activeCluster.slug}/`}>
                → view cluster
              </a>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function clampCamera(t: { cx: number; cy: number; scale: number }, config: CConfig) {
  t.cx = clamp(t.cx, -config.world.width * 0.15, config.world.width * 1.15);
  t.cy = clamp(t.cy, -config.world.height * 0.15, config.world.height * 1.15);
  t.scale = clamp(t.scale, config.zoom.min, config.zoom.max);
}
