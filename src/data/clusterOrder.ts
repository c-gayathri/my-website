// ── Cluster order ─────────────────────────────────────────────────────
// The order in this file is the canonical order for the Index list AND for
// the Constellation. The top 6 are placed in the central focus window;
// later entries are placed progressively further toward the edge, in
// concentric rings. The world grows as sqrt(N) so the density stays
// constant.
//
// New clusters are appended to the bottom of this array. Reordering this
// array (drag a line) reorders the Index and the Constellation — no per-file
// `order:` numbers needed.

export const clusterOrder: string[] = [
  "color-pop",
  "women-eyes",
  "writing-art",
  "eyes",
  "album-art",
  "photo-edits",
  "minimalism",
  "realism",
  "watercolours",
  "photography",
];
