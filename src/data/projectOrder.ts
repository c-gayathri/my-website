// ── Project order per cluster ─────────────────────────────────────────
// The order in each array is the order projects appear on that cluster’s
// page AND the order from which the constellation picks the ≤5 featured
// images. New projects are unshifted to the top of the relevant array
// (so they appear first); you reorder by dragging lines.
//
// A project that belongs to multiple clusters should appear in each
// relevant array, but the constellation will dedup — the Index “all
// projects” list walks clusterOrder top→bottom and emits a project only
// the first time it is seen (so Mumbai Sky lives with its earliest cluster).

export const projectOrder: Record<string, string[]> = {
  "album-art": [
    "festival-poster",
    "album-study-1",
    "album-study-2",
    "album-study-3",
  ],
  "eyes": [
    "meenakshi",
    "noseless",
    "pain-is-red",
    "self-portrait",
    "studies",
    "november-self-portrait",
    "img-4734",
    "startled",
    "eye-variation-1",
    "eye-variation-2",
    "img-1272",
  ],
  "color-pop": [
    "mumbai-sky",
    "meenakshi",
    "lip-sticks",
    "curacao-sun",
    "growing-tentacles",
    "eye-study",
    "neon-afterimage",
    "color-field-1",
    "color-field-2",
    "color-field-3",
    "color-field-4",
    "color-study-1",
    "color-study-2",
    "eye-variation-1",
    "eye-variation-2",
  ],
  "minimalism": [
    "flight-1",
    "shadow",
    "brink",
    "snake",
    "balloon-2",
    "hammer-9",
    "dinner",
    "spider-4-01",
    "wave-2-01",
  ],
  "photo-edits": [
    "anita",
    "subliminal",
    "mumbai-sky",
    "curacao-sun",
    "anorexic-sun",
    "album-study-1",
    "album-study-3",
  ],
  "photography": [
    "img-0145",
    "img-5849",
    "img-6037-original",
    "img-6404-original",
  ],
  "realism": [
    "butterfly",
    "cherries",
    "marbles",
    "no-5-chael-perfume-bottle",
    "21-june",
    "img-20180323-181549-143",
    "img-20180413-171734-603",
    "img-20180710-230335-764",
  ],
  "watercolours": [
    "imitation-watercolour-on-paper",
    "original-watercolour-on-paper",
    "original-watercolours-and-pen-on-paper",
    "original-quick-water-colour-on-paper",
    "img-8117",
    "pain-is-red-2",
    "water-study-1",
    "water-study-2",
    "water-study-3",
    "water-study-4",
    "water-study-5",
    "water-study-6",
    "new-doc-2019-04-02-21-13",
  ],
  "women-eyes": [
    "meenakshi",
    "noseless",
    "gaze-obscured",
    "eye-study",
    "eye-variation-1",
    "eye-variation-2",
  ],
  "writing-art": [
    "cotton-candy-fluff",
    "pain-is-red-2",
    "subliminal",
    "a-rush-of-blood-to-the-head",
  ],
};
