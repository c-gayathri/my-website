const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

export const GLOBAL_VIEWBOX = { width: 1600, height: 840 } as const;
export const LOCAL_VIEWBOX = { width: 1000, height: 1000 } as const;
export const GLOBAL_ASPECT = GLOBAL_VIEWBOX.height / GLOBAL_VIEWBOX.width;

export type ConstellationKind = 'global' | 'big' | 'big-plus-one' | 'big-plus-two';
export type LocalConstellationVariant = Exclude<ConstellationKind, 'global'>;
export type GlyphName = 'tiny' | 'small' | 'medium' | 'bold' | 'cross' | 'dot';
export type StarSource = 'swarm' | 'satellite' | 'ambient' | 'background' | 'endpoint' | 'interstitial';
export type Point = { x: number; y: number };
export type Bounds = { x0: number; y0: number; x1: number; y1: number; w: number; h: number; cx: number; cy: number };

export type ConstellationNode = Point & {
  id: string;
  componentId: string;
  depth: number;
  parentId: string | null;
  angle: number;
};

export type ConstellationEdge = {
  id: string;
  componentId: string;
  from: string;
  to: string;
  length: number;
  visible: boolean;
  style: 'solid' | 'dotted';
};

export type ConstellationStar = Point & {
  id: string;
  glyph: GlyphName;
  sizePx: number;
  tips: [number, number, number, number];
  source: StarSource;
  componentId: string | null;
  swarmId: string | null;
  endpoint?: true;
  decluttered?: boolean;
};

export type ConstellationSwarm = {
  id: string;
  kind: 'node' | 'satellite' | 'ambient';
  componentId: string | null;
  anchorNodeId?: string;
  centre: Point;
  angle: number;
  count: number;
  major: number;
  minor: number;
  ratio: number;
};

export type ConstellationComponent = {
  id: string;
  archetype?: string;
  nodeIds: string[];
  logicalEdges: ConstellationEdge[];
};

export type ConstellationOrnament = Point & { id: string; sizePx: number; componentId: string };
export type SatelliteLayout = { name: string; centre: Point; bbox: Bounds; sizeRelative: number; angle: number; gap: number };

export type ConstellationModel = {
  seed: string;
  kind: ConstellationKind;
  viewBox: { width: number; height: number };
  isoX: number;
  components: ConstellationComponent[];
  nodes: ConstellationNode[];
  logicalEdges: ConstellationEdge[];
  swarms: ConstellationSwarm[];
  stars: ConstellationStar[];
  ornaments: ConstellationOrnament[];
  layout: {
    placed?: number;
    collisionsResolved?: number;
    componentBounds?: Record<string, Bounds>;
    mainBBox?: Bounds;
    mainCentre?: Point;
    mainWidthFraction?: number;
    mainHeightFraction?: number;
    fragBBox?: Bounds;
    fragWidthFraction?: number;
    fragHeightFraction?: number;
    satellites?: SatelliteLayout[];
    interstitialCount?: number;
    ambientCount?: number;
  };
};

type RandomSource = {
  uniform: () => number;
  between: (min: number, max: number) => number;
  integer: (min: number, max: number) => number;
  normal: () => number;
};

type TreeOptions = {
  id: string;
  x: number;
  y: number;
  scale: number;
  nodeMin: number;
  nodeMax: number;
  maxChildren: number;
  maxDepth: number;
  branchLengthMin: number;
  branchLengthMax: number;
  depthDecay: number;
  directionStdDev: number;
  rootAngle?: number;
  runsMin: number;
  runsMax: number;
  continueProb: number;
  dottedProb: number;
  edgeRandom: RandomSource;
};

type ComponentOptions = {
  nodeMin: number;
  nodeMax: number;
  pocketsMin: number;
  pocketsMax: number;
  pocketStars: readonly [number, number];
  runsMin: number;
  runsMax: number;
};

export const GLYPH_SIZES: Record<GlyphName | 'ornament', readonly [number, number]> = {
  tiny: [2, 3], small: [3, 5], medium: [5, 8], bold: [8, 13], cross: [2, 3.4], dot: [1.2, 2], ornament: [15, 24],
};

export const GLYPH_WEIGHTS: ReadonlyArray<readonly [GlyphName, number]> = [
  ['tiny', 0.3], ['small', 0.26], ['medium', 0.15], ['bold', 0.04], ['cross', 0.02], ['dot', 0.23],
];

export function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function randomSource(seed: string): RandomSource {
  const uniform = mulberry32(hashString(seed));
  let spare: number | null = null;
  return {
    uniform,
    between: (min, max) => min + uniform() * (max - min),
    integer: (min, max) => min + Math.floor(uniform() * (max - min + 1)),
    normal() {
      if (spare !== null) {
        const value = spare;
        spare = null;
        return value;
      }
      const radius = Math.sqrt(-2 * Math.log(Math.max(uniform(), Number.EPSILON)));
      const angle = TAU * uniform();
      spare = radius * Math.sin(angle);
      return radius * Math.cos(angle);
    },
  };
}

const clamp = (value: number, min = 0.02, max = 0.98) => Math.max(min, Math.min(max, value));

function emptyModel(seed: string, kind: ConstellationKind): ConstellationModel {
  const global = kind === 'global';
  return {
    seed, kind, viewBox: global ? GLOBAL_VIEWBOX : LOCAL_VIEWBOX, isoX: global ? GLOBAL_ASPECT : 1,
    components: [], nodes: [], logicalEdges: [], swarms: [], stars: [], ornaments: [], layout: {},
  };
}

