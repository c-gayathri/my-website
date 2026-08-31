/*
 * The Studio constellation — homepage, menu, and instrument.
 *
 * DESIGN (v2, per art direction):
 * - Cluster images: centre masonry — no overlap, gaps, seeded asymmetry.
 * - Marks are NODES: every star/dot drifts constantly on its own two sines;
 *   lines are drawn between drifted node positions (with breaks/joints), so
 *   the whole web moves independently and never freezes.
 * - Cursor physics: marks near the cursor are PUSHED in the direction of
 *   cursor movement (dragged through the field) and relax slowly back.
 * - Hover: camera zooms to the cluster; everything else is removed; the
 *   field turns white with violent twinkle; the header goes white; an info
 *   block anchors beside the cluster; the colour splotch grows from the
 *   cluster and withdraws on exit.
 * - Title plates: background-coloured rectangles at cluster centres —
 *   visible at rest and in map mode, hidden while hovering.
 * - Controls: focus (authored view) and map (whole world) at the right edge.
 * - prefers-reduced-motion: no drift/push/twinkle; instant colour switch.
 *
 * Debug: /studio/?hover=<cluster-id> forces the hover state.
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

/* ── star shapes (drawn at origin; positioned via transform) ────────────── */

function star4Path(size: number): string {
  const v = size;
  const h = size * 0.55;
  const k = size * 0.1;
  return (
    `M0,${-v} Q${k},${-k} ${h},0` +
    ` Q${k},${k} 0,${v}` +
    ` Q${-k},${k} ${-h},0` +
    ` Q${-k},${-k} 0,${-v} Z`
  );
}

/* ── the field: nodes + edges ──────────────────────────────────────────────
   Every node drifts on its own two sines forever. Edges join current node
   positions, so lines move too. Lines route through intermediate stars and
   carry breaks — hand-drawn, not direct cluster-to-cluster beams. */

type FieldNode = {
  x: number;
  y: number;
  kind: 'star4' | 'star8' | 'dot';
  size: number;
  rot: number;
  t1: number;
  t2: number;
  p1: number;
  p2: number;
  a1: number;
  a2: number;
  burst?: Array<{ dx: number; dy: number; r: number }>;
  /* runtime displacement (cursor drag) */
  ox: number;
  oy: number;
};

type FieldEdge = { a: number; b: number; dashed: boolean; broken: boolean };

type Field = {
  nodes: FieldNode[];
  edges: FieldEdge[];
};

function makeNode(
  rand: () => number,
  x: number,
  y: number,
  kind: FieldNode['kind'],
  size: number,
  amp: number,
): FieldNode {
  return {
    x,
    y,
    kind,
    size,
    rot: rand() * 90,
    t1: 9 + rand() * 11,
    t2: 5 + rand() * 6,
    p1: rand() * Math.PI * 2,
    p2: rand() * Math.PI * 2,
    a1: amp * (0.6 + rand() * 0.8),
    a2: amp * (0.4 + rand() * 0.7),
    ox: 0,
    oy: 0,
  };
}

