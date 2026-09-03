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
export function generateClusterAnchors(clusters: ClusterAnchorInput[]): Record<string, ClusterAnchor> {
  const { width: worldWidth, height: worldHeight } = studioConfig.world;
  const padding = 90;
  const placed: Array<ClusterAnchor & { height: number }> = [];
  const result: Record<string, ClusterAnchor> = {};
  const ordered = [...clusters].sort((a, b) => hashString(`${studioConfig.layoutSeed}:${a.id}`) - hashString(`${studioConfig.layoutSeed}:${b.id}`));

  for (const cluster of ordered) {
    const fingerprint = `${studioConfig.layoutSeed}:${cluster.id}:${cluster.title}:${cluster.description}`;
    const random = randomFor(fingerprint);
    const width = 320 + random() * 100;
    const height = width * 0.9;
    let best: ClusterAnchor | null = null;
    let bestClearance = -1;
    for (let attempt = 0; attempt < 600; attempt += 1) {
      const candidate = {
        x: width / 2 + padding + random() * (worldWidth - width - padding * 2),
        y: height / 2 + padding + random() * (worldHeight - height - padding * 2),
        width,
      };
      const collides = placed.some((other) =>
        Math.abs(candidate.x - other.x) < (width + other.width) / 2 + padding
        && Math.abs(candidate.y - other.y) < (height + other.height) / 2 + padding);
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