export function boundingBox(points: readonly Point[]): Bounds {
  if (!points.length) return { x0: 0, y0: 0, x1: 0, y1: 0, w: 0, h: 0, cx: 0, cy: 0 };
  const x0 = Math.min(...points.map((point) => point.x));
  const y0 = Math.min(...points.map((point) => point.y));
  const x1 = Math.max(...points.map((point) => point.x));
  const y1 = Math.max(...points.map((point) => point.y));
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
}

export function componentBBox(model: ConstellationModel, componentId: string): Bounds | null {
  const component = model.components.find((item) => item.id === componentId);
  if (!component) return null;
  const points: Point[] = model.nodes.filter((node) => component.nodeIds.includes(node.id));
  points.push(...model.stars.filter((star) => star.componentId === componentId));
  points.push(...model.ornaments.filter((ornament) => ornament.componentId === componentId));
  return boundingBox(points);
}

function pickGlyph(random: RandomSource, dotBias = 0): GlyphName {
  const roll = random.uniform();
  const denominator = 1 + dotBias;
  let sum = 0;
  for (const [glyph, weight] of GLYPH_WEIGHTS) {
    sum += (weight + (glyph === 'dot' ? dotBias : 0)) / denominator;
    if (roll < sum) return glyph;
  }
  return 'dot';
}

function addStar(
  model: ConstellationModel,
  random: RandomSource,
  point: Point,
  source: StarSource,
  componentId: string | null = null,
  sizeScale = 1,
  swarmId: string | null = null,
): ConstellationStar {
  const bias = source === 'background' ? 0.5 : source === 'ambient' ? 0.28 : source === 'satellite' ? 0.05 : 0;
  const glyph = pickGlyph(random, bias);
  const size = GLYPH_SIZES[glyph];
  const limit = model.kind === 'global' ? [0.02, 0.98] : [25, 975];
  const star: ConstellationStar = {
    id: `star-${model.stars.length}`,
    x: clamp(point.x, limit[0], limit[1]),
    y: clamp(point.y, limit[0], limit[1]),
    glyph,
    sizePx: random.between(size[0], size[1]) * sizeScale,
    tips: glyph === 'small'
      ? [random.between(0.72, 1.28), random.between(0.72, 1.28), random.between(0.72, 1.28), random.between(0.72, 1.28)]
      : [1, 1, 1, 1],
    source, componentId, swarmId,
  };
  model.stars.push(star);
  return star;
}

function childCount(random: RandomSource, max: number): number {
  const roll = random.uniform();
  return roll < 0.25 ? 0 : roll < 0.8 ? 1 : Math.min(2, max);
}

function addTree(model: ConstellationModel, random: RandomSource, options: TreeOptions): ConstellationComponent {
  const nodeTarget = random.integer(options.nodeMin, options.nodeMax);
  const root: ConstellationNode = {
    id: `${options.id}-node-0`, componentId: options.id, x: options.x, y: options.y,
    depth: 0, parentId: null, angle: options.rootAngle ?? random.between(0, TAU),
  };
  const component: ConstellationComponent = { id: options.id, nodeIds: [root.id], logicalEdges: [] };
  model.nodes.push(root);
  const expanded = new Set<string>();

  while (component.nodeIds.length < nodeTarget) {
    const leaves = model.nodes.filter((node) => component.nodeIds.includes(node.id) && node.depth < options.maxDepth && !expanded.has(node.id));
    if (!leaves.length) break;
    const parent = leaves[random.integer(0, leaves.length - 1)];
    expanded.add(parent.id);
    const remaining = nodeTarget - component.nodeIds.length;
    let count = childCount(random, options.maxChildren);
    if (remaining > options.maxDepth - parent.depth) count = Math.max(2, count);
    count = Math.max(1, Math.min(count, remaining));
    for (let childIndex = 0; childIndex < count; childIndex += 1) {
      const fork = count === 2 ? (childIndex === 0 ? -0.25 : 0.25) : 0;
      let angle = parent.angle + random.normal() * options.directionStdDev + fork;
      const length = random.between(options.branchLengthMin, options.branchLengthMax) * options.scale * options.depthDecay ** parent.depth;
      let x = parent.x + Math.cos(angle) * length * model.isoX;
      let y = parent.y + Math.sin(angle) * length;
      if (model.kind === 'global' && (x < 0.025 || x > 0.975 || y < 0.025 || y > 0.975)) {
        angle += Math.PI * 0.72;
        x = parent.x + Math.cos(angle) * length * model.isoX;
        y = parent.y + Math.sin(angle) * length;
      }
      const child: ConstellationNode = {
        id: `${options.id}-node-${component.nodeIds.length}`, componentId: options.id,
        x: model.kind === 'global' ? clamp(x) : x, y: model.kind === 'global' ? clamp(y) : y,
        depth: parent.depth + 1, parentId: parent.id, angle,
      };
      const edge: ConstellationEdge = {
        id: `${options.id}-edge-${component.logicalEdges.length}`, componentId: options.id,
        from: parent.id, to: child.id, length: Math.hypot(child.x - parent.x, child.y - parent.y),
        visible: false, style: options.edgeRandom.uniform() < options.dottedProb ? 'dotted' : 'solid',
      };
      model.nodes.push(child);
      model.logicalEdges.push(edge);
      component.nodeIds.push(child.id);
      component.logicalEdges.push(edge);
    }
  }
  applyRuns(component, options.edgeRandom, options.runsMin, options.runsMax, options.continueProb);
  model.components.push(component);
  return component;
}