function buildField(clusters: CCluster[], config: CConfig): Field {
  const rand = mulberry32(config.seed);
  const W = config.world.width;
  const H = config.world.height;
  const nodes: FieldNode[] = [];
  const edges: FieldEdge[] = [];

  /* hub nodes beside each cluster anchor (edge endpoints) */
  const hubOf = new Map<string, number[]>();
  for (const c of clusters) {
    const ids: number[] = [];
    for (let k = 0; k < 2; k++) {
      nodes.push(
        makeNode(
          rand,
          c.x + (rand() - 0.5) * c.width * 1.1,
          c.y + (rand() - 0.5) * c.width * 0.8,
          'dot',
          1.6 + rand() * 1.2,
          2.4,
        ),
      );
      ids.push(nodes.length - 1);
    }
    hubOf.set(c.id, ids);
  }

  /* free sparkles — statement + small */
  for (let i = 0; i < 24; i++) {
    const statement = rand() < 0.3;
    nodes.push(
      makeNode(
        rand,
        rand() * W,
        rand() * H,
        rand() < 0.55 ? 'star4' : 'star8',
        statement ? 10 + rand() * 9 : 3.5 + rand() * 5,
        2.2 + rand() * 2.4,
      ),
    );
  }

  /* scattered stardust */
  for (let i = 0; i < 78; i++) {
    nodes.push(makeNode(rand, rand() * W, rand() * H, 'dot', 0.6 + rand() * 1.3, 1.2 + rand() * 2));
  }

  /* star clusters — small constellations of mixed sparkles */
  for (let g = 0; g < 6; g++) {
    const gx = rand() * W;
    const gy = rand() * H;
    const n = 3 + Math.floor(rand() * 4);
    const anchor = nodes.length;
    for (let k = 0; k < n; k++) {
      nodes.push(
        makeNode(
          rand,
          gx + (rand() - 0.5) * 120,
          gy + (rand() - 0.5) * 90,
          rand() < 0.7 ? 'star4' : 'star8',
          3 + rand() * 7,
          1.8 + rand() * 2,
        ),
      );
    }
    /* join the group with short segments */
    for (let k = 1; k < n; k++) {
      edges.push({ a: anchor + k - 1, b: anchor + k, dashed: rand() < 0.4, broken: rand() < 0.4 });
    }
  }

  /* pointillist bursts — a node ringed by decaying stardust */
  for (let i = 0; i < 9; i++) {
    const node = makeNode(
      rand,
      rand() * W,
      rand() * H,
      rand() < 0.5 ? 'star4' : 'dot',
      3 + rand() * 5,
      2 + rand() * 2,
    );
    const burst: Array<{ dx: number; dy: number; r: number }> = [];
    const n = 14 + Math.floor(rand() * 14);
    for (let k = 0; k < n; k++) {
      const a = rand() * Math.PI * 2;
      const rr = 12 + Math.pow(rand(), 0.6) * 34;
      burst.push({ dx: Math.cos(a) * rr, dy: Math.sin(a) * rr, r: 0.4 + rand() * 1 });
    }
    node.burst = burst;
    nodes.push(node);
  }

  /* margin dust — sparse fill beyond the world, for the map view */
  const M = 620;
  for (let i = 0; i < 64; i++) {
    const side = rand();
    let x: number;
    let y: number;
    if (side < 0.25) {
      x = -M + rand() * (W + 2 * M);
      y = -M + rand() * M;
    } else if (side < 0.5) {
      x = -M + rand() * (W + 2 * M);
      y = H + rand() * M;
    } else if (side < 0.75) {
      x = -M + rand() * M;
      y = rand() * H;
    } else {
      x = W + rand() * M;
      y = rand() * H;
    }
    nodes.push(makeNode(rand, x, y, 'dot', 0.5 + rand() * 1, 1 + rand() * 1.6));
  }

  /* semantic edges route through drifting waypoint stars — no direct beams.
     each connection becomes a zigzag of 3–4 short segments with breaks. */
  const seen = new Set<string>();
  for (const c of clusters) {
    for (const t of c.connections) {
      const key = [c.id, t].sort().join('~');
      if (seen.has(key) || !hubOf.has(t)) continue;
      seen.add(key);
      const aHub = hubOf.get(c.id)![0];
      const bHub = hubOf.get(t)![1];
      const dashed = rand() < 0.3;
      const a = nodes[aHub];
      const b = nodes[bHub];
      const ddx = b.x - a.x;
      const ddy = b.y - a.y;
      const len = Math.hypot(ddx, ddy) || 1;
      const nx = -ddy / len;
      const ny = ddx / len;
      const chain = [aHub];
      for (let k = 1; k <= 2; k++) {
        const t2 = k / 3 + (rand() - 0.5) * 0.16;
        const off = (rand() - 0.5) * 2 * (60 + rand() * 90);
        nodes.push(
          makeNode(rand, a.x + ddx * t2 + nx * off, a.y + ddy * t2 + ny * off, 'dot', 1.3 + rand(), 2),
        );
        chain.push(nodes.length - 1);
      }
      chain.push(bHub);
      for (let k = 0; k < chain.length - 1; k++) {
        edges.push({
          a: chain[k],
          b: chain[k + 1],
          dashed: dashed && rand() < 0.7,
          broken: rand() < 0.5,
        });
      }
    }
  }

  /* atmospheric chains — connect nearby free stars, never across the map */
  const freeStarIdx = nodes
    .map((n, i) => ({ n, i }))
    .filter(({ n, i }) => i >= 18 && i < 42 && n.kind !== 'dot')
    .map(({ i }) => i);
  for (let i = 0; i < freeStarIdx.length - 1 && i < 9; i++) {
    const a = freeStarIdx[i];
    const b = freeStarIdx[i + 1];
    if (Math.hypot(nodes[a].x - nodes[b].x, nodes[a].y - nodes[b].y) < 560) {
      edges.push({ a, b, dashed: rand() < 0.45, broken: rand() < 0.55 });
    }
  }

  /* stardust clustered along semantic lines */
  const lineDustStart = nodes.length;
  for (const e of edges.slice(0, 16)) {
    const a = nodes[e.a];
    const b = nodes[e.b];
    const n = 4 + Math.floor(rand() * 7);
    for (let k = 0; k < n; k++) {
      const t = rand();
      const px = a.x + (b.x - a.x) * t + (rand() - 0.5) * 56;
      const py = a.y + (b.y - a.y) * t + (rand() - 0.5) * 56;
      nodes.push(makeNode(rand, px, py, 'dot', 0.5 + rand() * 1.1, 1 + rand() * 1.4));
    }
  }
  void lineDustStart;

  return { nodes, edges };
}

