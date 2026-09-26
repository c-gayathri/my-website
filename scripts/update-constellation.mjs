// Run: npm run constellation:update
// Regenerates constellation coverage metadata after adding/removing a cluster.
// It mirrors generateClusterAnchors(), computes the cluster bbox,
// and verifies the star-field (0.02-0.98 of world) covers every cluster.
// Writes src/data/constellationMeta.json for debugging; Constellation.tsx
// generates fresh stars/lines at runtime from the same seed + world size.
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const clustersDir = join(root, 'src/content/clusters');
const orderPath = join(root, 'src/data/clusterOrder.ts');
const configPath = join(root, 'src/data/studioConfig.ts');
const outPath = join(root, 'src/data/constellationMeta.json');

function hashString(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
function randomFor(value) {
  let state = hashString(value);
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let r = Math.imul(state ^ (state >>> 15), 1 | state);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// Photography has its own gallery view, so it is not a constellation cluster.
const files = readdirSync(clustersDir).filter((f) => f.endsWith('.md') && f !== 'photography.md');
function frontmatterScalar(source, key, fallback) {
  const raw = source.match(new RegExp(`^${key}:\\s*(.+?)\\s*$`, 'm'))?.[1]?.trim();
  if (!raw) return fallback;
  if (raw.startsWith('"') && raw.endsWith('"')) {
    try { return JSON.parse(raw); } catch { return raw.slice(1, -1); }
  }
  if (raw.startsWith("'") && raw.endsWith("'")) return raw.slice(1, -1).replaceAll("''", "'");
  return raw;
}
const clusterRecords = files.map((file) => {
  const id = file.replace(/\.md$/, '');
  const source = readFileSync(join(clustersDir, file), 'utf8');
  const title = frontmatterScalar(source, 'title', id);
  const description = frontmatterScalar(source, 'description', '');
  return { id, title, description };
});
const ids = clusterRecords.map((cluster) => cluster.id);
let order = ids;
if (existsSync(orderPath)) {
  const src = readFileSync(orderPath, 'utf8');
  // Anchor to the exported value so the `string[]` type annotation is not
  // mistaken for the array itself.
  const m = src.match(/clusterOrder[^=]*=\s*\[([\s\S]*?)\]/);
  if (m) order = [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]).filter((id) => ids.includes(id));
}
const missing = ids.filter((id) => !order.includes(id));
const fullOrder = [...order, ...missing.sort()];

// Mirror studioConfig.ts base world
let baseW = 2600; let baseH = 1700; let seed = 19;
let worldScale = 1.38; let minimumWorldScale = 1.35;
let edgeMarginFraction = 0.065; let focusRadiusFraction = 0.29; let collisionGap = 185;
try {
  const cfg = readFileSync(configPath, 'utf8');
  const w = cfg.match(/width:\s*(\d+)/); const h = cfg.match(/height:\s*(\d+)/);
  const s = cfg.match(/layoutSeed:\s*(\d+)/);
  const number = (name, fallback) => Number(cfg.match(new RegExp(`${name}:\\s*([\\d.]+)`))?.[1] ?? fallback);
  if (w) baseW = Number(w[1]); if (h) { const all = [...cfg.matchAll(/height:\s*(\d+)/g)]; if (all[0]) baseH = Number(all[0][1]); }
  if (s) seed = Number(s[1]);
  worldScale = number('worldScale', worldScale);
  minimumWorldScale = number('minimumWorldScale', minimumWorldScale);
  edgeMarginFraction = number('edgeMarginFraction', edgeMarginFraction);
  focusRadiusFraction = number('focusRadiusFraction', focusRadiusFraction);
  collisionGap = number('collisionGap', collisionGap);
} catch { /* defaults */ }

const n = Math.max(1, ids.length);
const scale = Math.max(minimumWorldScale, Math.sqrt(n / 6) * worldScale);
const world = { width: Math.round(baseW * scale), height: Math.round(baseH * scale) };
const edgePadding = Math.max(160, Math.min(world.width, world.height) * edgeMarginFraction);

// Simplified placement mirror (central focus 6 + rings) for bbox estimate
const ordered = [...fullOrder];
const focus = new Set(fullOrder.slice(0, 6));
const placed = [];
for (let idx = 0; idx < ordered.length; idx += 1) {
  const id = ordered[idx];
  const record = clusterRecords.find((cluster) => cluster.id === id);
  const random = randomFor(`${seed}:${id}:${record?.title ?? id}:${record?.description ?? ''}`);
  const width = 320 + random() * 100;
  const height = width * 0.9;
  const cx = world.width / 2; const cy = world.height / 2;
  let best = null;
  let bestClearance = -1;
  for (let attempt = 0; attempt < 800; attempt += 1) {
    let x; let y;
    if (focus.has(id)) {
      const a = random() * Math.PI * 2;
      const focusRadius = Math.min(world.width, world.height) * focusRadiusFraction;
      const r = focusRadius * (0.42 + random() * 0.58);
      x = cx + Math.cos(a) * r; y = cy + Math.sin(a) * r;
    } else {
      const ring = Math.floor((idx - 6) / 3) + 1;
      const baseR = Math.min(world.width, world.height) * 0.28;
      const step = Math.min(world.width, world.height) * 0.16;
      const a = random() * Math.PI * 2;
      const r = baseR + ring * step + random() * step * 0.5;
      x = cx + Math.cos(a) * r; y = cy + Math.sin(a) * r;
    }
    x = Math.max(width / 2 + edgePadding, Math.min(world.width - width / 2 - edgePadding, x));
    y = Math.max(height / 2 + edgePadding, Math.min(world.height - height / 2 - edgePadding, y));
    const collides = placed.some((other) =>
      Math.abs(x - other.x) < (width + other.width) / 2 + collisionGap &&
      Math.abs(y - other.y) < (height + other.height) / 2 + collisionGap);
    if (collides) continue;
    const clearance = placed.length ? Math.min(...placed.map((other) => Math.hypot(x - other.x, y - other.y))) : Infinity;
    if (clearance > bestClearance) {
      best = { id, x, y, width, height };
      bestClearance = clearance;
    }
  }
  if (!best) throw new Error(`Unable to place cluster "${id}" without collision`);
  placed.push(best);
}

const xs = placed.flatMap((p) => [p.x - p.width / 2, p.x + p.width / 2]);
const ys = placed.flatMap((p) => [p.y - p.height / 2, p.y + p.height / 2]);
const bbox = { x0: Math.round(Math.min(...xs)), y0: Math.round(Math.min(...ys)), x1: Math.round(Math.max(...xs)), y1: Math.round(Math.max(...ys)) };
// Star field spans 0.02-0.98 of world
const field = { x0: world.width * 0.02, y0: world.height * 0.02, x1: world.width * 0.98, y1: world.height * 0.98 };
const covered = bbox.x0 >= field.x0 && bbox.y0 >= field.y0 && bbox.x1 <= field.x1 && bbox.y1 <= field.y1;
const areaRatio = (world.width * world.height) / (2600 * 1700);
const extraStars = Math.round(Math.max(0, areaRatio - 1) * 155);

const meta = {
  generatedAt: new Date().toISOString(),
  clusters: n, seed,
  layout: { worldScale, minimumWorldScale, edgeMarginFraction, focusRadiusFraction, collisionGap },
  world, clusterBBox: bbox, starField: { x0: Math.round(field.x0), y0: Math.round(field.y0), x1: Math.round(field.x1), y1: Math.round(field.y1) },
  covered, extraStars, anchors: placed,
};
writeFileSync(outPath, `${JSON.stringify(meta, null, 2)}\n`);
console.log(`Constellation: ${n} clusters → world ${world.width}x${world.height}, bbox [${bbox.x0},${bbox.y0} → ${bbox.x1},${bbox.y1}]`);
console.log(`Star field covers clusters: ${covered ? 'YES' : 'NO — bump layoutSeed or world padding'}`);
console.log(`Extra stars to generate: ${extraStars}. Wrote src/data/constellationMeta.json`);
if (!covered) process.exitCode = 1;