function applyRuns(component: ConstellationComponent, random: RandomSource, min: number, max: number, continueProb: number): void {
  const children = new Map<string, ConstellationEdge[]>();
  for (const edge of component.logicalEdges) {
    edge.visible = false;
    children.set(edge.from, [...(children.get(edge.from) ?? []), edge]);
  }
  const covered = new Set<string>();
  const target = Math.min(random.integer(min, max), component.logicalEdges.length);
  for (let runIndex = 0; runIndex < target; runIndex += 1) {
    const available = component.logicalEdges.filter((edge) => !covered.has(edge.id)
      && !component.logicalEdges.some((other) => other.visible && (other.to === edge.from || other.from === edge.from)));
    if (!available.length) break;
    let current = available[random.integer(0, available.length - 1)];
    current.visible = true;
    covered.add(current.id);
    for (let length = 1; length < 4; length += 1) {
      const next = (children.get(current.to) ?? []).filter((edge) => !covered.has(edge.id))[0];
      if (!next || (length > 1 && random.uniform() >= continueProb)) break;
      next.visible = true;
      covered.add(next.id);
      current = next;
    }
  }
}

function sigmaPair(random: RandomSource, majorRange: readonly [number, number], minorRange: readonly [number, number]): { major: number; minor: number; ratio: number } {
  for (let attempt = 0; attempt < 64; attempt += 1) {
    const ratio = random.between(1.4, 2.8);
    const major = random.between(majorRange[0], majorRange[1]);
    const minor = major / ratio;
    if (minor >= minorRange[0] && minor <= minorRange[1]) return { major, minor, ratio };
  }
  const major = Math.max(majorRange[0], minorRange[1] * 1.4);
  return { major, minor: major / 1.4, ratio: 1.4 };
}

function ellipsePoint(random: RandomSource, centre: Point, major: number, minor: number, angle: number, isoX: number): Point {
  const a = random.normal() * major;
  const b = random.normal() * minor;
  return { x: centre.x + (a * Math.cos(angle) - b * Math.sin(angle)) * isoX, y: centre.y + a * Math.sin(angle) + b * Math.cos(angle) };
}

function tailPoint(random: RandomSource, centre: Point, major: number, minor: number, angle: number, isoX: number): Point {
  const a = (random.normal() * 0.5 + 0.5) * major * random.between(1.8, 3.4);
  const b = random.normal() * minor * 0.9;
  return { x: centre.x + (a * Math.cos(angle) - b * Math.sin(angle)) * isoX, y: centre.y + a * Math.sin(angle) + b * Math.cos(angle) };
}

function addSwarm(
  model: ConstellationModel,
  random: RandomSource,
  node: ConstellationNode,
  options: { starMin: number; starMax: number; major: readonly [number, number]; minor: readonly [number, number]; satelliteProbability: number; angle?: number; totalStarLimit?: number },
): void {
  const remaining = (options.totalStarLimit ?? Infinity) - model.stars.length;
  if (remaining < Math.min(4, options.starMin)) return;
  const angle = options.angle ?? random.between(0, TAU);
  const offset = random.between(0.008, 0.03);
  const centre = { x: node.x + Math.cos(angle) * offset * model.isoX, y: node.y + Math.sin(angle) * offset };
  const sigma = sigmaPair(random, options.major, options.minor);
  const count = Math.min(random.integer(options.starMin, options.starMax), remaining);
  const swarm: ConstellationSwarm = {
    id: `swarm-${model.swarms.length}`, kind: 'node', componentId: node.componentId,
    anchorNodeId: node.id, centre, angle, count, ...sigma,
  };
  model.swarms.push(swarm);
  const tailAngle = angle + random.between(-1.1, 1.1);
  const tailCount = Math.max(1, Math.floor(count * random.between(0.14, 0.26)));
  for (let index = 0; index < count; index += 1) {
    const jitter = random.between(0.72, 1.34);
    const major = sigma.major * jitter;
    const minor = sigma.minor * (1.1 - (jitter - 1) * 0.5);
    addStar(model, random, index < tailCount
      ? tailPoint(random, centre, major, minor, tailAngle, model.isoX)
      : ellipsePoint(random, centre, major, minor, angle, model.isoX), 'swarm', node.componentId, 1, swarm.id);
  }
  if (random.uniform() >= options.satelliteProbability || (options.totalStarLimit ?? Infinity) - model.stars.length < 3) return;
  const satelliteAngle = angle + random.between(0.7, 2.5);
  const satelliteMajor = sigma.major * random.between(0.4, 0.65);
  const ratio = random.between(1.4, 2.8);
  const satelliteCentre = {
    x: centre.x + Math.cos(satelliteAngle) * sigma.major * random.between(2.2, 4.3) * model.isoX,
    y: centre.y + Math.sin(satelliteAngle) * sigma.major * random.between(2.2, 4.3),
  };
  const satellite: ConstellationSwarm = {
    id: `swarm-${model.swarms.length}`, kind: 'satellite', componentId: node.componentId,
    centre: satelliteCentre, angle: satelliteAngle, count: Math.min(random.integer(3, 10), (options.totalStarLimit ?? Infinity) - model.stars.length),
    major: satelliteMajor, minor: satelliteMajor / ratio, ratio,
  };
  model.swarms.push(satellite);
  for (let index = 0; index < satellite.count; index += 1) {
    addStar(model, random, ellipsePoint(random, satellite.centre, satellite.major, satellite.minor, satellite.angle, model.isoX), 'satellite', node.componentId, 1, satellite.id);
  }
}

