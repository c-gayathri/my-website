import { GLOBAL_PROFILES, generateGlobal, generateLocal, summarize } from './constellation.js';

const NS = 'http://www.w3.org/2000/svg';

const GLOBAL_PX_SCALE = 1.0;
const LOCAL_PX_SCALE = 1.7;

function element(name, attributes = {}) {
  const node = document.createElementNS(NS, name);
  for (const [key, value] of Object.entries(attributes)) {
    node.setAttribute(key, String(value));
  }
  return node;
}

function round(value) {
  return Math.round(value * 100) / 100;
}

function polar(x, y, radius, angle) {
  return [x + Math.cos(angle) * radius, y + Math.sin(angle) * radius];
}

// Delicate four-point star: four sharp arm tips with a small concave waist.
// `waist` controls how much of the centre is "fat"; low values keep the arms
// long and fine. `tips` lets individual arm lengths vary.
function glintPath(x, y, r, waist, tips, neckAxis) {
  const spikes = [tips[0], tips[1], tips[2], tips[3]];
  const angles = [-Math.PI / 2, 0, Math.PI / 2, Math.PI];
  const outer = spikes.map((length, i) => polar(x, y, r * length, angles[i]));
  const inner = angles.map((angle) => polar(x, y, r * waist, angle + Math.PI / 4));
  const t = (pt) => `${round(pt[0])},${round(pt[1])}`;
  const segments = [];
  for (let i = 0; i < 4; i += 1) {
    const from = outer[i];
    const control = inner[i];
    const to = outer[(i + 1) % 4];
    segments.push(`Q ${t(control)} ${t(to)}`);
  }
  const neckScale = neckAxis == null ? 0 : neckAxis;
  const parts = [`M ${t(outer[0])}`, ...segments].join(' ');
  if (neckScale === 0) return parts;
  const nk = polar(x, y, r * neckScale, -Math.PI / 2);
  const sk = polar(x, y, r * neckScale, Math.PI / 2);
  return `${parts} M ${t(nk)} L ${t(sk)}`;
}

function renderGlyph(group, star, sx, sy, scale) {
  const x = sx(star.x);
  const y = sy(star.y);
  const r = star.sizePx * scale;
  switch (star.glyph) {
    case 'dot':
      group.append(element('circle', { cx: x, cy: y, r }));
      break;
    case 'cross': {
      const arm = r * 1.15;
      group.append(element('path', {
        d: `M ${x - arm} ${y} L ${x + arm} ${y} M ${x} ${y - arm} L ${x} ${y + arm}`,
        fill: 'none',
        stroke: 'currentColor',
        'stroke-width': r * 0.5,
        'stroke-linecap': 'round',
        'data-glyph': 'cross',
      }));
      break;
    }
    case 'bold':
      group.append(element('path', { d: glintPath(x, y, r, 0.045, [1.35, 0.55, 1.35, 0.55], 0.14), 'data-glyph': 'bold' }));
      break;
    case 'small':
      group.append(element('path', { d: glintPath(x, y, r, 0.055, star.tips, 0), 'data-glyph': 'small' }));
      break;
    case 'medium':
      group.append(element('path', { d: glintPath(x, y, r, 0.045, [1, 1, 1, 1], 0), 'data-glyph': 'medium' }));
      break;
    default:
      group.append(element('path', { d: glintPath(x, y, r, 0.05, [1, 1, 1, 1], 0), 'data-glyph': 'tiny' }));
  }
}

function renderOrnament(group, ornament, sx, sy, scale) {
  const x = sx(ornament.x);
  const y = sy(ornament.y);
  const r = ornament.sizePx * scale;
  const pts = [];
  for (let i = 0; i < 8; i += 1) {
    const outerAngle = (i * Math.PI) / 4;
    const innerAngle = outerAngle + Math.PI / 8;
    const outer = polar(x, y, r, outerAngle);
    const inner = polar(x, y, r * 0.14, innerAngle);
    pts.push(`${round(outer[0])},${round(outer[1])}`, `${round(inner[0])},${round(inner[1])}`);
  }
  group.append(element('polygon', { points: pts.join(' ') }));
}