/* ── centre masonry for cluster images ────────────────────────────────────
   No overlap; gaps; organised around the centre with seeded asymmetry. */

type MasonSlot = { x: number; y: number; w: number };

function masonryLayout(
  count: number,
  aspects: number[],
  seedStr: string,
): { slots: MasonSlot[]; height: number } {
  const rand = mulberry32(hashStr(seedStr));
  const gap = 0.05;
  const cols = count <= 1 ? 1 : count <= 4 ? 2 : 3;
  const slots: MasonSlot[] = [];

  const colX: number[] = [];
  const colW: number[] = [];
  if (cols === 1) {
    colW.push(0.68);
    colX.push(0.16);
  } else if (cols === 2) {
    const w1 = 0.42 + rand() * 0.05;
    colW.push(w1, 1 - w1 - gap);
    colX.push(0.02 + (rand() - 0.5) * 0.02, w1 + gap - (rand() - 0.5) * 0.02);
  } else {
    const w = (1 - 2 * gap) / 3;
    colW.push(w, w, w);
    colX.push(0.01 + gap / 2, w + gap * 1.5, 2 * w + gap * 2.5);
  }

  const colY = new Array(cols).fill(0);
  /* seeded assignment order for asymmetry */
  const order = Array.from({ length: count }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }

  let height = 0;
  for (const idx of order) {
    let col = 0;
    for (let k = 1; k < cols; k++) if (colY[k] < colY[col] - 0.02) col = k;
    const aspect = aspects[idx] ?? 1.25;
    const w = clamp(colW[col] * (0.92 + rand() * 0.14), 0.2, 0.55);
    const h = w * clamp(aspect, 0.6, 2.1);
    slots[idx] = {
      x: colX[col] + (colW[col] - w) / 2 + (rand() - 0.5) * 0.02,
      y: colY[col],
      w,
    };
    colY[col] += h + gap;
    height = Math.max(height, colY[col]);
  }

  /* centre columns vertically as a group around the cluster middle */
  const yOffset = -height / 2;
  for (const s of slots) s.y += yOffset;

  return { slots, height: height + gap };
}

/* ── hover splotch ───────────────────────────────────────────────────────── */

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

/* twinkle dots — pointillist spawn/despawn while hovering */
function twinkleDots(config: CConfig) {
  const rand = mulberry32(config.seed ^ 0x9e3779b9);
  const out = [];
  for (let i = 0; i < 150; i++) {
    out.push({
      x: -400 + rand() * (config.world.width + 800),
      y: -400 + rand() * (config.world.height + 800),
      delay: rand() * 9,
      dur: 4 + rand() * 6,
      r: 0.7 + rand() * 1.6,
    });
  }
  return out;
}