function nodeById(model: ConstellationModel, id: string): ConstellationNode {
  const node = model.nodes.find((candidate) => candidate.id === id);
  if (!node) throw new Error(`Missing constellation node: ${id}`);
  return node;
}

function addEndpointStars(model: ConstellationModel, random: RandomSource, component: ConstellationComponent): void {
  const incident = new Map<string, number>();
  for (const edge of component.logicalEdges.filter((item) => item.visible)) {
    incident.set(edge.from, (incident.get(edge.from) ?? 0) + 1);
    incident.set(edge.to, (incident.get(edge.to) ?? 0) + 1);
  }
  for (const nodeId of component.nodeIds.filter((id) => incident.get(id) === 1).slice(0, 6)) {
    const node = nodeById(model, nodeId);
    model.stars.push({
      id: `star-${model.stars.length}`, x: node.x, y: node.y, glyph: 'small',
      sizePx: random.between(5, 7.5), tips: [1, 1, 1, 1], source: 'endpoint',
      componentId: component.id, swarmId: null, endpoint: true,
    });
  }
}

function translateComponent(model: ConstellationModel, componentId: string, dx: number, dy: number): void {
  for (const node of model.nodes) if (node.componentId === componentId) { node.x += dx; node.y += dy; }
  for (const star of model.stars) if (star.componentId === componentId) { star.x += dx; star.y += dy; }
  for (const swarm of model.swarms) if (swarm.componentId === componentId) { swarm.centre.x += dx; swarm.centre.y += dy; }
  for (const ornament of model.ornaments) if (ornament.componentId === componentId) { ornament.x += dx; ornament.y += dy; }
}

function scaleComponent(model: ConstellationModel, componentId: string, centre: Point, xFactor: number, yFactor = xFactor): void {
  const scale = (point: Point) => {
    point.x = centre.x + (point.x - centre.x) * xFactor;
    point.y = centre.y + (point.y - centre.y) * yFactor;
  };
  model.nodes.filter((item) => item.componentId === componentId).forEach(scale);
  model.stars.filter((item) => item.componentId === componentId).forEach(scale);
  model.swarms.filter((item) => item.componentId === componentId).forEach((swarm) => {
    scale(swarm.centre); swarm.major *= xFactor; swarm.minor *= yFactor;
  });
  model.ornaments.filter((item) => item.componentId === componentId).forEach(scale);
  for (const edge of model.logicalEdges.filter((item) => item.componentId === componentId)) {
    const from = nodeById(model, edge.from);
    const to = nodeById(model, edge.to);
    edge.length = Math.hypot(to.x - from.x, to.y - from.y);
  }
}

function intersects(a: Bounds, b: Bounds): boolean {
  return a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
}

function paddedAt(box: Bounds, centre: Point, pad: number): Bounds {
  const w = box.w + pad * 2;
  const h = box.h + pad * 2;
  return { x0: centre.x - w / 2, y0: centre.y - h / 2, x1: centre.x + w / 2, y1: centre.y + h / 2, w, h, cx: centre.x, cy: centre.y };
}

function boxClearance(a: Bounds, b: Bounds): number {
  return Math.hypot(Math.max(0, Math.max(a.x0 - b.x1, b.x0 - a.x1)), Math.max(0, Math.max(a.y0 - b.y1, b.y0 - a.y1)));
}

function markRadius(star: ConstellationStar): number {
  if (star.glyph === 'cross') return star.sizePx * 1.15;
  if (star.glyph === 'bold') return star.sizePx * 1.3;
  if (star.glyph === 'medium') return star.sizePx * 1.05;
  return star.sizePx;
}

function declutterStars(model: ConstellationModel): void {
  const unit = model.kind === 'global' ? 1 / GLOBAL_VIEWBOX.width : 1;
  const placed: Array<Point & { radius: number }> = [];
  const bounds = new Map(model.components.map((component) => [component.id, componentBBox(model, component.id)]));
  const ordered = [...model.stars.filter((star) => star.endpoint), ...model.stars.filter((star) => !star.endpoint)];
  let unresolved = 0;
  const conflicts = (x: number, y: number, radius: number) => placed.some((other) => {
    const dx = (x - other.x) / model.isoX;
    return Math.hypot(dx, y - other.y) < Math.max(radius, other.radius) * 0.55 + unit * 1.5;
  });
  for (const star of ordered) {
    const radius = markRadius(star) * unit;
    let accepted = !conflicts(star.x, star.y, radius) || Boolean(star.endpoint);
    if (!accepted) {
      const swarm = star.swarmId ? model.swarms.find((item) => item.id === star.swarmId) : undefined;
      const anchor = swarm?.centre ?? { x: star.x, y: star.y };
      const box = star.componentId ? bounds.get(star.componentId) : null;
      for (let attempt = 0; attempt < 24; attempt += 1) {
        const random = mulberry32(hashString(`${model.seed}:declutter:${star.id}:${attempt}`));
        const angle = random() * TAU;
        const push = (markRadius(star) * 1.1 + 1.6) * unit * (0.5 + attempt * 0.62);
        const x = anchor.x + Math.cos(angle) * push * model.isoX;
        const y = anchor.y + Math.sin(angle) * push;
        const inView = model.kind === 'global' ? x >= 0.02 && x <= 0.98 && y >= 0.02 && y <= 0.98 : x >= 25 && x <= 975 && y >= 25 && y <= 975;
        const inOwner = !box || (x >= box.x0 - unit * 48 && x <= box.x1 + unit * 48 && y >= box.y0 - unit * 48 && y <= box.y1 + unit * 48);
        if (inView && inOwner && !conflicts(x, y, radius)) {
          star.x = x; star.y = y; accepted = true; break;
        }
      }
    }
    if (!accepted) {
      if (!['background', 'ambient'].includes(star.source) && star.glyph !== 'dot') {
        star.glyph = 'tiny'; star.sizePx = 2; star.tips = [1, 1, 1, 1];
      }
      unresolved += 1;
    }
    star.decluttered = !star.endpoint;
    placed.push({ x: star.x, y: star.y, radius: markRadius(star) * unit });
  }
  model.layout.collisionsResolved = model.stars.length - unresolved;
}

