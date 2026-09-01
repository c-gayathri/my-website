const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

// Global panels draw geometry that must not be stretched on screen. The global
// viewBox is 1600x840, so equal normalized offsets would render 1.9x wider than
// tall. Scaling every x-displacement by H/W keeps distances isotropic in pixels.
export const GLOBAL_ASPECT = 840 / 1600;
const ISO_X = GLOBAL_ASPECT;

export const GLOBAL_DEFAULTS = Object.freeze({
  componentCount: 4,
  nodesPerComponentMin: 7,
  nodesPerComponentMax: 11,
  maxChildrenPerNode: 2,
  maxDepth: 4,
  branchLengthMin: 0.045,
  branchLengthMax: 0.12,
  branchDepthDecay: 0.86,
  directionStdDev: 48 * DEG,
  visibleEdgeProbability: 0.64,
  visibleRunsPerComponentMin: 2,
  visibleRunsPerComponentMax: 4,
  dottedEdgeProbability: 0.45,
  nodeSwarmProbability: 0.6,
  nodeSwarmsPerComponentMin: 3,
  nodeSwarmsPerComponentMax: 5,
  starsPerSwarmMin: 8,
  starsPerSwarmMax: 20,
  swarmSigmaMajorMin: 0.02,
  swarmSigmaMajorMax: 0.055,
  swarmSigmaMinorMin: 0.01,
  swarmSigmaMinorMax: 0.028,
  anisotropyRatioMin: 1.4,
  anisotropyRatioMax: 2.8,
  satelliteProbability: 0.3,
  ambientPocketCountMin: 4,
  ambientPocketCountMax: 7,
  ambientPocketStarsMin: 4,
  ambientPocketStarsMax: 10,
  backgroundStarCountMin: 20,
  backgroundStarCountMax: 35,
  specialStarCountMin: 1,
  specialStarCountMax: 2,
});

export const GLYPH_SIZES = Object.freeze({
  tiny: [2, 3],
  small: [3, 5],
  medium: [5, 8],
  bold: [8, 13],
  cross: [2, 3.4],
  dot: [1.2, 2],
  ornament: [15, 24],
});

export const GLYPH_WEIGHTS = Object.freeze([
  ['tiny', 0.3],
  ['small', 0.26],
  ['medium', 0.15],
  ['bold', 0.04],
  ['cross', 0.02],
  ['dot', 0.23],
]);

// Visual profiles let the global field be generated several ways for
// side-by-side comparison. Each biases star size, dot density, and line runs.
export const GLOBAL_PROFILES = Object.freeze({
  wispy: { sizeScale: 0.78, dotBias: 0.08, runsBoost: 0, armScale: 1.05 },
  balanced: { sizeScale: 1, dotBias: 0, runsBoost: 0, armScale: 1 },
  threaded: { sizeScale: 1, dotBias: -0.03, runsBoost: 1, armScale: 0.96 },
});

export function pickGlyphForProfile(random, dotBias = 0) {
  const roll = random.uniform();
  const denom = 1 + dotBias;
  let acc = 0;
  for (const [name, weight] of GLYPH_WEIGHTS) {
    const w = name === 'dot' ? weight + dotBias : weight;
    acc += w / denom;
    if (roll < acc) return name;
  }
  return 'dot';
}

