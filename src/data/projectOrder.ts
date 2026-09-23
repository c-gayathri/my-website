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
    "idfk",
    "bmp",
    "zaroorat",
    "anita",
  ],
  "eyes": [
    "what-are-you-looking-at",
    "looping-eyes",
    "i-see-you",
    "meenakshi",
    "pain-is-red",
    "aaah",
    "noseless",
    "desi-it-all",
    "self-portrait",
    "blinding-gold",
    "tear-laden",
    "chrysanthemum-eyes",
    "charcoal-eyes",
  ],
  "color-pop": [
    "tentacle-swirls",
    "mumbai-sky",
    "meenakshi",
    "what-are-you-looking-at",
    "hand-study",
    "growing-tentacles",
    "looping-eyes",
    "a-mid-summer-afternoon-breeze",
    "curacao-sun",
    "lip-sticks",
    "sharavati-hostel",
    "i-see-you",
    "feminachi",
    "sobhita-is-cool",
    "let-there-be-lite",
    "angry-bride",
  ],
  "minimalism": [
    "flight",
    "shadow",
    "brick",
    "snake",
    "balloon",
    "hammer",
    "dinner",
    "spider",
    "wave",
  ],
  "photo-edits": [
    "curacao-sun",
    "subliminal",
    "anorexic-sun",
    "mumbai-sky",
    "anita",
    "zaroorat",
    "idfk",
  ],
  "photography": [
    "alt-wild",
    "gold-storm",
    "bleeding-stars",
    "cupid",
  ],
  "realism": [
    "cat",
    "no-5-chanel-parfum",
    "butterfly",
    "flamenco-dancer",
    "cherries",
    "bird",
  ],
  "watercolours": [
    "pain-is-red",
    "yellow-gazania-watercolours",
    "summer-breeze-watercolours",
    "transparent-purple-magnolia",
    "portrait-of-a-woman-you-don-t-mess-with",
    "watercolour-daisy",
    "pigeon-watercolours",
    "transparent-lotus",
    "looping-eyes",
    "transparent-cherry-blossoms",
    "remember-to-water-your-soul",
    "tiger-watercolours",
    "elephant-family-in-kenya-watercolours",
  ],
  "women-eyes": [
    "what-are-you-looking-at",
    "meenakshi",
    "aaah",
    "i-see-you",
    "noseless",
    "angry-bride",
  ],
  "writing-art": [
    "pain-is-red",
    "cotton-candy-fluff",
    "subliminal",
    "a-rush-of-blood-to-the-head",
  ],
};