type Archetype = ComponentOptions & {
  name: string;
  weight: number;
  rootAngle?: number;
  scale?: readonly [number, number];
};

const ARCHETYPES: readonly Archetype[] = [
  { name: 'anchor-a', weight: 2, nodeMin: 7, nodeMax: 9, pocketsMin: 3, pocketsMax: 4, pocketStars: [7, 14] as const, runsMin: 2, runsMax: 3 },
  { name: 'anchor-b', weight: 2, nodeMin: 7, nodeMax: 9, pocketsMin: 3, pocketsMax: 4, pocketStars: [7, 14] as const, runsMin: 2, runsMax: 3 },
  { name: 'vertical-chain', weight: 1, nodeMin: 4, nodeMax: 6, pocketsMin: 2, pocketsMax: 3, pocketStars: [6, 11] as const, runsMin: 1, runsMax: 2, rootAngle: -Math.PI / 2 },
  { name: 'hook', weight: 1, nodeMin: 3, nodeMax: 5, pocketsMin: 1, pocketsMax: 2, pocketStars: [6, 11] as const, runsMin: 1, runsMax: 2 },
  { name: 'micro', weight: 2, nodeMin: 2, nodeMax: 3, pocketsMin: 1, pocketsMax: 2, pocketStars: [5, 10] as const, runsMin: 1, runsMax: 1, scale: [0.72, 0.95] as const },
  { name: 'dim', weight: 1, nodeMin: 1, nodeMax: 2, pocketsMin: 0, pocketsMax: 1, pocketStars: [4, 8] as const, runsMin: 1, runsMax: 1, scale: [0.5, 0.7] as const },
];

