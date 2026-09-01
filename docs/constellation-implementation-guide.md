# Constellation Implementation Guide

How the `/studio` constellation is built, and how to recreate it. This is the
authoritative reference for the visual language and the deterministic geometry
pipeline. Art-direction intent lives in `docs/studio-design-system.md`; this
document is the how-to for reproducing the marks and the composition.

The prototype lives in `constellation-math-lab/` (a self-contained native
JS/SVG page with its own Playwright suite). The production implementation lives
in the Astro app under `src/lib/studio/` and `src/components/studio/`.

> The marks are **procedural SVG paths**. There are no star image assets. The
> only image assets in Studio are the project/collage photos (`src/assets/studio/sample/`).

---

## 1. Visual language (non-negotiable)

- Everything is monochrome black on the page background; colour enters only
  through artwork and the cluster hover.
- The star glyph is a **four-point star** made of four sharp arm tips joined by
  concave (quadratic) curves. It must read as a fine sparkle, never a filled
  diamond.
- **Forbidden:** any rhombus / tilted-square / plain diamond shape. Stars must
  have thin waists so the centre occupies little area and the arms are much
  longer than they are wide.
- Marks are fixed-orientation (no `transform` rotation on the star paths).
  Ornaments may rotate, but ordinary stars do not.
- Lines are short, dotted or solid, and connect **star clusters** — they are not
  long sweeping arcs and never run edge-to-edge of the panel.

### The four-point star

Construct four arm tips at angles `-90°, 0°, 90°, 180°` at radius `r`, and four
inner waist points at the 45° diagonals at radius `r * waist`. Draw each arm as a
quadratic curve from one tip through the waist point to the neighbouring tip.

| Variant | Waist | Arms (N,E,S,W) | Neck line | Notes |
| --- | --- | --- | --- | --- |
| `tiny` | 0.05 | 1, 1, 1, 1 | none | smallest field mark |
| `small` | 0.055 | per-tip variation | none | standard star |
| `medium` | 0.045 | 1, 1, 1, 1 | none | slightly larger star |
| `bold` | 0.045 | 1.35, 0.55, 1.35, 0.55 | 0.14 | elongated vertical flare, rare |
| dot | — | circle, radius `r` | — | `circle` element |
| cross | — | plus, `r * 1.15` | — | stroked, `stroke-width: r * 0.5` |

- Lower waist value = thinner arms / smaller central mass. Keep waist in
  `0.045–0.055`. Anything above `~0.1` starts to look like a diamond.
- Fills use `currentColor` (black). Do **not** add a stroke to filled star paths;
  a stroke thickens the arms and destroys the delicate feel. Only the `cross`
  glyph is stroked.
- The one special case is the large decorative ornament (an 8-point glyph or a
  big star placed at a cluster root); these are rare and sized independently.

### Sizes and weights

Prefer small marks. Big stars are the exception, not the rule.

| Glyph | Size range (px) | Weight |
| --- | --- | --- |
| `tiny` | 2 – 3 | 0.30 |
| `small` | 3 – 5 | 0.26 |
| `medium` | 5 – 8 | 0.15 |
| `bold` | 8 – 13 | 0.04 |
| `cross` | 2 – 3.4 | 0.02 |
| `dot` | 1.2 – 2 | 0.23 |
| `ornament` | 15 – 24 | rare |

A healthy deterministic field is roughly **220–285 marks**, with dots comprising
a large minority and `bold`/ornament very rare.

---

## 2. Determinism

Everything must be reproducible. Use a seeded PRNG (`mulberry32` seeded by an
FNV-1a hash of the seed). Never rely on `Math.random()`.

- One seed string feeds the whole composition.
- Use **independent random streams** for different concerns so that changing one
  density knob does not reshuffle the whole field. E.g.:
  - `:radius` → tree geometry
  - `:visibility` → which edges are shown
  - `:decoration` → swarm star placement
  - `:placement` → component packing
- The field and each local fragment are fully deterministic for a given seed.

---

## 3. Global composition

The main panel is a normalized `0–1 × 0–1` field rendered into a wide viewBox
(1600 × 840 in the prototype). Because it is wider than it is tall, **horizontal
displacements must be scaled by `height / width`** so geometry is isotropic on
screen. Without this, stars, pockets, and branches render ~1.9× wider than tall.

### Aspect correction

Set `isoX = 840 / 1600` (or `height / width`) and multiply every x-displacement
(not x-position) by it everywhere — branch spawn, swarm ellipses, satellite
offsets. Y is left as-is.

### Component archetypes

Rather than four identical trees, choose a mix of sizes so the field has variety:

| Archetype | Nodes | Pockets | Runs | Notes |
| --- | --- | --- | --- | --- |
| `anchor-a` / `anchor-b` | 7–9 | 3–4 | 2–3 | main structured clusters |
| `vertical-chain` | 4–6 | 2–3 | 1–2 | narrow silhouette, vertical root angle |
| `hook` | 3–5 | 1–2 | 1–2 | compact bend |
| `micro` | 2–3 | 1–2 | 1 | small |
| `dim` | 1–2 | 0–1 | 1 | minimal footprint |

Pick 5 components by seeded weight. Build each **around the panel centre**, then
place it only after its real footprint is measured.

### Placement (no overlap)

1. Measure each component's bounding box (nodes + its swarm stars), inflated by a
   padding (~0.045).
2. Best-candidate sample candidate centres; reject any that collide with an
   already-placed padded box; score by clearance to the nearest box and keep the
   best.
