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
import {
  GLOBAL_VIEWBOX,
  generateGlobalConstellation,
  generateLocalConstellation,
  glintPath,
  ornamentPoints,
  type GlyphName,
} from '../../lib/studio/constellationPrimitives';

export type CImage = { src: string; w: number; h: number; projectId: string };

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

/* ── the field: nodes + edges ──────────────────────────────────────────────
   Every node drifts on its own two sines forever. Edges join current node
   positions, so lines move too. Lines route through intermediate stars and
   carry breaks — hand-drawn, not direct cluster-to-cluster beams. */

type FieldNode = {
  x: number;
  y: number;
  glyph: GlyphName | 'ornament';
  size: number;
  tips: readonly number[];
  render: boolean;
  t1: number;
  t2: number;
  p1: number;
  p2: number;
  a1: number;
  a2: number;
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
  glyph: FieldNode['glyph'],
  size: number,
  amp: number,
  tips: readonly number[] = [1, 1, 1, 1],
  render = true,
): FieldNode {
  return {
    x,
    y,
    glyph,
    size,
    tips,
    render,
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

function buildField(config: CConfig): Field {
  const model = generateGlobalConstellation(`studio-home:${config.seed}`);
  const rand = mulberry32(hashStr(`${model.seed}:motion`));
  const W = config.world.width;
  const H = config.world.height;
  const nodes: FieldNode[] = [];
  const edges: FieldEdge[] = [];

  const visibleEdges = model.logicalEdges.filter((edge) => edge.visible);
  const visibleNodeIds = new Set(visibleEdges.flatMap((edge) => [edge.from, edge.to]));
  const endpoints = new Map(
    model.stars.filter((star) => star.endpoint).map((star) => [`${star.componentId}:${star.x}:${star.y}`, star]),
  );
  const nodeIndexes = new Map<string, number>();
  const markScale = W / GLOBAL_VIEWBOX.width;

  for (const node of model.nodes) {
    const endpoint = endpoints.get(`${node.componentId}:${node.x}:${node.y}`);
    nodeIndexes.set(node.id, nodes.length);
    nodes.push(makeNode(
      rand,
      node.x * W,
      node.y * H,
      endpoint?.glyph ?? 'dot',
      (endpoint?.sizePx ?? 1.2) * markScale,
      1.2 + rand() * 2,
      endpoint?.tips,
      Boolean(endpoint) || !visibleNodeIds.has(node.id),
    ));
  }
  for (const edge of visibleEdges) {
    edges.push({
      a: nodeIndexes.get(edge.from)!,
      b: nodeIndexes.get(edge.to)!,
      dashed: edge.style === 'dotted',
      broken: false,
    });
  }
  for (const star of model.stars.filter((item) => !item.endpoint)) {
    nodes.push(makeNode(rand, star.x * W, star.y * H, star.glyph, star.sizePx * markScale, 1.2 + rand() * 2.2, star.tips));
  }
  for (const ornament of model.ornaments) {
    nodes.push(makeNode(rand, ornament.x * W, ornament.y * H, 'ornament', ornament.sizePx * markScale, 1.8 + rand() * 2));
  }

  return { nodes, edges };
}

/* ── scattered collage for cluster images ────────────────────────────────
   Organic, not columns: images grow outward from the cluster centre in
   seeded order, largest first, with a uniform gap between every image.
   No overlap ever; the whole group is re-centred so the title plate sits
   over the middle. */

type MasonSlot = { x: number; y: number; w: number; h: number };

function masonryLayout(
  count: number,
  aspects: number[],
  seedStr: string,
): { slots: MasonSlot[]; width: number; height: number } {
  const rand = mulberry32(hashStr(seedStr));
  const gap = 0.026;
  const slots: MasonSlot[] = [];
  if (!count) return { slots, width: 0, height: 0 };

  const sized = Array.from({ length: count }, (_, i) => {
    const w = 0.28 + rand() * 0.04;
    const aspect = clamp(aspects[i] ?? 1.25, 0.55, 2.0);
    return { i, w, h: w * aspect };
  });
  slots[0] = { x: 0, y: 0, w: sized[0].w, h: sized[0].h };

  const overlaps = (candidate: MasonSlot) => slots.some((slot) => slot
    && candidate.x < slot.x + slot.w + gap
    && candidate.x + candidate.w + gap > slot.x
    && candidate.y < slot.y + slot.h + gap
    && candidate.y + candidate.h + gap > slot.y);
  const boundsFor = (candidate?: MasonSlot) => {
    const all = candidate ? [...slots.filter(Boolean), candidate] : slots.filter(Boolean);
    const x0 = Math.min(...all.map((slot) => slot.x));
    const y0 = Math.min(...all.map((slot) => slot.y));
    const x1 = Math.max(...all.map((slot) => slot.x + slot.w));
    const y1 = Math.max(...all.map((slot) => slot.y + slot.h));
    return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 };
  };

  for (const image of sized.slice(1)) {
    const candidates: MasonSlot[] = [];
    for (const slot of slots.filter(Boolean)) {
      const ys = [slot.y, slot.y + (slot.h - image.h) / 2, slot.y + slot.h - image.h];
      const xs = [slot.x, slot.x + (slot.w - image.w) / 2, slot.x + slot.w - image.w];
      for (const y of ys) {
        candidates.push({ x: slot.x - gap - image.w, y, w: image.w, h: image.h });
        candidates.push({ x: slot.x + slot.w + gap, y, w: image.w, h: image.h });
      }
      for (const x of xs) {
        candidates.push({ x, y: slot.y - gap - image.h, w: image.w, h: image.h });
        candidates.push({ x, y: slot.y + slot.h + gap, w: image.w, h: image.h });
      }
    }
    const valid = candidates.filter((candidate) => !overlaps(candidate));
    valid.sort((a, b) => {
      const ab = boundsFor(a);
      const bb = boundsFor(b);
      // Prefer compact, square-ish, centered groups with uniform gap.
      // Penalize long rectangles and off-center drift.
      const areaA = ab.w * ab.h;
      const areaB = bb.w * bb.h;
      const aspectA = Math.abs(ab.w - ab.h) / Math.max(ab.w, ab.h);
      const aspectB = Math.abs(bb.w - bb.h) / Math.max(bb.w, bb.h);
      const centerDistA = Math.hypot((ab.x0 + ab.x1) / 2, (ab.y0 + ab.y1) / 2);
      const centerDistB = Math.hypot((bb.x0 + bb.x1) / 2, (bb.y0 + bb.y1) / 2);
      // Elongation penalty if one side >1.6× the other
      const elongA = Math.max(ab.w, ab.h) / Math.min(ab.w, ab.h) > 1.6 ? 0.15 : 0;
      const elongB = Math.max(bb.w, bb.h) / Math.min(bb.w, bb.h) > 1.6 ? 0.15 : 0;
      const scoreA = areaA * (1 + aspectA * 0.8 + elongA) + centerDistA * 0.3;
      const scoreB = areaB * (1 + aspectB * 0.8 + elongB) + centerDistB * 0.3;
      return scoreA - scoreB || a.x - b.x || a.y - b.y;
    });
    slots[image.i] = valid[0];
  }

  const measured = boundsFor();
  // Keep uniform padding; ensure the collage is centered and not stretched
  const scale = Math.min(1, 1 / measured.w, 1 / measured.h);
  for (const slot of slots) {
    slot.x = (slot.x - measured.x0) * scale;
    slot.y = (slot.y - measured.y0) * scale;
    slot.w *= scale;
    slot.h *= scale;
  }
  // Slide as close to centre as possible while preserving gap
  if (slots.length > 1) {
    const avgX = slots.reduce((s, slot) => s + slot.x + slot.w / 2, 0) / slots.length;
    const avgY = slots.reduce((s, slot) => s + slot.y + slot.h / 2, 0) / slots.length;
    const dx = (0.5 - avgX) * 0.28;
    const dy = (0.5 - avgY) * 0.28;
    for (const slot of slots) {
      slot.x += dx;
      slot.y += dy;
    }
  }
  return { slots, width: measured.w * scale, height: measured.h * scale };
}

/* ── hover star cluster ───────────────────────────────────────────────────
   A single small constellation of stars near the collage, visible only
   while that cluster is hovered. Same vocabulary as the field (star4/star8
   marks + short dashed segments) but with a much louder twinkle. */

type HoverStar = {
  x: number;
  y: number;
  glyph: GlyphName | 'ornament';
  size: number;
  tips: readonly number[];
  delay: number;
  dur: number;
};

type HoverStars = { nodes: HoverStar[]; edges: Array<[number, number]> };

function hoverStarsFor(c: CCluster, boxH: number): HoverStars {
  const model = generateLocalConstellation(c.id, 'big-plus-two');
  const rand = mulberry32(hashStr(c.id + ':hover-motion'));
  const cw = c.width;
  const ch = boxH * c.width;
  /* anchor just outside one seeded corner of the collage */
  const corner = Math.floor(rand() * 4);
  const sideX = corner === 0 || corner === 2 ? 1 : -1;
  const sideY = corner === 0 || corner === 1 ? -1 : 1;
  const ax = sideX * (cw * 0.52 + 36 + rand() * 30);
  const ay = sideY * (ch * 0.52 + 26 + rand() * 24);
  const box = model.layout.fragBBox!;
  const scale = 0.34;
  const nodes: HoverStar[] = [];
  const nodeIndexes = new Map<string, number>();
  const visible = model.logicalEdges.filter((edge) => edge.visible);
  const visibleIds = new Set(visible.flatMap((edge) => [edge.from, edge.to]));
  const endpoints = new Map(model.stars.filter((star) => star.endpoint).map((star) => [`${star.componentId}:${star.x}:${star.y}`, star]));
  const point = (x: number, y: number) => ({ x: ax + (x - box.cx) * scale, y: ay + (y - box.cy) * scale });
  for (const node of model.nodes) {
    const endpoint = endpoints.get(`${node.componentId}:${node.x}:${node.y}`);
    if (!endpoint && visibleIds.has(node.id)) {
      nodeIndexes.set(node.id, -1);
      continue;
    }
    const p = point(node.x, node.y);
    nodeIndexes.set(node.id, nodes.length);
    nodes.push({
      ...p,
      glyph: endpoint?.glyph ?? 'dot',
      size: (endpoint?.sizePx ?? 1.2) * 1.7,
      tips: endpoint?.tips ?? [1, 1, 1, 1],
      delay: rand() * 0.9,
      dur: 0.75 + rand() * 0.4,
    });
  }
  const edges = visible.map((edge) => {
    const from = model.nodes.find((node) => node.id === edge.from)!;
    const to = model.nodes.find((node) => node.id === edge.to)!;
    let a = nodeIndexes.get(edge.from)!;
    let b = nodeIndexes.get(edge.to)!;
    if (a < 0) {
      const p = point(from.x, from.y);
      a = nodes.push({ ...p, glyph: 'dot', size: 0, tips: [1, 1, 1, 1], delay: 0, dur: 1 }) - 1;
      nodeIndexes.set(edge.from, a);
    }
    if (b < 0) {
      const p = point(to.x, to.y);
      b = nodes.push({ ...p, glyph: 'dot', size: 0, tips: [1, 1, 1, 1], delay: 0, dur: 1 }) - 1;
      nodeIndexes.set(edge.to, b);
    }
    return [a, b] as [number, number];
  });
  for (const star of model.stars.filter((item) => !item.endpoint)) {
    const p = point(star.x, star.y);
    nodes.push({ ...p, glyph: star.glyph, size: star.sizePx * 1.7, tips: star.tips, delay: rand() * 0.9, dur: 0.75 + rand() * 0.4 });
  }
  for (const ornament of model.ornaments) {
    const p = point(ornament.x, ornament.y);
    nodes.push({ ...p, glyph: 'ornament', size: ornament.sizePx * 1.7, tips: [1, 1, 1, 1], delay: rand() * 0.9, dur: 0.75 + rand() * 0.4 });
  }
  return { nodes, edges };
}

function glyphMark(glyph: FieldNode['glyph'], size: number, tips: readonly number[]) {
  if (size <= 0) return null;
  if (glyph === 'dot') return <circle r={size} fill="currentColor" opacity={0.85} />;
  if (glyph === 'cross') {
    const arm = size * 1.15;
    return <path d={`M ${-arm} 0 L ${arm} 0 M 0 ${-arm} L 0 ${arm}`} fill="none" stroke="currentColor" strokeWidth={size * 0.5} strokeLinecap="round" />;
  }
  if (glyph === 'ornament') return <polygon points={ornamentPoints(0, 0, size)} fill="currentColor" />;
  return <path d={glintPath(0, 0, size, glyph, tips)} fill="currentColor" />;
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
  const hoverStarRefs = useRef<Map<string, SVGGElement>>(new Map());

  /* hover state machine: enter dwell, exit dwell, exit cooldown */
  const enterRef = useRef<{ id: string | null; since: number }>({ id: null, since: 0 });
  const exitSinceRef = useRef(0);
  const cooldownUntilRef = useRef(0);
  const mapBelowRef = useRef(config.zoom.mapBelow);
  const mapFitRef = useRef(0.4);

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
  const pointerSeen = useRef(false);
  const activeRef = useRef<string | null>(null);
  const touchArmedRef = useRef<string | null>(null);

  const layouts = useMemo(
    () =>
      clusters.map((c) => {
        const m = masonryLayout(
          c.images.length,
          c.images.map((im) => im.h / im.w),
          c.id,
        );
        return {
          c,
          slots: m.slots,
          boxW: m.width,
          boxH: m.height,
          blob: blobPath(c.id),
          phase: hashStr(c.id) % 1000,
          stars: hoverStarsFor(c, m.height),
        };
      }),
    [clusters],
  );

  /* authored world spread of the collages (for the map framing) */
  const spread = useMemo(() => {
    let x0 = 0;
    let y0 = 0;
    let x1 = config.world.width;
    let y1 = config.world.height;
    for (const l of layouts) {
      const halfW = (l.boxW * l.c.width) / 2;
      const halfH = (l.boxH * l.c.width) / 2;
      x0 = Math.min(x0, l.c.x - halfW);
      y0 = Math.min(y0, l.c.y - halfH);
      x1 = Math.max(x1, l.c.x + halfW);
      y1 = Math.max(y1, l.c.y + halfH);
    }
    const pad = 150;
    return { x0: x0 - pad, y0: y0 - pad, x1: x1 + pad, y1: y1 + pad };
  }, [layouts, config.world]);

  const focusSpread = useMemo(() => {
    const featured = layouts.filter((layout) => layout.c.featured);
    const focusLayouts = featured.length ? featured : layouts;
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (const layout of focusLayouts) {
      const halfW = (layout.boxW * layout.c.width) / 2;
      const halfH = (layout.boxH * layout.c.width) / 2;
      x0 = Math.min(x0, layout.c.x - halfW);
      y0 = Math.min(y0, layout.c.y - halfH);
      x1 = Math.max(x1, layout.c.x + halfW);
      y1 = Math.max(y1, layout.c.y + halfH);
    }
    const pad = 100;
    return { x0: x0 - pad, y0: y0 - pad, x1: x1 + pad, y1: y1 + pad };
  }, [layouts]);

  const field = useMemo(() => buildField(config), [config]);
  const twinkles = useMemo(() => twinkleDots(config), [config]);
  const minScale = vp && vp.w <= 760 ? 0.1 : config.zoom.min;
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

  /* map framing: scale that fits the whole authored spread, and the zoom
     below which map mode (titles only) takes over — always above the fit,
     always below the rest view */
  useEffect(() => {
    if (!vp) return;
    const fit = clamp(
      Math.min(vp.w / (spread.x1 - spread.x0), vp.h / (spread.y1 - spread.y0)) * 0.94,
      minScale,
      config.zoom.max,
    );
    mapFitRef.current = fit;
    mapBelowRef.current = fit * 0.99;
  }, [vp, spread, config, minScale]);

  /* Focus frames the featured work; map mode retains the complete world. */
  useEffect(() => {
    if (!vp) return;
    const mobileFocus = vp.w <= 760
      ? layouts.find((layout) => layout.c.featured) ?? layouts[0]
      : null;
    const box = mobileFocus
      ? {
          x0: mobileFocus.c.x - (mobileFocus.boxW * mobileFocus.c.width) / 2 - 100,
          y0: mobileFocus.c.y - (mobileFocus.boxH * mobileFocus.c.width) / 2 - 100,
          x1: mobileFocus.c.x + (mobileFocus.boxW * mobileFocus.c.width) / 2 + 100,
          y1: mobileFocus.c.y + (mobileFocus.boxH * mobileFocus.c.width) / 2 + 100,
        }
      : focusSpread;
    const cx = (box.x0 + box.x1) / 2;
    const cy = (box.y0 + box.y1) / 2;
    const scale = clamp(
      Math.min(vp.w / (box.x1 - box.x0), vp.h / (box.y1 - box.y0)) * 0.94,
      minScale,
      1.1,
    );
    cam.current = { cx, cy, scale };
    camTarget.current = { cx, cy, scale };
    initialCam.current = { cx, cy, scale };
    /* debug/preview: /studio/?view=map jumps to the full-map framing */
    if (new URLSearchParams(window.location.search).get('view') === 'map') {
      cam.current = {
        cx: (spread.x0 + spread.x1) / 2,
        cy: (spread.y0 + spread.y1) / 2,
        scale: mapFitRef.current,
      };
      camTarget.current = { ...cam.current };
      setMapOnIf(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vp, focusSpread, spread, layouts, minScale]);

  const clampCamera = (t: { cx: number; cy: number; scale: number }, maxScale?: number) => {
    t.cx = clamp(t.cx, -config.world.width * 0.2, config.world.width * 1.2);
    t.cy = clamp(t.cy, -config.world.height * 0.2, config.world.height * 1.2);
    t.scale = clamp(t.scale, minScale, maxScale ?? config.zoom.max);
  };

  /* camera helpers */
  const goFocus = () => {
    activate(null);
    camTarget.current = { ...initialCam.current };
  };
  const goMap = () => {
    activate(null);
    camTarget.current = {
      cx: (spread.x0 + spread.x1) / 2,
      cy: (spread.y0 + spread.y1) / 2,
      scale: mapFitRef.current * 0.96,
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
      pointerSeen.current = true;
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
      const next = clamp(t.scale * Math.exp(-e.deltaY * 0.0016), minScale, config.zoom.max);
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

  /* hover: camera zoom to cluster + remember where to return.
     Hover zoom keeps the collage at roughly 1/6 of the viewport area
     (capped smaller so hover regions never crowd neighbours). */
  const hoverScaleFor = (cl: CCluster) => {
    const l = layouts.find((x) => x.c.id === cl.id);
    const worldArea = l ? (l.boxW * cl.width) * (l.boxH * cl.width) : cl.width * cl.width;
    const byArea = Math.sqrt((vp ? vp.w * vp.h : 1_200_000) / (6 * worldArea));
    return clamp(byArea, 0.55, 0.78);
  };

  const activate = (id: string | null) => {
    setActiveId((prev) => {
      if (id && id !== prev) {
        prevTarget.current = { ...camTarget.current };
        const cl = clusters.find((x) => x.id === id);
        if (cl && vp) {
          const s = hoverScaleFor(cl);
          const l = layouts.find((x) => x.c.id === cl.id);
          const cw = ((l?.boxW ?? 1) * cl.width * s) / 2;
          const ch = (l ? l.boxH * cl.width * s : cw) / 2;
          /* anchor the zoom to the pointer (clamped so the collage stays
             fully on-screen) — the collage grows in place under the cursor
             instead of drifting to the viewport centre */
          const px = pointerSeen.current ? clamp(cursor.current.x, cw, vp.w - cw) : vp.w / 2;
          const py = pointerSeen.current ? clamp(cursor.current.y, ch, vp.h - ch) : vp.h / 2;
          camTarget.current = {
            cx: cl.x - (px - vp.w / 2) / s,
            cy: cl.y - (py - vp.h / 2) / s,
            scale: s,
          };
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

    /* the hover colour fills the page chrome (header included) via a CSS
       variable read by .studio/.constellation background transitions */
    if (cl) document.body.style.setProperty('--s-hover-bg', cl.color);
    else document.body.style.removeProperty('--s-hover-bg');

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
        const halfSpan = (cl.width * t.scale) / 2 + 110;
        info.style.left = placeRight ? `${sx + halfSpan}px` : '';
        info.style.right = placeRight ? '' : `${vp.w - sx + halfSpan}px`;
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
      document.body.style.removeProperty('--s-hover-bg');
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
      const map = c.scale < mapBelowRef.current && !active;
      setMapOnIf(map);

      /* cluster drift at this instant — frozen entirely while hovered */
      const driftOf = (cl: CCluster, phase: number) => {
        const amp = active || reduced.current ? 0 : cl.driftRadius * cl.depth;
        return {
          dx:
            Math.sin(t * ((2 * Math.PI) / config.drift.periodSeconds) + phase) * amp +
            Math.sin(t * ((2 * Math.PI) / (config.drift.periodSeconds * 0.53)) + phase * 1.7) * amp * 0.6,
          dy:
            Math.cos(t * ((2 * Math.PI) / (config.drift.periodSeconds * 0.77)) + phase * 2.3) * amp +
            Math.sin(t * ((2 * Math.PI) / (config.drift.periodSeconds * 0.41)) + phase * 0.6) * amp * 0.55,
        };
      };

      /* hover state machine (pointer-driven only; touch uses clicks).
         Enter = inside a cluster's collage bbox for ≥150ms.
         Exit  = outside the active bbox for ≥220ms, zero margin.
         A 1.5s cooldown after exit prevents a straight handoff from
         bouncing straight into the next cluster. All-or-nothing: a single
         frame across the edge never completes either transition. */
      if (!isTouch && pointerSeen.current) {
        const pnow = performance.now();
        let inside: string | null = null;
        for (const l of layouts) {
          const d = driftOf(l.c, l.phase);
          const sx = vp.w / 2 + (l.c.x + d.dx - c.cx) * c.scale;
          const sy = vp.h / 2 + (l.c.y + d.dy - c.cy) * c.scale;
          const hw = ((l.boxW * l.c.width) / 2) * c.scale;
          const hh = ((l.boxH * l.c.width) / 2) * c.scale;
          if (
            Math.abs(cursor.current.x - sx) <= hw &&
            Math.abs(cursor.current.y - sy) <= hh
          ) {
            inside = l.c.id;
            break;
          }
        }

        if (active) {
          if (inside === active) {
            exitSinceRef.current = 0;
          } else if (!exitSinceRef.current) {
            exitSinceRef.current = pnow;
          } else if (pnow - exitSinceRef.current >= 220) {
            exitSinceRef.current = 0;
            cooldownUntilRef.current = pnow + 1500;
            activate(null);
          }
        } else if (inside) {
          if (enterRef.current.id !== inside) {
            enterRef.current = { id: inside, since: pnow };
          }
          if (pnow - enterRef.current.since >= 150 && pnow >= cooldownUntilRef.current) {
            enterRef.current = { id: null, since: 0 };
            activate(inside);
          }
        } else {
          enterRef.current = { id: null, since: 0 };
        }
      }

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
          `translate(${(sx + n.ox / c.scale).toFixed(2)} ${(sy + n.oy / c.scale).toFixed(2)})`,
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

      /* clusters: masonry boxes + drift + push + camera.
         All drift freezes while any cluster is hovered, so the constellation
         returns to exactly the same place when the hover ends. */
      for (const { c: cl, phase } of layouts) {
        const el = clusterRefs.current.get(cl.id);
        if (!el) continue;
        const { dx, dy } = driftOf(cl, phase);

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

        const layout = layouts.find((l) => l.c.id === cl.id)!;
        const bw = layout.boxW * cl.width * c.scale;
        const bh = layout.boxH * cl.width * c.scale;
        el.style.transform = `translate(${(sxRaw + px - bw / 2).toFixed(1)}px, ${(syRaw + py - bh / 2).toFixed(1)}px) scale(${c.scale})`;
        /* plate counter-scale → constant screen size at every zoom */
        el.style.setProperty('--ic', (1 / c.scale).toFixed(3));

        /* hover star cluster rides with its collage */
        const hs = hoverStarRefs.current.get(cl.id);
        if (hs) {
          const show = active === cl.id;
          hs.setAttribute(
            'transform',
            `translate(${(sxRaw + px).toFixed(1)} ${(syRaw + py).toFixed(1)}) scale(${c.scale.toFixed(4)})`,
          );
          if (show && hs.style.display === 'none') hs.style.display = '';
          else if (!show && hs.style.display !== 'none') hs.style.display = 'none';
        }
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
                  <g
                    className="breathe"
                    style={{
                      animationDelay: (-n.p1 * 1.4).toFixed(2) + 's',
                      animationDuration: (n.t2 * 1.7).toFixed(2) + 's',
                    }}
                  >
                  {n.render ? glyphMark(n.glyph, n.size, n.tips) : null}
                  </g>
                </g>
              ))}
            </g>

            {/* hover star cluster — the loud little constellation that rides
                beside the active collage (positioned each frame) */}
            {layouts.map(({ c, stars }) => (
              <g
                key={`hs${c.id}`}
                data-cluster={c.id}
                className="hover-star-cluster"
                ref={(el) => {
                  if (el) hoverStarRefs.current.set(c.id, el);
                  else hoverStarRefs.current.delete(c.id);
                }}
                style={{ display: 'none' }}
              >
                {stars.edges.map((e, i) => {
                  const a = stars.nodes[e[0]];
                  const b = stars.nodes[e[1]];
                  return (
                    <path
                      key={`e${i}`}
                      d={`M${a.x.toFixed(1)},${a.y.toFixed(1)} L${b.x.toFixed(1)},${b.y.toFixed(1)}`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={0.8}
                      strokeOpacity={0.55}
                      strokeDasharray="2 6"
                      strokeLinecap="round"
                    />
                  );
                })}
                {stars.nodes.map((s, i) => (
                  <g key={i}>
                    <g transform={`translate(${s.x.toFixed(1)} ${s.y.toFixed(1)})`}>
                      <g
                        className="loud"
                        style={{
                          animationDelay: `${s.delay.toFixed(2)}s`,
                          animationDuration: `${s.dur.toFixed(2)}s`,
                        }}
                      >
                        {glyphMark(s.glyph, s.size, s.tips)}
                      </g>
                    </g>
                  </g>
                ))}
              </g>
            ))}
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

          {layouts.map(({ c, slots, boxW, boxH }) => (
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
              style={{ width: boxW * c.width, height: boxH * c.width, pointerEvents: 'none' }}
              onFocus={() => activate(c.id)}
              onBlur={() => activeId === c.id && activate(null)}
              onClick={(e) => {
                if (drag.current.moved) {
                  e.preventDefault();
                  return;
                }
                if (isTouch) {
                  if (touchArmedRef.current !== c.id) {
                    e.preventDefault();
                    touchArmedRef.current = c.id;
                    activate(c.id);
                  } else {
                    touchArmedRef.current = null;
                  }
                }
              }}
            >
              {c.images.map((im, i) => {
                const slot = slots[i % slots.length];
                return (
                  <img
                    key={i}
                    data-project={im.projectId}
                    src={im.src}
                    alt={`${c.title} — preview ${i + 1}`}
                    width={im.w}
                    height={im.h}
                    loading={i === 0 ? 'eager' : 'lazy'}
                    style={{
                      left: `${((slot.x / boxW) * 100).toFixed(2)}%`,
                      top: `${((slot.y / boxH) * 100).toFixed(2)}%`,
                      width: `${((slot.w / boxW) * 100).toFixed(2)}%`,
                      zIndex: i + 1,
                      pointerEvents: 'auto',
                    }}
                  />
                );
              })}
              <span className="plate">{c.title}</span>
            </a>
          ))}

          <div className="view-controls">
            <button type="button" onClick={goFocus} aria-label="Focus view">
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path
                  d="M10,1 Q11,9 19,10 Q11,11 10,19 Q9,11 1,10 Q9,9 10,1 Z"
                  fill="currentColor"
                />
              </svg>
              <span>focus</span>
            </button>
            <button type="button" onClick={goMap} aria-pressed={mapOn} aria-label="Map view">
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <circle cx="10" cy="3.5" r="1.6" fill="currentColor" />
                <circle cx="16.5" cy="10" r="1.6" fill="currentColor" />
                <circle cx="10" cy="16.5" r="1.6" fill="currentColor" />
                <circle cx="3.5" cy="10" r="1.6" fill="currentColor" />
              </svg>
              <span>map</span>
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
              <p className="ci-hint">click on the cluster to view the projects in the cluster</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