export function generateGlobalConstellation(
  seed = 'studio-global-constellation',
  opts: { extraStars?: number } = {},
): ConstellationModel {
  const geometry = randomSource(`${seed}:radius`);
  const visibility = randomSource(`${seed}:visibility`);
  const decoration = randomSource(`${seed}:decoration`);
  const placement = randomSource(`${seed}:placement`);
  const model = emptyModel(seed, 'global');
  const available = [...ARCHETYPES];
  const chosen: Archetype[] = [];
  while (chosen.length < 5) {
    const totalWeight = available.reduce((sum, type) => sum + type.weight, 0);
    let roll = placement.between(0, totalWeight);
    let selected = 0;
    for (let index = 0; index < available.length; index += 1) {
      roll -= available[index].weight;
      if (roll <= 0) { selected = index; break; }
    }
    chosen.push(available.splice(selected, 1)[0]);
  }
  const packed: Bounds[] = [];

  chosen.forEach((type, index) => {
    const id = `component-${index}`;
    const scale = type.scale ? placement.between(type.scale[0], type.scale[1]) : placement.between(0.88, 1.06);
    const component = addTree(model, geometry, {
      id, x: 0.5, y: 0.5, scale, nodeMin: type.nodeMin, nodeMax: type.nodeMax,
      maxChildren: 2, maxDepth: 4, branchLengthMin: 0.11, branchLengthMax: 0.22,
      depthDecay: 0.92, directionStdDev: (type.rootAngle === undefined ? 44 : 22) * DEG,
      rootAngle: type.rootAngle, runsMin: type.runsMin, runsMax: type.runsMax,
      continueProb: 0.9, dottedProb: 0.46, edgeRandom: visibility,
    });
    component.archetype = type.name;
    const runNodes = new Set(component.logicalEdges.filter((edge) => edge.visible).flatMap((edge) => [edge.from, edge.to]));
    const candidates = [...(runNodes.size ? runNodes : new Set(component.nodeIds))];
    const pocketCount = placement.integer(type.pocketsMin, type.pocketsMax);
    const anchors: string[] = [];
    while (anchors.length < pocketCount && anchors.length < candidates.length) {
      const idCandidate = candidates[placement.integer(0, candidates.length - 1)];
      if (!anchors.includes(idCandidate)) anchors.push(idCandidate);
    }
    for (const nodeId of anchors) {
      const node = nodeById(model, nodeId);
      const incoming = component.logicalEdges.find((edge) => edge.visible && edge.to === nodeId);
      const angle = incoming
        ? Math.atan2(node.y - nodeById(model, incoming.from).y, (node.x - nodeById(model, incoming.from).x) / model.isoX)
        : placement.between(0, TAU);
      addSwarm(model, decoration, node, {
        starMin: type.pocketStars[0], starMax: type.pocketStars[1], major: [0.02, 0.055], minor: [0.01, 0.028],
        satelliteProbability: 0.28, angle: angle + placement.between(-0.3, 0.3), totalStarLimit: 185,
      });
    }
    addEndpointStars(model, decoration, component);
    const box = componentBBox(model, id)!;
    const pad = 0.045;
    let best: { centre: Point; box: Bounds; score: number } | null = null;
    for (let attempt = 0; attempt < 240; attempt += 1) {
      const centre = {
        x: placement.between(box.w / 2 + pad + 0.02, 1 - box.w / 2 - pad - 0.02),
        y: placement.between(box.h / 2 + pad + 0.03, 1 - box.h / 2 - pad - 0.03),
      };
      const candidate = paddedAt(box, centre, pad);
      if (packed.some((other) => intersects(candidate, other))) continue;
      const score = packed.length ? Math.min(...packed.map((other) => boxClearance(candidate, other))) : Infinity;
      if (!best || score > best.score) best = { centre, box: candidate, score };
    }
    if (!best) {
      for (let row = 1; row < 10 && !best; row += 1) for (let column = 1; column < 14 && !best; column += 1) {
        const centre = { x: column / 14, y: row / 10 };
        const candidate = paddedAt(box, centre, pad);
        if (candidate.x0 >= 0.02 && candidate.x1 <= 0.98 && candidate.y0 >= 0.03 && candidate.y1 <= 0.97 && !packed.some((other) => intersects(candidate, other))) {
          best = { centre, box: candidate, score: 0 };
        }
      }
    }
    // A large tail can make a rare seed impossible to pack. Reduce that
    // component as a unit and re-measure rather than accepting an overlap.
    for (let retry = 0; retry < 14 && !best; retry += 1) {
      scaleComponent(model, id, { x: box.cx, y: box.cy }, 0.88);
      const smaller = componentBBox(model, id)!;
      Object.assign(box, smaller);
      for (let attempt = 0; attempt < 240; attempt += 1) {
        const centre = {
          x: placement.between(box.w / 2 + pad + 0.02, 1 - box.w / 2 - pad - 0.02),
          y: placement.between(box.h / 2 + pad + 0.03, 1 - box.h / 2 - pad - 0.03),
        };
        const candidate = paddedAt(box, centre, pad);
        if (!packed.some((other) => intersects(candidate, other))) {
          const score = packed.length ? Math.min(...packed.map((other) => boxClearance(candidate, other))) : Infinity;
          if (!best || score > best.score) best = { centre, box: candidate, score };
        }
      }
    }
    const centre = best?.centre ?? { x: 0.5, y: 0.5 };
    translateComponent(model, id, centre.x - box.cx, centre.y - box.cy);
    packed.push(paddedAt(componentBBox(model, id)!, centre, pad));
  });

  // Density grows with cluster count so new stars/lines are GENERATED
  // across the whole cluster region (never stretched). Pass extraStars
  // from the caller based on world area / cluster count.
  const target = decoration.integer(235, 270) + Math.max(0, Math.min(220, opts.extraStars ?? 0));
  const ambientCount = decoration.integer(4, 7);
  const ambientCentres: Point[] = [];
  for (let index = 0; index < ambientCount; index += 1) {
    let centre = { x: decoration.between(0.05, 0.95), y: decoration.between(0.06, 0.94) };
    for (let attempt = 0; attempt < 60; attempt += 1) {
      const candidate = { x: decoration.between(0.05, 0.95), y: decoration.between(0.06, 0.94) };
      const clear = ambientCentres.every((other) => Math.hypot(candidate.x - other.x, candidate.y - other.y) > 0.11)
        && packed.every((box) => candidate.x < box.x0 - 0.02 || candidate.x > box.x1 + 0.02 || candidate.y < box.y0 - 0.02 || candidate.y > box.y1 + 0.02);
      if (clear) { centre = candidate; break; }
    }
    ambientCentres.push(centre);
    const sigma = sigmaPair(decoration, [0.012, 0.03], [0.006, 0.015]);
    const count = Math.min(decoration.integer(6, 15), Math.max(0, target - 25 - model.stars.length));
    const angle = decoration.between(0, TAU);
    if (count > 0) model.swarms.push({ id: `swarm-${model.swarms.length}`, kind: 'ambient', componentId: null, centre, angle, count, ...sigma });
    for (let star = 0; star < count; star += 1) addStar(model, decoration, ellipsePoint(decoration, centre, sigma.major, sigma.minor, angle, model.isoX), 'ambient');
  }
  const backgroundCount = Math.max(25, target - model.stars.length);
  const cap = 285 + Math.max(0, Math.min(200, opts.extraStars ?? 0));
  for (let index = 0; index < backgroundCount && model.stars.length < cap; index += 1) {
    addStar(model, decoration, { x: decoration.between(0.03, 0.97), y: decoration.between(0.04, 0.96) }, 'background');
  }
  for (let index = 0; index < decoration.integer(1, 2); index += 1) {
    const component = model.components[decoration.integer(0, model.components.length - 1)];
    const node = nodeById(model, component.nodeIds[decoration.integer(0, component.nodeIds.length - 1)]);
    model.ornaments.push({ id: `ornament-${index}`, x: clamp(node.x + decoration.between(-0.04, 0.04)), y: clamp(node.y + decoration.between(-0.04, 0.04)), sizePx: decoration.between(15, 24), componentId: component.id });
  }
  model.layout.componentBounds = Object.fromEntries(model.components.map((component) => [component.id, componentBBox(model, component.id)!]));
  model.layout.placed = packed.length;
  declutterStars(model);
  return model;
}