/* ── component ──────────────────────────────────────────────────────────── */

export default function Constellation({ clusters, config, basePath }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<SVGGElement>(null);
  const twinkleLayerRef = useRef<SVGGElement>(null);
  const splotchRef = useRef<SVGPathElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);
  const clusterRefs = useRef<Map<string, HTMLElement>>(new Map());

  const [vp, setVp] = useState<{ w: number; h: number } | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mapOn, setMapOn] = useState(false);
  const [isTouch, setIsTouch] = useState(false);

  const reduced = useRef(false);
  const cam = useRef({ cx: config.world.width / 2, cy: config.world.height / 2, scale: 0.6 });
  const camTarget = useRef({ ...cam.current });
  const initialCam = useRef({ ...cam.current });
  const prevTarget = useRef<{ cx: number; cy: number; scale: number } | null>(null);
  const drag = useRef({ on: false, x: 0, y: 0, moved: false });
  const vel = useRef({ x: 0, y: 0, vx: 0, vy: 0, lx: 0, ly: 0 });
  const cursor = useRef({ x: -9999, y: -9999 });
  const activeRef = useRef<string | null>(null);

  const layouts = useMemo(
    () =>
      clusters.map((c) => {
        const m = masonryLayout(
          c.images.length,
          c.images.map((im) => im.h / im.w),
          c.id,
        );
        return { c, slots: m.slots, boxH: m.height, blob: blobPath(c.id), phase: hashStr(c.id) % 1000 };
      }),
    [clusters],
  );

  const field = useMemo(() => buildField(clusters, config), [clusters, config]);
  const twinkles = useMemo(() => twinkleDots(config), [config]);
  const nodeRefs = useRef<Array<SVGGElement | null>>([]);
  const edgeRefs = useRef<Array<SVGPathElement | null>>([]);

  /* env + forced hover debug */
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
            y0: Math.min(acc.y0, c.y - c.width * 0.55),
            x1: Math.max(acc.x1, c.x + c.width),
            y1: Math.max(acc.y1, c.y + c.width * 0.55),
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
    initialCam.current = { cx, cy, scale };
    /* debug/preview: /studio/?view=map jumps to the full-map framing */
    if (new URLSearchParams(window.location.search).get('view') === 'map') {
      const s = clamp(
        Math.min(vp.w / config.world.width, vp.h / config.world.height) * 0.96,
        config.zoom.min,
        config.zoom.max,
      );
      cam.current = { cx: config.world.width / 2, cy: config.world.height / 2, scale: s };
      camTarget.current = { ...cam.current };
      setMapOnIf(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vp]);

  const clampCamera = (t: { cx: number; cy: number; scale: number }, maxScale?: number) => {
    t.cx = clamp(t.cx, -config.world.width * 0.2, config.world.width * 1.2);
    t.cy = clamp(t.cy, -config.world.height * 0.2, config.world.height * 1.2);
    t.scale = clamp(t.scale, config.zoom.min, maxScale ?? config.zoom.max);
  };

  /* camera helpers */
  const goFocus = () => {
    activate(null);
    camTarget.current = { ...initialCam.current };
  };
  const goMap = () => {
    activate(null);
    const scale = Math.min(
      vp ? vp.w / config.world.width : 0.4,
      vp ? vp.h / config.world.height : 0.4,
    ) * 0.96;
    camTarget.current = {
      cx: config.world.width / 2,
      cy: config.world.height / 2,
      scale: clamp(scale, config.zoom.min, config.zoom.max),
    };
  };

  /* pointer: velocity (for push), pan, and wheel zoom */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      cursor.current.x = e.clientX - rect.left;
      cursor.current.y = e.clientY - rect.top;
      vel.current.vx = (e.clientX - vel.current.lx) * 0.55 + vel.current.vx * 0.45;
      vel.current.vy = (e.clientY - vel.current.ly) * 0.55 + vel.current.vy * 0.45;
      vel.current.lx = e.clientX;
      vel.current.ly = e.clientY;

      if (drag.current.on) {
        const t = camTarget.current;
        const s = t.scale;
        t.cx -= (e.clientX - drag.current.x) / s;
        t.cy -= (e.clientY - drag.current.y) / s;
        drag.current.x = e.clientX;
        drag.current.y = e.clientY;
        drag.current.moved =
          drag.current.moved || Math.abs(e.movementX ?? 0) + Math.abs(e.movementY ?? 0) > 2;
        clampCamera(t);
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
  }, []);

  /* wheel zoom to cursor */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || !vp) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const t = { ...camTarget.current };
      const next = clamp(t.scale * Math.exp(-e.deltaY * 0.0016), config.zoom.min, config.zoom.max);
      const rect = el.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const wx = t.cx + (px - vp.w / 2) / t.scale;
      const wy = t.cy + (py - vp.h / 2) / t.scale;
      t.cx = wx - (px - vp.w / 2) / next;
      t.cy = wy - (py - vp.h / 2) / next;
      t.scale = next;
      clampCamera(t);
      camTarget.current = t;
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [config, vp]);

  /* hover: camera zoom to cluster + remember where to return */
  const activate = (id: string | null) => {
    setActiveId((prev) => {
      if (id && id !== prev) {
        prevTarget.current = { ...camTarget.current };
        const cl = clusters.find((x) => x.id === id);
        if (cl) {
          camTarget.current = { cx: cl.x, cy: cl.y, scale: Math.min(1.55, config.zoom.max + 0.2) };
        }
      } else if (!id && prev) {
        if (prevTarget.current) camTarget.current = { ...prevTarget.current };
      }
      return id;
    });
  };

  /* per-frame: splotch + info anchoring (cluster holds still while hovered) */
  useEffect(() => {
    activeRef.current = activeId;
    const on = Boolean(activeId);
    if (on) document.body.dataset.studioHover = '1';
    else delete document.body.dataset.studioHover;
    const cl = clusters.find((x) => x.id === activeId);

    if (cl && vp) {
      const t = camTarget.current;
      const sx = vp.w / 2 + (cl.x - t.cx) * t.scale;
      const sy = vp.h / 2 + (cl.y - t.cy) * t.scale;
      const sp = splotchRef.current;
      if (sp) {
        /* grow from the cluster; scale chosen so the shallowest lobe covers
           the farthest corner of the viewport */
        const coverNeeded = Math.hypot(Math.max(sx, vp.w - sx), Math.max(sy, vp.h - sy)) * 1.06;
        sp.setAttribute('transform', `translate(${sx.toFixed(1)} ${sy.toFixed(1)})`);
        sp.classList.add('open');
        requestAnimationFrame(() => {
          sp.setAttribute('transform', `translate(${sx.toFixed(1)} ${sy.toFixed(1)}) scale(${(coverNeeded / 42).toFixed(2)})`);
        });
      }
      const info = infoRef.current;
      if (info) {
        const placeRight = sx < vp.w * 0.58;
        info.style.left = placeRight ? `${sx + (cl.width * t.scale) / 2 + 44}px` : '';
        info.style.right = placeRight ? '' : `${vp.w - sx + (cl.width * t.scale) / 2 + 44}px`;
        info.style.top = `${sy - 44}px`;
      }
    } else {
      const sp = splotchRef.current;
      if (sp) {
        /* withdraw back into the cluster */
        sp.classList.remove('open');
        requestAnimationFrame(() => {
          const t = camTarget.current;
          const cl2 = lastActiveRef.current ? clusters.find((x) => x.id === lastActiveRef.current) : null;
          if (cl2) {
            const sx = (vp?.w ?? 0) / 2 + (cl2.x - t.cx) * t.scale;
            const sy = (vp?.h ?? 0) / 2 + (cl2.y - t.cy) * t.scale;
            sp.setAttribute('transform', `translate(${sx.toFixed(1)} ${sy.toFixed(1)}) scale(0.02)`);
          }
        });
      }
    }

    return () => {
      delete document.body.dataset.studioHover;
    };
  }, [activeId, clusters, vp]);

  const lastActiveRef = useRef<string | null>(null);
  useEffect(() => {
    lastActiveRef.current = activeId;
  }, [activeId]);

  /* the animation loop */
  useEffect(() => {
    if (!vp) return;
    let raf = 0;
    let last = performance.now();
    let running = true;
    let svx = 0;
    let svy = 0;
    const PUSH_R = 240;
    const PUSH_MAX = 26;
    const RELAX = 1.25; /* per-second exponential relax factor */

    const tick = (now: number) => {
      if (!running) return;
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const t = now / 1000;

      /* camera easing */
      const c = cam.current;
      const tg = camTarget.current;
      c.cx += (tg.cx - c.cx) * 0.12;
      c.cy += (tg.cy - c.cy) * 0.12;
      c.scale += (tg.scale - c.scale) * 0.12;

      const active = activeRef.current;
      const map = c.scale < config.zoom.mapBelow && !active;
      setMapOnIf(map);

      const tx = vp.w / 2 - c.cx * c.scale;
      const ty = vp.h / 2 - c.cy * c.scale;
      fieldRef.current?.setAttribute('transform', `translate(${tx} ${ty}) scale(${c.scale})`);
      twinkleLayerRef.current?.setAttribute('transform', `translate(${tx} ${ty}) scale(${c.scale})`);

      const pushK = reduced.current ? 0 : 0.32;
      const relax = Math.exp(-dt * RELAX);

      /* nodes: constant drift + local cursor push */
      for (let i = 0; i < field.nodes.length; i++) {
        const n = field.nodes[i];
        const el = nodeRefs.current[i];
        if (!el) continue;

        const dx =
          Math.sin(t * ((2 * Math.PI) / n.t1) + n.p1) * n.a1 +
          Math.sin(t * ((2 * Math.PI) / n.t2) + n.p2) * n.a2;
        const dy =
          Math.cos(t * ((2 * Math.PI) / (n.t1 * 0.77)) + n.p2 * 1.9) * n.a2 +
          Math.sin(t * ((2 * Math.PI) / (n.t2 * 0.63)) + n.p1 * 0.7) * n.a1 * 0.7;

        const sx = n.x + dx;
        const sy = n.y + dy;

        /* screen-space proximity to cursor */
        const ssx = sx * c.scale + tx;
        const ssy = sy * c.scale + ty;
        const ddx = ssx - cursor.current.x;
        const ddy = ssy - cursor.current.y;
        const dist = Math.hypot(ddx, ddy);
        if (!reduced.current && dist < PUSH_R) {
          const prox = (1 - dist / PUSH_R) ** 2;
          svx = vel.current.vx;
          svy = vel.current.vy;
          n.ox += svx * prox * pushK * dt * 34;
          n.oy += svy * prox * pushK * dt * 34;
          const mag = Math.hypot(n.ox, n.oy);
          if (mag > PUSH_MAX) {
            n.ox *= PUSH_MAX / mag;
            n.oy *= PUSH_MAX / mag;
          }
        }
        n.ox *= relax;
        n.oy *= relax;

        /* cull far-offscreen nodes */
        if (ssx < -260 || ssx > vp.w + 260 || ssy < -260 || ssy > vp.h + 260) {
          if (el.style.display !== 'none') el.style.display = 'none';
          continue;
        }
        if (el.style.display === 'none') el.style.display = '';

        el.setAttribute(
          'transform',
          `translate(${(sx + n.ox / c.scale).toFixed(2)} ${(sy + n.oy / c.scale).toFixed(2)}) rotate(${n.rot.toFixed(1)})`,
        );
      }

      /* edges between drifted (and pushed) node positions */
      for (let i = 0; i < field.edges.length; i++) {
        const e = field.edges[i];
        const el = edgeRefs.current[i];
        if (!el) continue;
        const a = field.nodes[e.a];
        const b = field.nodes[e.b];
        const ax = a.x + dx_of(a) + a.ox / c.scale;
        const ay = a.y + dy_of(a) + a.oy / c.scale;
        const bx = b.x + dx_of(b) + b.ox / c.scale;
        const by = b.y + dy_of(b) + b.oy / c.scale;
        const vis =
          ax * c.scale + tx > -300 && ax * c.scale + tx < vp.w + 300 &&
          ay * c.scale + ty > -300 && ay * c.scale + ty < vp.h + 300;
        if (!vis) {
          if (el.style.display !== 'none') el.style.display = 'none';
          continue;
        }
        if (el.style.display === 'none') el.style.display = '';
        if (e.broken) {
          const mx = (ax + bx) / 2;
          const my = (ay + by) / 2;
          const len = Math.hypot(bx - ax, by - ay) || 1;
          const g = Math.min(16, len * 0.24);
          const g1x = mx - ((bx - ax) / len) * g;
          const g1y = my - ((by - ay) / len) * g;
          const g2x = mx + ((bx - ax) / len) * g;
          const g2y = my + ((by - ay) / len) * g;
          el.setAttribute(
            'd',
            `M${ax.toFixed(1)},${ay.toFixed(1)} L${g1x.toFixed(1)},${g1y.toFixed(1)} M${g2x.toFixed(1)},${g2y.toFixed(1)} L${bx.toFixed(1)},${by.toFixed(1)}`,
          );
        } else {
          el.setAttribute('d', `M${ax.toFixed(1)},${ay.toFixed(1)} L${bx.toFixed(1)},${by.toFixed(1)}`);
        }
      }

      /* clusters: masonry boxes + drift + push + camera */
      for (const { c: cl, phase } of layouts) {
        const el = clusterRefs.current.get(cl.id);
        if (!el) continue;
        const hovered = active === cl.id;
        const driftAmp = hovered || reduced.current ? 0 : cl.driftRadius * cl.depth * (active ? config.drift.hoverMultiplier : 1);
        const dx =
          Math.sin(t * ((2 * Math.PI) / config.drift.periodSeconds) + phase) * driftAmp +
          Math.sin(t * ((2 * Math.PI) / (config.drift.periodSeconds * 0.53)) + phase * 1.7) * driftAmp * 0.6;
        const dy =
          Math.cos(t * ((2 * Math.PI) / (config.drift.periodSeconds * 0.77)) + phase * 2.3) * driftAmp +
          Math.sin(t * ((2 * Math.PI) / (config.drift.periodSeconds * 0.41)) + phase * 0.6) * driftAmp * 0.55;

        /* cluster push — much gentler than marks */
        const sxRaw = vp.w / 2 + (cl.x + dx - c.cx) * c.scale;
        const syRaw = vp.h / 2 + (cl.y + dy - c.cy) * c.scale;
        const ddx = sxRaw - cursor.current.x;
        const ddy = syRaw - cursor.current.y;
        const dist = Math.hypot(ddx, ddy);
        let px = 0;
        let py = 0;
        if (!reduced.current && dist < PUSH_R * 1.4) {
          const prox = (1 - dist / (PUSH_R * 1.4)) ** 2 * 0.15;
          px = vel.current.vx * prox * 0.3;
          py = vel.current.vy * prox * 0.3;
        }

        const bw = cl.width * c.scale;
        const bh = layouts.find((l) => l.c.id === cl.id)!.boxH * c.scale;
        el.style.transform = `translate(${(sxRaw + px - bw / 2).toFixed(1)}px, ${(syRaw + py - bh / 2).toFixed(1)}px) scale(${c.scale})`;
      }

      raf = requestAnimationFrame(tick);
    };

    /* drift helpers for edge endpoints (mirrors the node drift formula) */
    const dx_of = (n: FieldNode) =>
      Math.sin((performance.now() / 1000) * ((2 * Math.PI) / n.t1) + n.p1) * n.a1 +
      Math.sin((performance.now() / 1000) * ((2 * Math.PI) / n.t2) + n.p2) * n.a2;
    const dy_of = (n: FieldNode) =>
      Math.cos((performance.now() / 1000) * ((2 * Math.PI) / (n.t1 * 0.77)) + n.p2 * 1.9) * n.a2 +
      Math.sin((performance.now() / 1000) * ((2 * Math.PI) / (n.t2 * 0.63)) + n.p1 * 0.7) * n.a1 * 0.7;

    raf = requestAnimationFrame(tick);
    const onVis = () => {
      const shouldRun = !document.hidden;
      if (shouldRun && !running) {
        running = true;
        last = performance.now();
        raf = requestAnimationFrame(tick);
      } else if (!shouldRun) {
        running = false;
        cancelAnimationFrame(raf);
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vp, layouts, field, clusters, config, reduced]);

  /* map state via React (never hand-managed class strings) */
  const mapStateRef = useRef(false);
  const setMapOnIf = (map: boolean) => {
    if (map !== mapStateRef.current) {
      mapStateRef.current = map;
      setMapOn(map);
    }
  };

  /* hover: hide/show plates via class; keep plates in map mode */
  useEffect(() => {
    if (reduced.current) return;
  }, [reduced]);

  const activeCluster = clusters.find((c) => c.id === activeId) ?? null;
  const splotchLayout = layouts.find((l) => l.c.id === activeId);

  return (
    <div
      ref={wrapRef}
      className={[
        'constellation',
        activeId ? 'hovered' : '',
        mapOn ? 'map' : '',
        isTouch ? 'touch' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label="Studio constellation"
    >
      {vp && (
        <>
          <svg className="splotch-layer" width="100%" height="100%" aria-hidden="true">
            {splotchLayout && (
              <path
                ref={splotchRef}
                d={splotchLayout.blob}
                fill={splotchLayout.c.color}
                transform="translate(-5000 -5000) scale(0.02)"
              />
            )}
          </svg>

          <svg className="star-layer" width="100%" height="100%" aria-hidden="true">
            <g ref={fieldRef} transform={`translate(${vp.w / 2} ${vp.h / 2})`}>
              {field.edges.map((e, i) => (
                <path
                  key={`e${i}`}
                  ref={(el) => {
                    edgeRefs.current[i] = el;
                  }}
                  className="edge ln"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={e.dashed ? 0.7 : 0.85}
                  strokeOpacity={e.dashed ? 0.4 : 0.6}
                  strokeLinecap="round"
                  strokeDasharray={e.dashed ? '1 5' : undefined}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              {field.nodes.map((n, i) => (
                <g
                  key={`n${i}`}
                  ref={(el) => {
                    nodeRefs.current[i] = el;
                  }}
                >
                  {n.kind === 'dot' ? (
                    <circle r={n.size} fill="currentColor" opacity={0.85} />
                  ) : n.kind === 'star4' ? (
                    <path d={star4Path(n.size)} fill="currentColor" />
                  ) : (
                    <g>
                      <path d={star4Path(n.size)} fill="currentColor" />
                      <path d={star4Path(n.size * 0.6)} fill="currentColor" transform="rotate(45)" />
                    </g>
                  )}
                  {n.burst?.map((b, k) => (
                    <circle key={k} cx={b.dx} cy={b.dy} r={b.r} fill="currentColor" opacity={0.55} />
                  ))}
                </g>
              ))}
            </g>
          </svg>

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

          {layouts.map(({ c, slots, boxH }) => (
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
                activeId && activeId !== c.id ? 'dimmed' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-label={`${c.title} — ${c.projectCount} projects`}
              style={{ width: c.width, height: boxH * c.width }}
              onPointerEnter={() => !isTouch && activate(c.id)}
              onPointerLeave={() => !isTouch && activeId === c.id && activate(null)}
              onFocus={() => activate(c.id)}
              onBlur={() => activeId === c.id && activate(null)}
              onClick={(e) => {
                if (drag.current.moved) {
                  e.preventDefault();
                  return;
                }
                if (isTouch && activeId !== c.id) {
                  e.preventDefault();
                  activate(c.id);
                }
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
                      zIndex: i + 1,
                    }}
                  />
                );
              })}
              <span className="plate">{c.title}</span>
            </a>
          ))}

          <div className="view-controls">
            <button type="button" onClick={goFocus}>
              focus
            </button>
            <span aria-hidden="true">·</span>
            <button type="button" onClick={goMap} aria-pressed={mapOn}>
              map
            </button>
          </div>

          {activeCluster && (
            <div ref={infoRef} className="cluster-info">
              <p className="ci-kicker">
                ● cluster {String(clusters.findIndex((x) => x.id === activeCluster.id) + 1).padStart(2, '0')}
              </p>
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
