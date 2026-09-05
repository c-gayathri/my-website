// Run: npm run constellation:update
// Regenerates constellation coverage metadata after adding/removing a cluster.
// It mirrors generateClusterAnchors() scaling, computes the cluster bbox,
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

const files = readdirSync(clustersDir).filter((f) => f.endsWith('.md'));
const ids = files.map((f) => f.replace(/\.md$/, ''));
let order = ids;
if (existsSync(orderPath)) {
  const src = readFileSync(orderPath, 'utf8');
  const m = src.match(/\[([\s\S]*?)\]/);
  if (m) order = [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]).filter((id) => ids.includes(id));
}
const missing = ids.filter((id) => !order.includes(id));
const fullOrder = [...order, ...missing.sort()];

// Mirror studioConfig.ts base world
let baseW = 2600; let baseH = 1700; let seed = 19;
try {
  const cfg = readFileSync(configPath, 'utf8');
  const w = cfg.match(/width:\s*(\d+)/); const h = cfg.match(/height:\s*(\d+)/);
  const s = cfg.match(/layoutSeed:\s*(\d+)/);
  if (w) baseW = Number(w[1]); if (h) { const all = [...cfg.matchAll(/height:\s*(\d+)/g)]; if (all[0]) baseH = Number(all[0][1]); }
  if (s) seed = Number(s[1]);
} catch { /* defaults */ }

const n = Math.max(1, ids.length);
const scale = Math.max(1.35, Math.sqrt(n / 6) * 1.25);
const world = { width: Math.round(baseW * scale), height: Math.round(baseH * scale) };
const padding = 90;

// Simplified placement mirror (central focus 6 + rings) for bbox estimate
const ordered = [...fullOrder];
const focus = new Set(fullOrder.slice(0, 6));
const placed = [];
for (let idx = 0; idx < ordered.length; idx += 1) {
  const id = ordered[idx];
  const random = randomFor(`${seed}:${id}`);
  const width = 320 + random() * 100;
  const height = width * 0.9;
  const cx = world.width / 2; const cy = world.height / 2;
  let x; let y;
  if (focus.has(id)) {
    const a = random() * Math.PI * 2; const r = random() * Math.min(world.width, world.height) * 0.3;
    x = cx + Math.cos(a) * r; y = cy + Math.sin(a) * r;
  } else {
    const ring = Math.floor((idx - 6) / 3) + 1;
    const baseR = Math.min(world.width, world.height) * 0.28;
    const step = Math.min(world.width, world.height) * 0.16;
    const a = random() * Math.PI * 2;
    const r = baseR + ring * step + random() * step * 0.5;
    x = cx + Math.cos(a) * r; y = cy + Math.sin(a) * r;
  }
  x = Math.max(width / 2 + padding, Math.min(world.width - width / 2 - padding, x));
  y = Math.max(height / 2 + padding, Math.min(world.height - height / 2 - padding, y));
  placed.push({ id, x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) });
}

const xs = placed.flatMap((p) => [p.x - p.width / 2, p.x + p.width / 2]);
const ys = placed.flatMap((p) => [p.y - p.height / 2, p.y + p.height / 2]);
const bbox = { x0: Math.round(Math.min(...xs)), y0: Math.round(Math.min(...ys)), x1: Math.round(Math.max(...xs)), y1: Math.round(Math.max(...ys)) };
// Star field spans 0.02-0.98 of world
const field = { x0: world.width * 0.02, y0: world.height * 0.02, x1: world.width * 0.98, y1: world.height * 0.98 };
const covered = bbox.x0 >= field.x0 && bbox.y0 >= field.y0 && bbox.x1 <= field.x1 && bbox.y1 <= field.y1;
const areaRatio = (world.width * world.height) / (2600 * 1700);
const extraStars = Math.round(Math.max(0, areaRatio - 1) * 120);

const meta = {
  generatedAt: new Date().toISOString(),
  clusters: n, seed, world, clusterBBox: bbox, starField: { x0: Math.round(field.x0), y0: Math.round(field.y0), x1: Math.round(field.x1), y1: Math.round(field.y1) },
  covered, extraStars, anchors: placed,
};
writeFileSync(outPath, `${JSON.stringify(meta, null, 2)}\n`);
console.log(`Constellation: ${n} clusters → world ${world.width}x${world.height}, bbox [${bbox.x0},${bbox.y0} → ${bbox.x1},${bbox.y1}]`);
console.log(`Star field covers clusters: ${covered ? 'YES' : 'NO — bump layoutSeed or world padding'}`);
console.log(`Extra stars to generate: ${extraStars}. Wrote src/data/constellationMeta.json`);
if (!covered) process.exitCode = 1;