export function renderConstellation(model, label, pxScale) {
  const normalized = model.kind === 'global';
  const width = normalized ? 1600 : 1000;
  const height = normalized ? 840 : 1000;
  const sx = (value) => (normalized ? value * width : value);
  const sy = (value) => (normalized ? value * height : value);
  const svg = element('svg', {
    class: 'constellation-svg',
    viewBox: `0 0 ${width} ${height}`,
    preserveAspectRatio: 'xMidYMid meet',
    role: 'img',
    'aria-label': label,
    'data-seed': model.seed,
    style: 'color:#000',
  });
  const nodes = new Map(model.nodes.map((node) => [node.id, node]));

  const edgeGroup = element('g', { fill: 'none' });
  for (const edge of model.logicalEdges.filter((item) => item.visible)) {
    const from = nodes.get(edge.from);
    const to = nodes.get(edge.to);
    edgeGroup.append(element('path', {
      class: `edge edge-${edge.style}`,
      d: `M ${sx(from.x)} ${sy(from.y)} L ${sx(to.x)} ${sy(to.y)}`,
      'data-component': edge.componentId,
    }));
  }
  svg.append(edgeGroup);

  const edges = model.logicalEdges.filter((item) => item.visible);
  const visibleNodeIds = new Set();
  for (const edge of edges) {
    visibleNodeIds.add(edge.from);
    visibleNodeIds.add(edge.to);
  }

  const nodeGroup = element('g', { class: 'mark dark' });
  const dotR = 1.2 * pxScale;
  for (const node of model.nodes) {
    if (visibleNodeIds.has(node.id)) continue;
    nodeGroup.append(element('circle', {
      cx: sx(node.x),
      cy: sy(node.y),
      r: dotR,
      'data-node': node.id,
    }));
  }
  svg.append(nodeGroup);

  const starGroup = element('g', { class: 'mark dark' });
  for (const star of model.stars) renderGlyph(starGroup, star, sx, sy, pxScale);
  svg.append(starGroup);

  const ornamentGroup = element('g', { class: 'mark dark' });
  for (const ornament of model.ornaments) renderOrnament(ornamentGroup, ornament, sx, sy, pxScale);
  svg.append(ornamentGroup);
  return svg;
}

const globalModel = generateGlobal();
document.querySelector('#global-field').append(renderConstellation(globalModel, 'Global deterministic constellation', GLOBAL_PX_SCALE));
const globalSummary = summarize(globalModel);
document.querySelector('#global-metrics').innerHTML = [
  `${globalSummary.components} components`,
  `${globalSummary.nodes} tree nodes`,
  `${globalSummary.visibleEdges} shown edges`,
  `${globalSummary.runs} edge runs`,
  `${globalSummary.nodeSwarms} node swarms`,
  `${globalSummary.ambientPockets} ambient pockets`,
  `${globalSummary.stars} field stars`,
].map((item) => `<span>${item}</span>`).join('');

// Three deterministic profile variants of the global field, generated side-by-side
// for direct comparison of the delicate four-point star vocabulary.
const profileFields = document.querySelector('#profile-fields');
window.constellationProfiles = {};
const profileOrder = ['wispy', 'balanced', 'threaded'];
for (const profileName of profileOrder) {
  const model = generateGlobal(`studio-${profileName}`, profileName);
  window.constellationProfiles[profileName] = model;
  const summary = summarize(model);
  const article = document.createElement('article');
  article.className = 'profile';
  const field = document.createElement('div');
  field.className = 'field';
  field.append(renderConstellation(model, `${profileName} profile`, GLOBAL_PX_SCALE));
  article.append(field);
  article.insertAdjacentHTML(
    'beforeend',
    `<p class="index">${profileOrder.indexOf(profileName) + 1}</p><h3>${profileName}</h3><p class="variant-meta">${summary.stars} stars / ${summary.dots} dots / ${summary.visibleEdges} edges</p>`,
  );
  profileFields.append(article);
}

const variants = [
  ['big', 'study-0', 'A', 'One big cluster'],
  ['big-plus-one', 'study-1', 'B', 'One big + one small'],
  ['big-plus-two', 'study-4', 'C', 'One big + two small'],
];
const localFields = document.querySelector('#local-fields');
window.constellationModels = { global: globalModel, locals: {} };

for (const [variant, slug, index, title] of variants) {
  const model = generateLocal(slug, variant);
  window.constellationModels.locals[variant] = model;
  const summary = summarize(model);
  const article = document.createElement('article');
  article.className = 'variant';
  const field = document.createElement('div');
  field.className = 'field';
  field.append(renderConstellation(model, title, LOCAL_PX_SCALE));
  article.append(field);
  article.insertAdjacentHTML(
    'beforeend',
    `<p class="index">${index}</p><h3>${title}</h3><p class="variant-meta">${summary.components} components / ${summary.nodeSwarms} pockets / ${summary.visibleEdges} edges / ${summary.stars} stars</p>`,
  );
  localFields.append(article);
}

window.constellationReady = true;
