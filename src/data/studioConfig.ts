// ── Studio configuration ─────────────────────────────────────────────────
// Creative decisions exposed as editable data. Change values here — not
// in component code.

export const studioConfig = {
  name: 'Gayathri Chandran',
  tagline: 'images / words / moving things / experiments',

  // Section labels (display names). Routes stay stable: /studio/writing etc.
  writingLabel: 'Writing pad',
  bookshelfLabel: 'Bookshelf',
  indexLabel: 'Index',

  // Constellation world space (authored coordinates live in this box).
  world: { width: 2000, height: 1250 },

  // Camera bounds. Below `mapBelow` the map mode kicks in:
  // images fade out and screen-space titles remain readable.
  zoom: { min: 0.34, max: 1.4, mapBelow: 0.5 },

  // Ambient drift. Deterministic per cluster; positions always return to
  // their authored anchor. Amplified while a cluster is hovered.
  drift: { periodSeconds: 14, hoverMultiplier: 2.2, parallax: 6 },

  // Seeded shuffling for deterministic default layouts. Change the seed to
  // try a different automatic arrangement; keep the one you like.
  layoutSeed: 7,

  // Curated hover palette (used in order per cluster hash unless the
  // cluster specifies hoverColor). Chosen so white type stays readable.
  palette: ['#ff2e88', '#2438ff', '#ff3d1f', '#00b34a', '#7a2bff', '#ff7a00'],

  // Reading challenge goals by year (books collection supplies the rest).
  readingChallenge: {
    2026: { goal: 12 },
    2025: { goal: 10 },
  },
} as const;

export type StudioConfig = typeof studioConfig;
