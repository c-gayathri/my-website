// ── Studio configuration ─────────────────────────────────────────────────
// Creative decisions exposed as editable data. Change values here — not
// in component code.

export const studioConfig = {
  name: 'Gayathri Neela Chandran',
  tagline: 'art | writing | experiments',

  // Section labels (display names). Routes stay stable: /studio/writing etc.
  writingLabel: 'Writing pad',
  bookshelfLabel: 'Bookshelf',
  indexLabel: 'Index',

  // Constellation world space (authored coordinates live in this box).
  world: { width: 2600, height: 1700 },

  // Camera bounds. Below `mapBelow` the map mode kicks in:
  // images fade out and screen-space titles remain readable.
  // mapBelow is refined at runtime from the authored cluster spread.
  zoom: { min: 0.22, max: 1.4, mapBelow: 0.45 },

  // Ambient drift. Deterministic per cluster; positions always return to
  // their authored anchor. Amplified while a cluster is hovered.
  drift: { periodSeconds: 14, hoverMultiplier: 2.2, parallax: 6 },

  // Seeded shuffling for deterministic default layouts. Change the seed to
  // try a different automatic arrangement; keep the one you like.
  layoutSeed: 19,

  // Curated hover palette (used in order per cluster hash unless the
  // cluster specifies hoverColor). Chosen so white type stays readable.
  palette: ['#ff2e88', '#2438ff', '#ff3d1f', '#00b34a', '#7a2bff', '#ff7a00'],

  // Reading challenge goals by year (books collection supplies the rest).
  readingChallenge: {
    2026: { goal: 30 },
    2025: { goal: 15 },
  },
} as const;

export type StudioConfig = typeof studioConfig;

export type ClusterAnchorInput = {
  id: string;
  title: string;
  description: string;
};

export type ClusterAnchor = { x: number; y: number; width: number };

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function randomFor(value: string) {
  let state = hashString(value);
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let result = Math.imul(state ^ (state >>> 15), 1 | state);
    result = (result + Math.imul(result ^ (result >>> 7), 61 | result)) ^ result;
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic collision-aware defaults; frontmatter overrides are applied by the page. */
export function generateClusterAnchors(
  clusters: ClusterAnchorInput[],
  order?: string[],
): Record<string, ClusterAnchor> {
  // World grows as sqrt(N) so area scales linearly with count.
  const baseW = studioConfig.world.width;
  const baseH = studioConfig.world.height;
  const n = clusters.length || 10;
  const scale = Math.sqrt(n / 6) * 1.25;
  const worldWidth = baseW * Math.max(1.35, scale);
  const worldHeight = baseH * Math.max(1.35, scale);
  const padding = 90;

  const placed: Array<ClusterAnchor & { height: number }> = [];
  const result: Record<string, ClusterAnchor> = {};

  // Canonical order drives focus window and outer rings. Fallback to hash if no order supplied.
  const ordered = order
    ? [...clusters].sort((a, b) => {
        const ia = order.indexOf(a.id);
        const ib = order.indexOf(b.id);
        if (ia === -1 && ib === -1) return a.id.localeCompare(b.id);
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        return ia - ib;
      })
    : [...clusters].sort((a, b) => hashString(`${studioConfig.layoutSeed}:${a.id}`) - hashString(`${studioConfig.layoutSeed}:${b.id}`));

  const focusIds = new Set((order ?? ordered.map((c) => c.id)).slice(0, 6));
  const centerX = worldWidth / 2;
  const centerY = worldHeight / 2;

  for (let idx = 0; idx < ordered.length; idx++) {
    const cluster = ordered[idx];
    const fingerprint = `${studioConfig.layoutSeed}:${cluster.id}:${cluster.title}:${cluster.description}`;
    const random = randomFor(fingerprint);
    const width = 320 + random() * 100;
    const height = width * 0.9;
    const isFocus = focusIds.has(cluster.id);
    let best: ClusterAnchor | null = null;
    let bestClearance = -1;

    for (let attempt = 0; attempt < 800; attempt += 1) {
      let x: number;
      let y: number;
      if (isFocus) {
        // Central window for focus clusters — larger disc to avoid crowding
        const angle = random() * Math.PI * 2;
        const r = random() * Math.min(worldWidth, worldHeight) * 0.30;
        x = centerX + Math.cos(angle) * r;
        y = centerY + Math.sin(angle) * r;
        // Clamp inside world
        x = Math.max(width / 2 + padding, Math.min(worldWidth - width / 2 - padding, x));
        y = Math.max(height / 2 + padding, Math.min(worldHeight - height / 2 - padding, y));
      } else {
        // Outer rings: radius grows with order index
        const ring = Math.floor((idx - 6) / 3) + 1; // 3 per ring
        const baseR = Math.min(worldWidth, worldHeight) * 0.28;
        const step = Math.min(worldWidth, worldHeight) * 0.16;
        const angle = random() * Math.PI * 2;
        const r = baseR + ring * step + random() * step * 0.5;
        x = centerX + Math.cos(angle) * r;
        y = centerY + Math.sin(angle) * r;
        // Clamp inside world
        x = Math.max(width / 2 + padding, Math.min(worldWidth - width / 2 - padding, x));
        y = Math.max(height / 2 + padding, Math.min(worldHeight - height / 2 - padding, y));
      }

      const candidate = { x, y, width };
      const collides = placed.some(
        (other) =>
          Math.abs(candidate.x - other.x) < (width + other.width) / 2 + padding &&
          Math.abs(candidate.y - other.y) < (height + other.height) / 2 + padding,
      );
      if (collides) continue;
      const clearance = placed.length
        ? Math.min(...placed.map((other) => Math.hypot(candidate.x - other.x, candidate.y - other.y)))
        : Infinity;
      if (clearance > bestClearance) {
        best = candidate;
        bestClearance = clearance;
      }
    }
    if (!best) throw new Error(`Unable to place Studio cluster "${cluster.id}" without collision`);
    result[cluster.id] = best;
    placed.push({ ...best, height });
  }
  return result;
}