const LOCAL_CONFIG: Record<LocalConstellationVariant, { main: ComponentOptions & { width: readonly [number, number]; height?: readonly [number, number] }; companions: Array<ComponentOptions & { name: string; relative: readonly [number, number] }>; ambient?: readonly [number, number]; interstitial?: readonly [number, number] }> = {
  big: { main: { nodeMin: 7, nodeMax: 10, pocketsMin: 3, pocketsMax: 5, pocketStars: [7, 16], runsMin: 2, runsMax: 3, width: [0.5, 0.6], height: [0.45, 0.6] }, companions: [], ambient: [5, 10] },
  'big-plus-one': { main: { nodeMin: 7, nodeMax: 9, pocketsMin: 3, pocketsMax: 4, pocketStars: [7, 14], runsMin: 2, runsMax: 3, width: [0.42, 0.52] }, companions: [{ name: 'satellite-a', nodeMin: 3, nodeMax: 5, pocketsMin: 1, pocketsMax: 2, pocketStars: [5, 10], runsMin: 1, runsMax: 2, relative: [0.25, 0.4] }], interstitial: [3, 6] },
  'big-plus-two': { main: { nodeMin: 7, nodeMax: 9, pocketsMin: 3, pocketsMax: 4, pocketStars: [7, 14], runsMin: 2, runsMax: 3, width: [0.4, 0.5] }, companions: [{ name: 'satellite-a', nodeMin: 3, nodeMax: 5, pocketsMin: 1, pocketsMax: 2, pocketStars: [5, 10], runsMin: 1, runsMax: 2, relative: [0.25, 0.35] }, { name: 'satellite-b', nodeMin: 2, nodeMax: 3, pocketsMin: 1, pocketsMax: 1, pocketStars: [4, 8], runsMin: 1, runsMax: 1, relative: [0.1, 0.2] }], interstitial: [4, 8] },
};

function buildLocalComponent(model: ConstellationModel, random: RandomSource, options: ComponentOptions, id: string): ConstellationComponent {
  const component = addTree(model, random, {
    id, x: 0.5, y: 0.5, scale: 1, nodeMin: options.nodeMin, nodeMax: options.nodeMax,
    maxChildren: 2, maxDepth: 4, branchLengthMin: 0.04, branchLengthMax: 0.09,
    depthDecay: 0.86, directionStdDev: 45 * DEG, runsMin: options.runsMin, runsMax: options.runsMax,
    continueProb: 0.64, dottedProb: 0.46, edgeRandom: random,
  });
  const pocketCount = random.integer(options.pocketsMin, options.pocketsMax);
  const anchors: string[] = [];
  while (anchors.length < pocketCount && anchors.length < component.nodeIds.length) {
    const nodeId = component.nodeIds[random.integer(0, component.nodeIds.length - 1)];
    if (!anchors.includes(nodeId)) anchors.push(nodeId);
  }
  for (const nodeId of anchors) addSwarm(model, random, nodeById(model, nodeId), { starMin: options.pocketStars[0], starMax: options.pocketStars[1], major: [0.018, 0.04], minor: [0.009, 0.022], satelliteProbability: 0 });
  addEndpointStars(model, random, component);
  return component;
}

export function generateLocalConstellation(slug: string, variant: LocalConstellationVariant = 'big'): ConstellationModel {
  const config = LOCAL_CONFIG[variant];
  const seed = `${slug}-${variant}`;
  const model = emptyModel(seed, variant);
  const placement = randomSource(`${seed}:placement`);
  const decoration = randomSource(`${seed}:decoration`);
  const mainRandom = randomSource(`${seed}:main`);
  buildLocalComponent(model, mainRandom, config.main, 'main');
  let mainBox = componentBBox(model, 'main')!;
  const targetWidth = placement.between(config.main.width[0], config.main.width[1]) * 1000;
  const targetHeight = config.main.height ? placement.between(config.main.height[0], config.main.height[1]) * 1000 : null;
  scaleComponent(model, 'main', { x: mainBox.cx, y: mainBox.cy }, targetWidth / mainBox.w, targetHeight ? targetHeight / mainBox.h : targetWidth / mainBox.w);
  mainBox = componentBBox(model, 'main')!;
  translateComponent(model, 'main', 500 - mainBox.cx, 480 - mainBox.cy);
  mainBox = componentBBox(model, 'main')!;
  const mainCentre = { x: mainBox.cx, y: mainBox.cy };
  const satellites: SatelliteLayout[] = [];

  config.companions.forEach((companion, index) => {
    const random = randomSource(`${seed}:sat-${index}`);
    buildLocalComponent(model, random, companion, companion.name);
    let box = componentBBox(model, companion.name)!;
    const relative = random.between(companion.relative[0], companion.relative[1]);
    scaleComponent(model, companion.name, { x: box.cx, y: box.cy }, relative * mainBox.w / box.w);
    box = componentBBox(model, companion.name)!;
    const baseAngle = index === 0 ? placement.between(0, TAU) : satellites[0].angle + placement.between(70, 190) * DEG;
    let chosen: { angle: number; centre: Point; gap: number } | null = null;
    for (let attempt = 0; attempt < 96 && !chosen; attempt += 1) {
      const angle = baseAngle + placement.between(-0.22, 0.22);
      const gap = mainBox.w * placement.between(0.15, 0.35);
      const ux = Math.cos(angle);
      const uy = Math.sin(angle);
      const mainRadius = (Math.abs(ux) * mainBox.w + Math.abs(uy) * mainBox.h) / 2;
      const satelliteRadius = (Math.abs(ux) * box.w + Math.abs(uy) * box.h) / 2;
      const distance = mainRadius + gap + satelliteRadius;
      const centre = { x: mainCentre.x + ux * distance, y: mainCentre.y + uy * distance };
      const moved = paddedAt(box, centre, 10);
      const inView = moved.x0 >= 25 && moved.x1 <= 975 && moved.y0 >= 25 && moved.y1 <= 975;
      const avoidsOthers = satellites.every((record) => !intersects(moved, record.bbox));
      if (inView && avoidsOthers) chosen = { angle, centre, gap };
    }
    if (!chosen) {
      const angle = index === 0 ? 0 : Math.PI;
      chosen = { angle, centre: { x: mainCentre.x + Math.cos(angle) * (mainBox.w / 2 + box.w / 2 + mainBox.w * 0.15), y: mainCentre.y }, gap: mainBox.w * 0.15 };
    }
    translateComponent(model, companion.name, chosen.centre.x - box.cx, chosen.centre.y - box.cy);
    box = componentBBox(model, companion.name)!;
    satellites.push({ name: companion.name, centre: { x: box.cx, y: box.cy }, bbox: box, sizeRelative: relative, angle: chosen.angle, gap: chosen.gap });
  });

  if (config.interstitial) {
    const target = placement.integer(config.interstitial[0], config.interstitial[1]);
    for (let index = 0; index < target; index += 1) {
      const satellite = satellites[index % satellites.length];
      const progress = placement.between(0.22, 0.78);
      const dx = satellite.centre.x - mainCentre.x;
      const dy = satellite.centre.y - mainCentre.y;
      const noise = placement.normal() * placement.between(0.012, 0.035);
      addStar(model, decoration, { x: mainCentre.x + dx * progress - dy * noise, y: mainCentre.y + dy * progress + dx * noise }, 'interstitial');
    }
  } else if (config.ambient) {
    const target = placement.integer(config.ambient[0], config.ambient[1]);
    for (let index = 0; index < target; index += 1) {
      const angle = placement.between(0, TAU);
      addStar(model, decoration, { x: mainCentre.x + Math.cos(angle) * mainBox.w * 0.62, y: mainCentre.y + Math.sin(angle) * mainBox.h * 0.62 }, 'ambient');
    }
  }

  for (const component of model.components) {
    const root = nodeById(model, component.nodeIds[0]);
    model.ornaments.push({
      id: `ornament-${model.ornaments.length}`, x: root.x + decoration.between(-18, 18), y: root.y + decoration.between(-18, 18),
      sizePx: component.id === 'main' ? decoration.between(20, 26) : decoration.between(12, 18), componentId: component.id,
    });
  }
  mainBox = componentBBox(model, 'main')!;
  const fragBox = boundingBox([...model.nodes, ...model.stars, ...model.ornaments]);
  model.layout = {
    mainBBox: mainBox, mainCentre, mainWidthFraction: mainBox.w / 1000, mainHeightFraction: mainBox.h / 1000,
    fragBBox: fragBox, fragWidthFraction: fragBox.w / 1000, fragHeightFraction: fragBox.h / 1000,
    satellites, interstitialCount: model.stars.filter((star) => star.source === 'interstitial').length,
    ambientCount: model.stars.filter((star) => star.source === 'ambient').length,
    componentBounds: Object.fromEntries(model.components.map((component) => [component.id, componentBBox(model, component.id)!])),
  };
  declutterStars(model);
  return model;
}