export function hashString(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function randomSource(seed) {
  const uniform = mulberry32(hashString(String(seed)));
  let spare = null;
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

const clamp = (value, min = 0.02, max = 0.98) => Math.max(min, Math.min(max, value));

function pickGlyph(random, dotBias = 0) {
  const roll = random.uniform();
  const denom = 1 + dotBias;
  let acc = 0;
  for (const [name, weight] of GLYPH_WEIGHTS) {
    const w = name === 'dot' ? weight + dotBias : weight;
    acc += w / denom;
    if (roll < acc) return name;
  }
  return 'dot';
}

function childCount(random, maxChildren) {
  const roll = random.uniform();
  if (roll < 0.25) return 0;
  if (roll < 0.8) return 1;
  return maxChildren >= 2 ? 2 : 1;
}

const LOCAL_RANGE = [25, 975];

function addStar(model, random, point, source, componentId = null, clampRange = null, sizeScale = 1, swarmId = null) {
  const sourceBias = source === 'background' ? 0.5 : source === 'ambient' ? 0.28 : source === 'satellite' ? 0.05 : 0;
  const glyph = pickGlyph(random, (model.dotBias || 0) + sourceBias);
  const [sizeMin, sizeMax] = GLYPH_SIZES[glyph];
  model.stars.push({
    id: `star-${model.stars.length}`,
    x: clampRange ? clamp(point.x, clampRange[0], clampRange[1]) : clamp(point.x),
    y: clampRange ? clamp(point.y, clampRange[0], clampRange[1]) : clamp(point.y),
    glyph,
    sizePx: Math.max(0.8, random.between(sizeMin, sizeMax) * sizeScale),
    tips: glyph === 'small'
      ? [1, 2, 3, 4].map(() => random.between(0.72, 1.28))
      : [1, 1, 1, 1],
    source,
    componentId,
    swarmId,
  });
}

function addTree(model, random, options) {
  const edgeRandom = options.edgeRandom || random;
  const nodeTarget = random.integer(options.nodeMin, options.nodeMax);
  const rootDirection = options.rootAngle != null ? options.rootAngle : random.between(0, TAU);
  const root = {
    id: `${options.id}-node-0`,
    componentId: options.id,
    x: options.x,
    y: options.y,
    depth: 0,
    parentId: null,
    angle: rootDirection,
  };
  const component = { id: options.id, nodeIds: [root.id], logicalEdges: [] };
  model.nodes.push(root);

  const spawn = (parent, childIndex, siblingCount) => {
    const spread = random.normal() * options.directionStdDev;
    const forkBias = siblingCount === 2 ? (childIndex === 0 ? -0.25 : 0.25) : 0;
    let angle = parent.angle + spread + forkBias;
    const baseLength = random.between(options.branchLengthMin, options.branchLengthMax);
    const length = baseLength * options.scale * options.depthDecay ** parent.depth;
    const isoX = model.isoX || 1;
    let x = parent.x + Math.cos(angle) * length * isoX;
    let y = parent.y + Math.sin(angle) * length;
    if (x < 0.025 || x > 0.975 || y < 0.025 || y > 0.975) {
      angle += Math.PI * 0.72;
      x = parent.x + Math.cos(angle) * length * isoX;
      y = parent.y + Math.sin(angle) * length;
    }
    const child = {
      id: `${options.id}-node-${component.nodeIds.length}`,
      componentId: options.id,
      x: clamp(x),
      y: clamp(y),
      depth: parent.depth + 1,
      parentId: parent.id,
      angle,
    };
    const edge = {
      id: `${options.id}-edge-${component.logicalEdges.length}`,
      componentId: options.id,
      from: parent.id,
      to: child.id,
      length: Math.hypot(child.x - parent.x, child.y - parent.y),
      visible: false,
      style: edgeRandom.uniform() < options.dottedProb ? 'dotted' : 'solid',
    };
    model.nodes.push(child);
    model.logicalEdges.push(edge);
    component.logicalEdges.push(edge);
    component.nodeIds.push(child.id);
    return child;
  };

  const expanded = new Set();
  while (component.nodeIds.length < nodeTarget) {
    const leaves = component.nodeIds
      .map((id) => model.nodes.find((node) => node.id === id))
      .filter((node) => node.depth < options.maxDepth && !expanded.has(node.id));
    if (!leaves.length) break;
    const parent = leaves[random.integer(0, leaves.length - 1)];
    expanded.add(parent.id);
    const remaining = nodeTarget - component.nodeIds.length;
    const reach = options.maxDepth - parent.depth;
    let count = childCount(random, options.maxChildren);
    if (remaining > reach) count = Math.max(2, count);
    count = Math.max(1, Math.min(count, remaining));
    for (let i = 0; i < count; i += 1) {
      if (component.nodeIds.length >= nodeTarget) break;
      spawn(parent, i, count);
    }
  }

  applyRuns(model, component, edgeRandom, options);
  model.components.push(component);
  return component;
}

function applyRuns(model, component, edgeRandom, options) {
  const byParent = new Map();
  for (const edge of component.logicalEdges) {
    edge.visible = false;
    if (!byParent.has(edge.from)) byParent.set(edge.from, []);
    byParent.get(edge.from).push(edge);
  }
  const covered = new Set();
  const runTarget = Math.min(edgeRandom.integer(options.runsMin, options.runsMax), component.logicalEdges.length);
  for (let runIndex = 0; runIndex < runTarget; runIndex += 1) {
    const available = component.logicalEdges.filter((edge) => {
      if (covered.has(edge.id)) return false;
      if (component.logicalEdges.some((other) => other !== edge && other.visible && other.to === edge.from)) return false;
      if (component.logicalEdges.some((other) => other !== edge && other.visible && other.from === edge.from)) return false;
      return true;
    });
    if (!available.length) break;
    const run = [];
    let current = available[edgeRandom.integer(0, available.length - 1)];
    current.visible = true;
    covered.add(current.id);
    run.push(current);
    const firstEdge = run.length;
    while (run.length < 8) {
      const children = (byParent.get(current.to) || []).filter(
        (edge) => !covered.has(edge.id) && !component.logicalEdges.some((other) => other.visible && other.from === edge.from),
      );
      if (!children.length) break;
      const next = children[edgeRandom.integer(0, children.length - 1)];
      if (runIndex === 0 && firstEdge === 1) {
        next.visible = true;
      } else if (edgeRandom.uniform() < options.continueProb) {
        next.visible = true;
      } else {
        break;
      }
      covered.add(next.id);
      run.push(next);
      current = next;
    }
  }
  component.visibleRuns = component.logicalEdges.filter((edge) => edge.visible);
}

function sampleSigmaPair(random, ranges) {
  const { major: majorRange, minor: minorRange, ratio: ratioRange } = ranges;
  for (let attempt = 0; attempt < 64; attempt += 1) {
    const ratio = random.between(ratioRange[0], ratioRange[1]);
    const major = random.between(majorRange[0], majorRange[1]);
    const minor = major / ratio;
    if (minor >= minorRange[0] && minor <= minorRange[1]) return { major, minor, ratio };
  }
  const ratio = ratioRange[0];
  const major = Math.max(majorRange[0], minorRange[1] * ratio);
  return { major, minor: major / ratio, ratio };
}

function gaussianPoint(random, centre, major, minor, angle, isoX = 1) {
  const m = random.normal() * major;
  const n = random.normal() * minor;
  return {
    x: centre.x + (m * Math.cos(angle) - n * Math.sin(angle)) * isoX,
    y: centre.y + m * Math.sin(angle) + n * Math.cos(angle),
  };
}

// A looser point along a single asymmetric lobe direction, used to break the
// circular symmetry of large pockets with a few far-flung outliers.
function tailPoint(random, centre, major, minor, angle, isoX = 1) {
  const length = between(random, 1.8, 3.4);
  const m = (random.normal() * 0.5 + 0.5) * major * length;
  const n = random.normal() * minor * 0.9;
  return {
    x: centre.x + (m * Math.cos(angle) - n * Math.sin(angle)) * isoX,
    y: centre.y + m * Math.sin(angle) + n * Math.cos(angle),
  };
}

function between(random, min, max) {
  return min + random.uniform() * (max - min);
}

const SWARM_RANGES = {
  major: [GLOBAL_DEFAULTS.swarmSigmaMajorMin, GLOBAL_DEFAULTS.swarmSigmaMajorMax],
  minor: [GLOBAL_DEFAULTS.swarmSigmaMinorMin, GLOBAL_DEFAULTS.swarmSigmaMinorMax],
  ratio: [GLOBAL_DEFAULTS.anisotropyRatioMin, GLOBAL_DEFAULTS.anisotropyRatioMax],
};

function addSwarm(model, random, node, options) {
  const isoX = model.isoX || 1;
  const angle = options.angle != null ? options.angle : random.between(0, TAU);
  const offset = random.between(options.offsetMin, options.offsetMax) * options.scale;
  const centre = {
    x: clamp(node.x + Math.cos(angle) * offset * isoX),
    y: clamp(node.y + Math.sin(angle) * offset),
  };
  const sigma = sampleSigmaPair(random, options.sigmaRanges);
  const count = random.integer(options.starMin, options.starMax);
  const swarm = {
    id: `swarm-${model.swarms.length}`,
    kind: 'node',
    componentId: node.componentId,
    anchorNodeId: node.id,
    centre,
    angle,
    count,
    ...sigma,
  };
  model.swarms.push(swarm);
  const sizeScale = options.sizeScale != null ? options.sizeScale : 1;
  const tailAngle = angle + random.between(-1.1, 1.1);
  const tailCount = Math.max(1, Math.floor(count * random.between(0.14, 0.26)));
  for (let i = 0; i < count; i += 1) {
    const sigmaJitter = random.between(0.72, 1.34);
    const major = swarm.major * sigmaJitter;
    const minor = swarm.minor * (1.1 - (sigmaJitter - 1) * 0.5);
    const isTail = i < tailCount;
    const point = isTail
      ? tailPoint(random, centre, major, minor, tailAngle, isoX)
      : gaussianPoint(random, centre, major, minor, angle, isoX);
    addStar(model, random, point, 'swarm', node.componentId, null, sizeScale, swarm.id);
  }
  if (random.uniform() < options.satelliteProbability) {
    const satelliteAngle = angle + random.between(0.7, 2.5);
    const satelliteMajor = swarm.major * random.between(0.4, 0.65);
    const satelliteRatio = random.between(1.4, 2.8);
    const satelliteCount = random.integer(3, 10);
    const satelliteCentre = {
      x: clamp(centre.x + Math.cos(satelliteAngle) * swarm.major * random.between(2.2, 4.3) * isoX),
      y: clamp(centre.y + Math.sin(satelliteAngle) * swarm.major * random.between(2.2, 4.3)),
    };
    const satellite = {
      id: `swarm-${model.swarms.length}`,
      kind: 'satellite',
      componentId: node.componentId,
      centre: satelliteCentre,
      angle: satelliteAngle,
      count: satelliteCount,
      major: satelliteMajor,
      minor: satelliteMajor / satelliteRatio,
      ratio: satelliteRatio,
    };
    model.swarms.push(satellite);
    for (let i = 0; i < satelliteCount; i += 1) {
      addStar(model, random, gaussianPoint(random, satelliteCentre, satellite.major, satellite.minor, satellite.angle, isoX), 'satellite', node.componentId, null, sizeScale, satellite.id);
    }  }
}

function emptyModel(seed, kind) {
  return {
    seed,
    kind,
    isoX: kind === 'global' ? ISO_X : 1,
    components: [],
    nodes: [],
    logicalEdges: [],
    swarms: [],
    stars: [],
    ornaments: [],
    layout: {},
  };
}

export function componentBBox(model, componentId) {
  const points = [];
  const component = model.components.find((item) => item.id === componentId);
  if (!component) return null;
  for (const nodeId of component.nodeIds) {
    const node = model.nodes.find((item) => item.id === nodeId);
    points.push({ x: node.x, y: node.y });
  }
  for (const star of model.stars) {
    if (star.componentId === componentId) points.push({ x: star.x, y: star.y });
  }
  return boundingBox(points);
}

export function boundingBox(points) {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const x0 = Math.min(...xs);
  const y0 = Math.min(...ys);
  const x1 = Math.max(...xs);
  const y1 = Math.max(...ys);
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
}

// Approximate rendered radius of a mark in model units so clearance checks (and
// the aspect-aware x conversion) can keep stars from overlapping on screen.
export function markRadius(glyph, sizePx, armScale = 1) {
  const base = sizePx;
  switch (glyph) {
    case 'cross':
      return base * 1.15;
    case 'bold':
      return base * 1.3 * armScale;
    case 'dot':
      return base;
    default:
      return base * (glyph === 'medium' ? 1.05 : 1) * armScale;
  }
}

// Resolve star-on-star overlap in final layout. Endpoint stars (marked by
// `endpoint: true`) are immovable and reserve their spot first; movable stars
// are nudged outward from their owning swarm centre, and if a position cannot
// be cleared it is downgraded to a tiny dot rather than left overlapping.
// Star footprints are stored in "px" (markRadius/sizePx) but positions are in
// model units (normalized 0-1 for global, raw px for local). Convert radii into
// model units so overlap checks compare like to like.
function modelRadius(model, star) {
  const px = markRadius(star.glyph, star.sizePx, model.armScale || 1);
  return px / (model.kind === 'global' ? 1600 : 1);
}

// Find the exact swarm that owns a star so declutter pushes it back toward its
// own pocket instead of collapsing stray marks into a neighbouring cluster.
function resolveAnchor(model, star) {
  if (star.swarmId) {
    const swarm = model.swarms.find((s) => s.id === star.swarmId);
    if (swarm) return swarm;
  }
  if (star.componentId) {
    const swarm = model.swarms.find((s) => s.componentId === star.componentId && s.kind === 'node');
    if (swarm) return swarm;
  }
  return { centre: { x: star.x, y: star.y } };
}

// Padded bounds for a component so declutter never flings a star into a
// neighbouring cluster's region.
function componentBounds(model, componentId) {
  if (!componentId) return null;
  const box = componentBBox(model, componentId);
  if (!box) return null;
  const pad = 0.03;
  return { x0: box.x0 - pad, y0: box.y0 - pad, x1: box.x1 + pad, y1: box.y1 + pad };
}

function declutterStars(model) {
  const isoX = model.isoX || 1;
  const placed = [];
  const reserveable = [];
  const movable = [];
  for (const star of model.stars) {
    (star.endpoint ? reserveable : movable).push(star);
  }
  // Split apart only glyphs whose rendered footprints genuinely overlap.
  // Neighbouring marks in a dense pocket are allowed to sit close.
  const conflicts = (x, y, radius) => placed.some((other) => {
    const dx = (x - other.x) * isoX;
    const dy = y - other.y;
    const minDist = Math.max(radius, other.r) * 0.55 + 0.003;
    return Math.hypot(dx, dy) < minDist;
  });
  for (const star of reserveable) {
    placed.push({ x: star.x, y: star.y, r: modelRadius(model, star) });
    star.decluttered = false;
  }
  let collisions = 0;
  for (const star of movable) {
    const radius = modelRadius(model, star);
    let accepted = false;
    const anchor = resolveAnchor(model, star);
    if (!conflicts(star.x, star.y, radius)) {
      accepted = true;
    } else {
      const unit = 1 / (model.kind === 'global' ? 1600 : 1);
      const componentPad = componentBounds(model, star.componentId);
      for (let attempt = 0; attempt < 24; attempt += 1) {
        const angle = randomFor(model, star.id, attempt) * TAU;
        const push = cloudRadius(star) * unit * (0.5 + attempt * 0.62);
        const cx = clamp(anchor.centre.x + Math.cos(angle) * push * isoX, 0.02, 0.98);
        const cy = clamp(anchor.centre.y + Math.sin(angle) * push, 0.02, 0.98);
        const bounded = componentPad
          ? cx >= componentPad.x0 && cx <= componentPad.x1 && cy >= componentPad.y0 && cy <= componentPad.y1
          : true;
        if (bounded && !conflicts(cx, cy, radius)) {
          star.x = cx;
          star.y = cy;
          accepted = true;
          break;
        }
      }
    }
    if (!accepted) {
      // Sparse field stars (background/ambient) are deliberately tiny dots and
      // are never stacked into a cluster, so leave them alone rather than
      // shrinking every dot to a star. Structural marks shrink to a tiny
      // four-point star so the pocket keeps its presence.
      const sparse = star.source === 'background' || star.source === 'ambient' || star.glyph === 'dot';
      if (star.glyph !== 'tiny' && !sparse) {
        star.glyph = 'tiny';
        star.sizePx = 2;
        star.tips = [1, 1, 1, 1];
      }
      collisions += 1;
    }
    star.decluttered = true;
    placed.push({ x: star.x, y: star.y, r: modelRadius(model, star) });
  }
  model.layout.collisionsResolved = model.stars.length - collisions;
}

function cloudRadius(star) {
  return markRadius(star.glyph, star.sizePx) * 1.1 + 1.6;
}

function hashFor(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function randomFor(model, id, salt) {
  const rng = mulberry32(hashFor(`${model.seed}:declutter:${id}:${salt}`));
  return rng();
}

function scaleComponent(model, componentId, centre, factor) {
  scaleComponentXY(model, componentId, centre, factor, factor);
}

function scaleComponentXY(model, componentId, centre, factorX, factorY) {
  const nodes = [];
  const component = model.components.find((item) => item.id === componentId);
  for (const nodeId of component.nodeIds) nodes.push(model.nodes.find((item) => item.id === nodeId));
  const stars = model.stars.filter((star) => star.componentId === componentId);
  const swarmIds = new Set(model.swarms.filter((swarm) => swarm.componentId === componentId).map((swarm) => swarm.id));
  for (const point of [...nodes, ...stars]) {
    point.x = centre.x + (point.x - centre.x) * factorX;
    point.y = centre.y + (point.y - centre.y) * factorY;
  }
  for (const swarm of model.swarms) {
    if (swarmIds.has(swarm.id)) {
      swarm.centre.x = centre.x + (swarm.centre.x - centre.x) * factorX;
      swarm.centre.y = centre.y + (swarm.centre.y - centre.y) * factorY;
      swarm.major *= factorX;
      swarm.minor *= factorY;
    }
  }
  for (const edge of component.logicalEdges) {
    const from = model.nodes.find((node) => node.id === edge.from);
    const to = model.nodes.find((node) => node.id === edge.to);
    edge.length = Math.hypot(to.x - from.x, to.y - from.y);
  }
}

function transformAround(point, centre, factor) {
  point.x = centre.x + (point.x - centre.x) * factor;
  point.y = centre.y + (point.y - centre.y) * factor;
}

function translateComponent(model, componentId, dx, dy) {
  for (const node of model.nodes) {
    if (node.componentId !== componentId) continue;
    node.x += dx;
    node.y += dy;
  }
  for (const star of model.stars) {
    if (star.componentId !== componentId) continue;
    star.x += dx;
    star.y += dy;
  }
  for (const swarm of model.swarms) {
    if (swarm.componentId !== componentId) continue;
    swarm.centre.x += dx;
    swarm.centre.y += dy;
  }
}

function addAmbientPockets(model, random, ranges, count, sizeScale = 1) {
  const placed = [];
  for (let i = 0; i < count; i += 1) {
    let point = null;
    for (let attempt = 0; attempt < 60; attempt += 1) {
      const candidate = { x: random.between(0.05, 0.95), y: random.between(0.06, 0.94) };
      const clear = placed.every((other) => Math.hypot(candidate.x - other.x, candidate.y - other.y) > 0.11 + attempt * 0);
      const outsideComponents = model.components.every((component) => {
        const box = componentBBox(model, component.id);
        if (!box) return true;
        const pad = 0.05;
        return candidate.x < box.x0 - pad || candidate.x > box.x1 + pad || candidate.y < box.y0 - pad || candidate.y > box.y1 + pad;
      });
      if (clear && outsideComponents) {
        point = candidate;
        break;
      }
    }
    if (!point) point = { x: random.between(0.05, 0.95), y: random.between(0.06, 0.94) };
    placed.push(point);
    const sigma = sampleSigmaPair(random, {
      major: [0.012, 0.03],
      minor: [0.006, 0.015],
      ratio: [1.4, 2.8],
    });
    const pocketStars = random.integer(ranges[0], ranges[1]);
    const pocketAngle = random.between(0, TAU);
    model.swarms.push({
      id: `swarm-${model.swarms.length}`,
      kind: 'ambient',
      componentId: null,
      centre: point,
      angle: pocketAngle,
      count: pocketStars,
      ...sigma,
    });
    for (let star = 0; star < pocketStars; star += 1) {
      addStar(model, random, gaussianPoint(random, point, sigma.major, sigma.minor, pocketAngle, model.isoX), 'ambient', null, null, sizeScale);
    }
  }
}

function addBackgroundStars(model, random, count, sizeScale = 1) {
  for (let i = 0; i < count; i += 1) {
    addStar(model, random, { x: random.between(0.03, 0.97), y: random.between(0.04, 0.96) }, 'background', null, null, sizeScale);
  }
}

function addSpecialStars(model, random, count, range = { min: 0.018, max: 0.98, jitter: 0.04 }) {
  for (let i = 0; i < count; i += 1) {
    const component = model.components[random.integer(0, model.components.length - 1)];
    const nodeId = component.nodeIds[random.integer(0, component.nodeIds.length - 1)];
    const node = model.nodes.find((item) => item.id === nodeId);
    model.ornaments.push({
      id: `ornament-${i}`,
      x: clamp(node.x + random.between(-range.jitter, range.jitter), range.min, range.max),
      y: clamp(node.y + random.between(-range.jitter, range.jitter), range.min, range.max),
      sizePx: random.between(...GLYPH_SIZES.ornament),
      componentId: component.id,
    });
  }
}

export function generateGlobal(seed = 'studio-global-constellation', profileName = 'balanced') {
  const profile = GLOBAL_PROFILES[profileName] || GLOBAL_PROFILES.balanced;
  const random = randomSource(`${seed}:${profileName}`);
  const edgeRandom = randomSource(`${seed}:${profileName}:visibility`);
  const decorationRandom = randomSource(`${seed}:${profileName}:decoration`);
  const placementRandom = randomSource(`${seed}:${profileName}:placement`);
  const model = emptyModel(seed, 'global');
  model.dotBias = profile.dotBias;
  model.armScale = profile.armScale;

  const archetypes = [
    { id: 'anchor-a', weight: 2, nodeMin: 7, nodeMax: 9, pocketsMin: 3, pocketsMax: 4, pocketStars: [7, 14], runsMin: 2, runsMax: 3 },
    { id: 'anchor-b', weight: 2, nodeMin: 7, nodeMax: 9, pocketsMin: 3, pocketsMax: 4, pocketStars: [7, 14], runsMin: 2, runsMax: 3 },
    { id: 'vertical-chain', weight: 1, nodeMin: 4, nodeMax: 6, pocketsMin: 2, pocketsMax: 3, pocketStars: [6, 11], runsMin: 1, runsMax: 2, rootAngle: -Math.PI / 2 },
    { id: 'hook', weight: 1, nodeMin: 3, nodeMax: 5, pocketsMin: 1, pocketsMax: 2, pocketStars: [6, 11], runsMin: 1, runsMax: 2 },
    { id: 'micro', weight: 2, nodeMin: 2, nodeMax: 3, pocketsMin: 1, pocketsMax: 2, pocketStars: [5, 10], runsMin: 1, runsMax: 1, scale: [0.72, 0.95] },
    { id: 'dim', weight: 1, nodeMin: 1, nodeMax: 2, pocketsMin: 0, pocketsMax: 1, pocketStars: [4, 8], runsMin: 1, runsMax: 1, scale: [0.5, 0.7] },
  ];

  const typePool = [];
  for (const type of archetypes) {
    for (let i = 0; i < type.weight; i += 1) typePool.push(type);
  }
  const choiceCount = 5;
  const chosen = [];
  for (let i = 0; i < choiceCount; i += 1) {
    chosen.push(typePool[placementRandom.integer(0, typePool.length - 1)]);
  }

  // Build each component around the field centre so its footprint is measured
  // before it is packed.
  const placedBoxes = [];
  for (let index = 0; index < chosen.length; index += 1) {
    const type = chosen[index];
    const scale = type.scale
      ? placementRandom.between(type.scale[0], type.scale[1])
      : placementRandom.between(0.88, 1.06);
    const id = `component-${index}`;
    addTree(model, random, {
      id,
      x: 0.5,
      y: 0.5,
      scale,
      nodeMin: type.nodeMin,
      nodeMax: type.nodeMax,
      maxChildren: 2,
      maxDepth: 4,
      branchLengthMin: 0.11,
      branchLengthMax: 0.22,
      depthDecay: 0.92,
      directionStdDev: (type.rootAngle ? 22 : 44) * DEG,
      rootAngle: type.rootAngle,
      runsMin: type.runsMin + profile.runsBoost,
      runsMax: type.runsMax + profile.runsBoost,
      continueProb: 0.9,
      dottedProb: 0.46,
      edgeRandom,
    });

    const component = model.components[model.components.length - 1];
    const pocketCount = placementRandom.integer(type.pocketsMin, type.pocketsMax);
    const runNodes = new Set();
    for (const edge of component.logicalEdges) {
      if (edge.visible) {
        runNodes.add(edge.from);
        runNodes.add(edge.to);
      }
    }
    const pocketAnchorSource = runNodes.size
      ? [...runNodes]
      : [...component.nodeIds];
    const anchors = [];
    for (const nodeId of pocketAnchorSource) {
      if (anchors.length >= pocketCount) break;
      if (placementRandom.uniform() < 0.62) anchors.push(nodeId);
    }
    while (anchors.length < pocketCount && anchors.length < pocketAnchorSource.length) {
      const nodeId = pocketAnchorSource[placementRandom.integer(0, pocketAnchorSource.length - 1)];
      if (!anchors.includes(nodeId)) anchors.push(nodeId);
    }
    for (const nodeId of anchors) {
      const node = model.nodes.find((item) => item.id === nodeId);
      const incoming = component.logicalEdges.find((edge) => edge.visible && edge.to === nodeId);
      const angle = incoming
        ? Math.atan2(model.nodes.find((n) => n.id === incoming.from).y - node.y, model.nodes.find((n) => n.id === incoming.from).x - node.x)
        : placementRandom.between(0, TAU);
      addSwarm(model, decorationRandom, node, {
        scale: 1,
        offsetMin: 0.008,
        offsetMax: 0.03,
        sigmaRanges: SWARM_RANGES,
        starMin: type.pocketStars[0],
        starMax: type.pocketStars[1],
        satelliteProbability: 0.28,
        angle: angle + placementRandom.between(-0.3, 0.3),
        sizeScale: profile.sizeScale,
      });
    }

    // Mark a delicate four-point star exactly on each visible-run endpoint so
    // lines terminate in stars rather than circles.
    markRunEndpointStars(model, decorationRandom, id, profile.sizeScale);
    for (const star of model.stars.filter((s) => s.endpoint)) {
      star.tips = [1, 1, 1, 1];
    }

    // Measure the component footprint (inflated) then place it by best-candidate
    // sampling so components stay dispersed and non-overlapping.
    const pad = 0.045;
    const bbox = componentBBox(model, id);
    const size = { w: bbox.w + pad * 2, h: bbox.h + pad * 2 };
    let best = null;
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const candidate = {
        x: placementRandom.between(size.w / 2 + 0.02, 1 - size.w / 2 - 0.02),
        y: placementRandom.between(size.h / 2 + 0.03, 1 - size.h / 2 - 0.03),
      };
      let minClearance = Infinity;
      let overlap = false;
      for (const other of placedBoxes) {
        const dx = Math.max(0, Math.max(other.x0 - candidate.x, candidate.x - other.x1));
        const dy = Math.max(0, Math.max(other.y0 - candidate.y, candidate.y - other.y1));
        const clearance = Math.hypot(dx, dy);
        if (dx === 0 && dy === 0) { overlap = true; break; }
        minClearance = Math.min(minClearance, clearance);
      }
      if (overlap) continue;
      const score = minClearance;
      if (!best || score > best.score) best = { x: candidate.x, y: candidate.y, score };
    }
    const centre = best || { x: 0.5, y: 0.5 };
    translateComponent(model, id, centre.x - bbox.cx, centre.y - bbox.cy);
    const finalBox = componentBBox(model, id);
    placedBoxes.push({
      x0: finalBox.x0 - pad,
      y0: finalBox.y0 - pad,
      x1: finalBox.x1 + pad,
      y1: finalBox.y1 + pad,
    });
  }

  addAmbientPockets(
    model,
    decorationRandom,
    [GLOBAL_DEFAULTS.ambientPocketStarsMin + 2, GLOBAL_DEFAULTS.ambientPocketStarsMax + 5],
    decorationRandom.integer(GLOBAL_DEFAULTS.ambientPocketCountMin, GLOBAL_DEFAULTS.ambientPocketCountMax + 1),
    profile.sizeScale,
  );
  addBackgroundStars(model, decorationRandom, decorationRandom.integer(GLOBAL_DEFAULTS.backgroundStarCountMin + 22, GLOBAL_DEFAULTS.backgroundStarCountMax + 36), profile.sizeScale);
  addSpecialStars(model, decorationRandom, decorationRandom.integer(GLOBAL_DEFAULTS.specialStarCountMin, GLOBAL_DEFAULTS.specialStarCountMax));

  declutterStars(model);
  model.layout.placed = placedBoxes.length;
  return model;
}

// Place a delicate, immovable four-point star at each tip of a visible run so
// the line terminates in a star rather than a plain node circle.
function markRunEndpointStars(model, random, componentId, sizeScale = 1) {
  const component = model.components.find((item) => item.id === componentId);
  if (!component) return;
  const visible = component.logicalEdges.filter((edge) => edge.visible);
  if (!visible.length) return;
  const incident = new Map();
  for (const edge of visible) {
    incident.set(edge.to, (incident.get(edge.to) || 0) + 1);
    incident.set(edge.from, (incident.get(edge.from) || 0) + 1);
  }
  const endpoints = [];
  for (const nodeId of component.nodeIds) {
    const degree = incident.get(nodeId) || 0;
    if (degree === 1) endpoints.push(nodeId);
  }
  if (!endpoints.length) {
    endpointStar(model, random, visible[0].from, componentId, sizeScale);
    endpointStar(model, random, visible[visible.length - 1].to, componentId, sizeScale);
    return;
  }
  const used = new Set();
  for (const nodeId of endpoints.slice(0, 6)) {
    if (used.has(nodeId)) continue;
    used.add(nodeId);
    endpointStar(model, random, nodeId, componentId, sizeScale);
  }
}

function endpointStar(model, random, nodeId, componentId, sizeScale) {
  const node = model.nodes.find((item) => item.id === nodeId);
  if (!node) return;
  const size = random.between(5, 7.5) * sizeScale;
  model.stars.push({
    id: `star-${model.stars.length}`,
    x: clamp(node.x),
    y: clamp(node.y),
    glyph: 'small',
    sizePx: size,
    tips: [1, 1, 1, 1],
    source: 'endpoint',
    componentId,
    endpoint: true,
  });
}

const LOCAL_CONFIG = Object.freeze({
  big: {
    main: {
      nodeMin: 7, nodeMax: 10, pocketsMin: 3, pocketsMax: 5, pocketStars: [7, 16],
      runsMin: 2, runsMax: 3, targetWidth: [0.5, 0.6], targetHeight: [0.45, 0.6],
    },
    satellites: [],
    ambientStars: [5, 10],
    interstitial: null,
  },
  'big-plus-one': {
    main: {
      nodeMin: 7, nodeMax: 9, pocketsMin: 3, pocketsMax: 4, pocketStars: [7, 14],
      runsMin: 2, runsMax: 3, targetWidth: [0.42, 0.52],
    },
    satellites: [
      {
        name: 'satellite-a', nodeMin: 3, nodeMax: 5, pocketsMin: 1, pocketsMax: 2,
        pocketStars: [5, 10], runsMin: 1, runsMax: 2, sizeRelative: [0.25, 0.4],
      },
    ],
    interstitial: [3, 6],
    ambientStars: null,
  },
  'big-plus-two': {
    main: {
      nodeMin: 7, nodeMax: 9, pocketsMin: 3, pocketsMax: 4, pocketStars: [7, 14],
      runsMin: 2, runsMax: 3, targetWidth: [0.4, 0.5],
    },
    satellites: [
      {
        name: 'satellite-a', nodeMin: 3, nodeMax: 5, pocketsMin: 1, pocketsMax: 2,
        pocketStars: [5, 10], runsMin: 1, runsMax: 2, sizeRelative: [0.25, 0.35],
      },
      {
        name: 'satellite-b', nodeMin: 2, nodeMax: 3, pocketsMin: 1, pocketsMax: 1,
        pocketStars: [4, 8], runsMin: 1, runsMax: 2, sizeRelative: [0.1, 0.2],
      },
    ],
    interstitial: [4, 8],
    ambientStars: null,
  },
});

function buildComponent(model, random, options, id, x, y) {
  const component = addTree(model, random, {
    id,
    x,
    y,
    scale: 1,
    nodeMin: options.nodeMin,
    nodeMax: options.nodeMax,
    maxChildren: 2,
    maxDepth: 4,
    branchLengthMin: 0.04,
    branchLengthMax: 0.09,
    depthDecay: 0.86,
    directionStdDev: 45 * DEG,
    runsMin: options.runsMin,
    runsMax: options.runsMax,
    continueProb: 0.64,
    dottedProb: 0.46,
    edgeRandom: random,
  });
  const pockets = random.integer(options.pocketsMin, options.pocketsMax);
  const selected = [];
  const nodeIds = [...component.nodeIds].sort(() => random.uniform() - 0.5);
  for (const nodeId of nodeIds) {
    if (selected.length >= pockets) break;
    if (random.uniform() < 0.6) selected.push(nodeId);
  }
  while (selected.length < pockets && selected.length < nodeIds.length) {
    const nodeId = nodeIds[random.integer(0, nodeIds.length - 1)];
    if (!selected.includes(nodeId)) selected.push(nodeId);
  }
  for (const nodeId of selected) {
    const node = model.nodes.find((item) => item.id === nodeId);
    addSwarm(model, random, node, {
      scale: 1,
      offsetMin: 0.008,
      offsetMax: 0.03,
      sigmaRanges: { major: [0.018, 0.04], minor: [0.009, 0.022], ratio: [1.4, 2.8] },
      starMin: options.pocketStars[0],
      starMax: options.pocketStars[1],
      satelliteProbability: 0,
    });
  }
  return component;
}

export function generateLocal(slug, variant) {
  const config = LOCAL_CONFIG[variant];
  if (!config) throw new Error(`Unknown local variant: ${variant}`);
  const seed = `${slug}-${variant}`;
  const model = emptyModel(seed, variant);
  const mainRandom = randomSource(`${seed}:main`);
  const satRandomA = randomSource(`${seed}:sat-a`);
  const satRandomB = randomSource(`${seed}:sat-b`);
  const placementRandom = randomSource(`${seed}:placement`);
  const decorationRandom = randomSource(`${seed}:decoration`);

  buildComponent(model, mainRandom, config.main, 'main', 0.5, 0.48);
  let mainBox = componentBBox(model, 'main');
  const targetWidth = placementRandom.between(config.main.targetWidth[0], config.main.targetWidth[1]) * 1000;
  const targetHeight = config.main.targetHeight
    ? placementRandom.between(config.main.targetHeight[0], config.main.targetHeight[1]) * 1000
    : null;
  const mainFactor = targetHeight
    ? Math.min(targetWidth / mainBox.w, targetHeight / mainBox.h)
    : targetWidth / mainBox.w;
  const mainFactorX = targetHeight ? targetWidth / mainBox.w : mainFactor;
  const mainFactorY = targetHeight ? targetHeight / mainBox.h : mainFactor;
  scaleComponentXY(model, 'main', { x: mainBox.cx, y: mainBox.cy }, mainFactorX, mainFactorY);
  mainBox = componentBBox(model, 'main');
  translateComponent(model, 'main', 500 - mainBox.cx, 480 - mainBox.cy);
  mainBox = componentBBox(model, 'main');
  const mainCentre = { x: mainBox.cx, y: mainBox.cy };
  const plate = {
    x0: mainCentre.x - targetWidth / 2,
    y0: mainCentre.y - (targetHeight || targetWidth) / 2,
    x1: mainCentre.x + targetWidth / 2,
    y1: mainCentre.y + (targetHeight || targetWidth) / 2,
    w: targetWidth,
    h: targetHeight || targetWidth,
  };

  const satRecords = [];
  if (config.satellites.length) {
    config.satellites.forEach((satellite, index) => {
      const random = index === 0 ? satRandomA : satRandomB;
      buildComponent(model, random, satellite, satellite.name, 0.5, 0.5);
      const sizeRelative = random.between(satellite.sizeRelative[0], satellite.sizeRelative[1]);
      let satBox = componentBBox(model, satellite.name);
      scaleComponent(model, satellite.name, { x: satBox.cx, y: satBox.cy }, (sizeRelative * mainBox.w) / satBox.w);
      satBox = componentBBox(model, satellite.name);

      const desiredGap = mainBox.w * placementRandom.between(0.15, 0.35);
      const minGap = mainBox.w * 0.15;
      let chosen = null;
      const baseAngle = index === 0 ? placementRandom.between(0, TAU) : null;
      const relativeDelta = index > 0
        ? Math.min(Math.max(placementRandom.between(70, 190) * DEG + placementRandom.between(-0.08, 0.08), 0.9 * DEG), 0.96 * TAU)
        : 0;
      const angleCandidates = [];
      for (const octant of [0, 1, 2, 3, 4, 5, 6, 7]) angleCandidates.push((octant * Math.PI) / 4);
      const sampleAngle = (attempt) => {
        if (index === 0) return baseAngle + placementRandom.between(-0.4, 0.4);
        return satRecords[0].angle + relativeDelta + placementRandom.between(-0.1, 0.1);
      };
      for (let attempt = 0; attempt < 32 && !chosen; attempt += 1) {
        const angle = index === 0 && attempt < 8
          ? angleCandidates[attempt] + placementRandom.between(-0.35, 0.35)
          : sampleAngle(attempt);
        const u = { x: Math.cos(angle), y: Math.sin(angle) };
        const halfMain = (Math.abs(u.x) * mainBox.w + Math.abs(u.y) * mainBox.h) / 2;
        const halfSat = (Math.abs(u.x) * satBox.w + Math.abs(u.y) * satBox.h) / 2;
        const maxD = Math.min(
          (0.975 * 1000 - mainCentre.x) / (Math.abs(u.x) || 1e-6) - halfSat,
          (mainCentre.x - 0.025 * 1000) / (Math.abs(u.x) || 1e-6) - halfSat,
          (0.975 * 1000 - mainCentre.y) / (Math.abs(u.y) || 1e-6) - halfSat,
          (mainCentre.y - 0.025 * 1000) / (Math.abs(u.y) || 1e-6) - halfSat,
        );
        const feasible = maxD - halfMain - halfSat;
        if (feasible >= minGap) {
          chosen = { angle, halfMain, halfSat, distance: halfMain + Math.min(desiredGap, feasible) + halfSat };
        }
      }
      for (let shrink = 0; shrink < 12 && !chosen; shrink += 1) {
        scaleComponent(model, satellite.name, { x: satBox.cx, y: satBox.cy }, 0.85);
        satBox = componentBBox(model, satellite.name);
        for (let attempt = 0; attempt < 16 && !chosen; attempt += 1) {
          const angle = sampleAngle(attempt);
          const u = { x: Math.cos(angle), y: Math.sin(angle) };
          const halfMain = (Math.abs(u.x) * mainBox.w + Math.abs(u.y) * mainBox.h) / 2;
          const halfSat = (Math.abs(u.x) * satBox.w + Math.abs(u.y) * satBox.h) / 2;
          const maxD = Math.min(
            (0.975 * 1000 - mainCentre.x) / (Math.abs(u.x) || 1e-6) - halfSat,
            (mainCentre.x - 0.025 * 1000) / (Math.abs(u.x) || 1e-6) - halfSat,
            (0.975 * 1000 - mainCentre.y) / (Math.abs(u.y) || 1e-6) - halfSat,
            (mainCentre.y - 0.025 * 1000) / (Math.abs(u.y) || 1e-6) - halfSat,
          );
          const feasible = maxD - halfMain - halfSat;
          if (feasible >= minGap) {
            chosen = { angle, halfMain, halfSat, distance: halfMain + Math.min(desiredGap, feasible) + halfSat };
          }
        }
      }
      if (!chosen) {
        const angle = index === 0 ? baseAngle || 0 : satRecords[0].angle + (index === 1 ? 90 * DEG : satRecords.length === 1 ? 90 * DEG : 90 * DEG);
        const u = { x: Math.cos(angle), y: Math.sin(angle) };
        const halfMain = (Math.abs(u.x) * mainBox.w + Math.abs(u.y) * mainBox.h) / 2;
        const halfSat = (Math.abs(u.x) * satBox.w + Math.abs(u.y) * satBox.h) / 2;
        const maxD = Math.min(
          (0.975 * 1000 - mainCentre.x) / (Math.abs(u.x) || 1e-6) - halfSat,
          (mainCentre.x - 0.025 * 1000) / (Math.abs(u.x) || 1e-6) - halfSat,
          (0.975 * 1000 - mainCentre.y) / (Math.abs(u.y) || 1e-6) - halfSat,
          (mainCentre.y - 0.025 * 1000) / (Math.abs(u.y) || 1e-6) - halfSat,
        );
        chosen = { angle, halfMain, halfSat, distance: Math.max(halfMain + halfSat, maxD) };
      }
      const centre = {
        x: mainCentre.x + Math.cos(chosen.angle) * chosen.distance,
        y: mainCentre.y + Math.sin(chosen.angle) * chosen.distance,
      };
      const offsetX = centre.x - satBox.cx;
      const offsetY = centre.y - satBox.cy;
      translateComponent(model, satellite.name, offsetX, offsetY);
      const finalBox = componentBBox(model, satellite.name);
      const measuredGap = Math.hypot(finalBox.cx - mainCentre.x, finalBox.cy - mainCentre.y)
        - chosen.halfMain - chosen.halfSat;
      satRecords.push({
        name: satellite.name,
        centre: { x: finalBox.cx, y: finalBox.cy },
        bbox: finalBox,
        sizeRelative,
        angle: chosen.angle,
        gap: measuredGap,
      });
    });
  }

  const interstitial = config.interstitial;
  if (interstitial) {
    const count = placementRandom.integer(interstitial[0], interstitial[1]);
    let placed = 0;
    for (let i = 0; i < count * 20 && placed < count; i += 1) {
      const target = satRecords[placementRandom.integer(0, satRecords.length - 1)];
      const progress = placementRandom.between(0.22, 0.78);
      const noisy = placementRandom.normal() * placementRandom.between(0.012, 0.035);
      const dx = target.centre.x - mainCentre.x;
      const dy = target.centre.y - mainCentre.y;
      const point = {
        x: clamp(mainCentre.x + dx * progress - dy * noisy, 0.03 * 1000, 0.97 * 1000),
        y: clamp(mainCentre.y + dy * progress + dx * noisy, 0.03 * 1000, 0.97 * 1000),
      };
      const insideAny = [mainBox, ...satRecords.map((record) => record.bbox)].some((box) => point.x > box.x0 + 0.006 && point.x < box.x1 - 0.006 && point.y > box.y0 + 0.006 && point.y < box.y1 - 0.006);
      if (insideAny) continue;
      addStar(model, decorationRandom, point, 'interstitial', null, LOCAL_RANGE);
      placed += 1;
    }
  } else if (config.ambientStars) {
    const count = placementRandom.integer(config.ambientStars[0], config.ambientStars[1]);
    const maxPerSide = 4;
    const guard = { top: 0, right: 0, bottom: 0, left: 0 };
    let placed = 0;
    for (let i = 0; i < count * 12 && placed < count; i += 1) {
      const compass = ['top', 'right', 'bottom', 'left'][placementRandom.integer(0, 3)];
      if (guard[compass] >= maxPerSide) continue;
      const t = placementRandom.between(0.08, 0.92);
      let point;
      if (compass === 'top') point = { x: plate.x0 + plate.w * t, y: plate.y0 };
      if (compass === 'bottom') point = { x: plate.x0 + plate.w * t, y: plate.y1 };
      if (compass === 'left') point = { x: plate.x0, y: plate.y0 + plate.h * t };
      if (compass === 'right') point = { x: plate.x1, y: plate.y0 + plate.h * t };
      const insideMain = point.x > mainBox.x0 + 0.01 && point.x < mainBox.x1 - 0.01 && point.y > mainBox.y0 + 0.01 && point.y < mainBox.y1 - 0.01;
      if (insideMain) continue;
      guard[compass] += 1;
      addStar(model, decorationRandom, point, 'ambient', null, LOCAL_RANGE);
      placed += 1;
    }
  }

  addSpecialStars(model, decorationRandom, 1, { min: 45, max: 955, jitter: 40 });
  if (satRecords.length && placementRandom.uniform() < 0.4) {
    const target = satRecords[placementRandom.integer(0, satRecords.length - 1)];
    model.ornaments.push({
      id: 'ornament-1',
      x: target.centre.x + placementRandom.between(-20, 20),
      y: target.centre.y + placementRandom.between(-20, 20),
      sizePx: decorationRandom.between(16, 26),
      componentId: target.name,
    });
  }

  mainBox = componentBBox(model, 'main');
  const fragBBox = boundingBox([
    ...model.nodes.map((node) => ({ x: node.x, y: node.y })),
    ...model.stars.map((star) => ({ x: star.x, y: star.y })),
    ...model.ornaments.map((ornament) => ({ x: ornament.x, y: ornament.y })),
  ]);

  model.layout = {
    mainBBox: mainBox,
    mainCentre: { x: mainBox.cx, y: mainBox.cy },
    mainWidthFraction: mainBox.w / 1000,
    mainHeightFraction: mainBox.h / 1000,
    fragBBox,
    fragWidthFraction: fragBBox.w / 1000,
    fragHeightFraction: fragBBox.h / 1000,
    satellites: satRecords,
    interstitialCount: config.interstitial ? model.stars.filter((star) => star.source === 'interstitial').length : 0,
    ambientCount: model.stars.filter((star) => star.source === 'ambient').length,
  };
  return model;
}

export function summarize(model) {
  const visible = model.logicalEdges.filter((edge) => edge.visible);
  const dotted = visible.filter((edge) => edge.style === 'dotted');
  const nodeSwarms = model.swarms.filter((swarm) => swarm.kind === 'node');
  const ambientPockets = model.swarms.filter((swarm) => swarm.kind === 'ambient');
  return {
    components: model.components.length,
    nodes: model.nodes.length,
    visibleEdges: visible.length,
    hiddenEdges: model.logicalEdges.length - visible.length,
    runs: model.components.reduce((total, component) => total + (component.visibleRuns ? component.visibleRuns.length : 0), 0),
    dottedRatio: visible.length ? dotted.length / visible.length : 0,
    nodeSwarms: nodeSwarms.length,
    ambientPockets: ambientPockets.length,
    cloudStars: model.swarms.filter((swarm) => swarm.kind !== 'ambient').reduce((sum, swarm) => sum + swarm.count, 0),
    stars: model.stars.length,
    dots: model.stars.filter((star) => star.glyph === 'dot').length,
    ornaments: model.ornaments.length,
  };
}