3. Translate the component so its measured centre lands on the chosen candidate.

This yields dispersed clusters that never overlap the way component-vs-component.

### Swarms (star pockets)

- Anchor pockets on a subset of the run nodes, not uniformly across all nodes.
- Each pocket is an **anisotropic ellipse**: sample `major` and `minor` with a
  ratio of `1.4–2.8`, at a rotation angle.
- Orient the ellipse's rotation roughly along the incoming edge of the anchor so
  the pocket reinforces the structure.
- **Break symmetry.** Never produce evenly filled rings or repeated spacing. Use:
  - a per-star sigma jitter (`0.72–1.34`×),
  - a small asymmetric "tail" lobe: a fraction (`~0.14–0.26`) of the marks
    placed along a single offset angle at `1.8–3.4×` major radius.
- Optionally add a satellite: a smaller pocket offset from the parent at an
  angle, `0.4–0.65×` the parent major.

### Lines and endpoints

- Visible edges form short contiguous runs. In the prototype, `continueProb ≈
  0.9`, branch length `0.11–0.22`, `depthDecay ≈ 0.92`, producing visible runs of
  medium length (target rendered segments roughly **100–170 px**, hard cap so no
  run spans a large portion of the canvas).
- **Every visible run endpoint must be a four-point star, not a circle.**
  Detect run tips (nodes incident to exactly one visible edge) and place an
  immovable `small` star exactly at each tip.
- Do not render structural nodes that are part of a visible line as circles —
  skip them in the node-circle pass so the line terminates in a star.

### Density and dots

- Background and ambient fields are dot-heavy. Use a **source-aware dot bias** so
  context stars are mostly `dot`/`tiny` while structural pockets stay dominated
  by four-point stars:
  - `background`: +0.50 dot bias
  - `ambient`: +0.28
  - `satellite`: +0.05
  - `swarm`: 0
- Keep ~25–40 sparse background dots and a few ambient pockets per panel, plus
  the structural marks.

### Collision handling (final pass)

Star coordinates are in model units but footprint radii are in px. Convert radii
to model units (`px / 1600` for global, `px / 1` for local) before comparing.

- Reserve run-endpoint stars first (immovable).
- Give every swarm/satellite star a `swarmId` pointing at the swarm that owns it.
- For each remaining overlapping star, nudge it **around its own swarm** (never
  the first available swarm) on a loose radius, and reject any candidate that
  leaves the star's component bounding box.
- If a structural mark still cannot be placed, shrink it to a `tiny` star rather
  than deleting it. Leave sparse dot/ambient marks as-is.

**Why this matters:** resolving collision around the wrong (first-found) swarm
collapses unrelated marks into a single dense, uniform clump.

---

## 4. Small local fragments

The `big`, `big-plus-one`, and `big-plus-two` fragments reuse the same grammar
and appear throughout Studio pages as decorative keepsakes. Composition rules:

- `big`: one large cluster, one large ornament star.
- `big-plus-one`: one cluster plus one small companion.
- `big-plus-two`: one cluster plus two small companions.
- The main cluster always carries a root ornament; companions carry smaller
  ornaments.
- Use a compact anisotropic ellipse, keep line runs short, and end every shown
  line in a star.

---

## 5. Where this lives in the Astro app

- `src/lib/studio/constellationPrimitives.ts` — seeded PRNG, node/edge/star
  types, `generateGlobalConstellation`, `generateLocalConstellation`.
- `src/components/studio/Constellation.tsx` — full interactive field (layout,
  SVG rendering, camera pan/zoom, drift, cursor physics, hover/focus/map modes,
  twinkle, colour splotch).
- `src/components/studio/ConstellationFragment.astro` — static decorative SVG
  fragment reused on writing/bookshelf/cluster/index/about pages.
- `src/styles/constellation.css` — layer, cluster, title-plate, hover, control,
  and reduced-motion styling.
- `src/data/studioConfig.ts` — world dimensions, zoom bounds, drift, layout
  seed, hover palette.
- `src/content.config.ts` — the `clusters` and `projects` collections.
- `src/pages/studio/index.astro` — mounting point for the interactive field.

The `constellation-math-lab/` prototype is the reference implementation with a
browser test harness. Treat it as ground truth for star shape and composition.

---

## 6. Validation

Prototype (has its own dependencies and tests):

```bash
cd constellation-math-lab
npm install
npm run install-browser   # first time only
npm test
```

Production app:

```bash
npm run check   # Astro + TypeScript check
npm run dev     # visual check at http://localhost:4321/studio
```

When changing the geometry, validate on both **desktop and mobile** widths.
Confirm: no rhombus/diamond glyphs, every visible run ends in a star, clusters
do not look uniform or ring-like, no component/star overlap outliers, and marks
stay in bounds.

---

## 7. Known pitfalls

- **Delicate stars need low waist and no fill stroke.** A stroke re-thickens
  arms and reads as a diamond.
- **Local render scale** must be tuned so the small fragments do not look
  oversized relative to the field (`LOCAL_PX_SCALE ≈ 1.7` in the prototype).
- **Skip structural nodes on visible lines** — otherwise you get circles,
  which is exactly what the design forbids at line endpoints.
- **Nudge collisions around the owning swarm**, and keep nudged marks inside
  their own component box or they will wander into a neighbouring cluster.
- **Run `npm run check`** in the Astro app after editing TypeScript; the
  prototype's `pickGlyph`/weights and the production types must stay aligned.