export const generateGlobal = generateGlobalConstellation;
export const generateLocal = generateLocalConstellation;

const round = (value: number) => Math.round(value * 100) / 100;
const polar = (x: number, y: number, radius: number, angle: number): [number, number] => [x + Math.cos(angle) * radius, y + Math.sin(angle) * radius];

export function glintPath(x: number, y: number, radius: number, glyph: Exclude<GlyphName, 'dot' | 'cross'>, tips: readonly number[] = [1, 1, 1, 1]): string {
  const waist = glyph === 'small' ? 0.055 : glyph === 'tiny' ? 0.05 : 0.045;
  const lengths = glyph === 'bold' ? [1.35, 0.55, 1.35, 0.55] : tips;
  const angles = [-Math.PI / 2, 0, Math.PI / 2, Math.PI];
  const outer = angles.map((angle, index) => polar(x, y, radius * (lengths[index] ?? 1), angle));
  const inner = angles.map((angle) => polar(x, y, radius * waist, angle + Math.PI / 4));
  const point = ([px, py]: readonly number[]) => `${round(px)},${round(py)}`;
  const path = [`M ${point(outer[0])}`, ...outer.map((_, index) => `Q ${point(inner[index])} ${point(outer[(index + 1) % 4])}`)].join(' ');
  if (glyph !== 'bold') return path;
  return `${path} M ${point(polar(x, y, radius * 0.14, -Math.PI / 2))} L ${point(polar(x, y, radius * 0.14, Math.PI / 2))}`;
}

export function ornamentPoints(x: number, y: number, radius: number): string {
  const points: string[] = [];
  for (let index = 0; index < 8; index += 1) {
    points.push(`${round(x + Math.cos(index * Math.PI / 4) * radius)},${round(y + Math.sin(index * Math.PI / 4) * radius)}`);
    points.push(`${round(x + Math.cos(index * Math.PI / 4 + Math.PI / 8) * radius * 0.14)},${round(y + Math.sin(index * Math.PI / 4 + Math.PI / 8) * radius * 0.14)}`);
  }
  return points.join(' ');
}

export function summarizeConstellation(model: ConstellationModel) {
  const visible = model.logicalEdges.filter((edge) => edge.visible);
  return {
    components: model.components.length,
    nodes: model.nodes.length,
    visibleEdges: visible.length,
    stars: model.stars.length,
    dots: model.stars.filter((star) => star.glyph === 'dot').length,
    ornaments: model.ornaments.length,
    nodeSwarms: model.swarms.filter((swarm) => swarm.kind === 'node').length,
    ambientPockets: model.swarms.filter((swarm) => swarm.kind === 'ambient').length,
  };
}
