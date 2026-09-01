# HANDOFF — Gayathri's personal website (research + studio)

Read docs/project-vision.md, docs/technical-decisions.md and
docs/studio-design-system.md first — they record the durable decisions.
This file is the current-state snapshot for the next model/session.

## Stack and deployment

Astro 5 + TypeScript static site. GitHub Pages project site:
repo c-gayathri/my-website, base '/my-website' in astro.config.mjs.
CI: .github/workflows/deploy.yml (withastro/action@v3 ->
actions/deploy-pages@v4). Live: https://c-gayathri.github.io/my-website/
Every push to main deploys automatically.

## Architecture

Two deliberately separate worlds share only src/layouts/BaseLayout.astro
(document shell: head/meta/reset — nothing visual):

1. / — professional research homepage. Minimal, zero client JS, styles
   src/styles/research.css, content in src/data/*.ts.
   DO NOT redesign it — the user considers it finished.
2. /studio — experimental creative world (current work area):
   - content collections: src/content/{clusters,projects,writing,books}
   - config: src/data/{studioConfig,externalLinks,studioAbout}.ts
   - styles: src/styles/studio.css
   - layout: src/layouts/StudioLayout.astro
   - React island: src/components/studio/Constellation.tsx
   - MDX blocks: src/components/studio/blocks/ (Image, ImagePair, Gallery,
     Quote, Text; presets via Place.astro on a 12-column grid)

Routes under /studio: index (constellation homepage), clusters/[slug],
projects/[slug], writing + writing/[slug] (stable route; display label
"Writing pad" via studioConfig.writingLabel), bookshelf +
bookshelf/[slug] (reviews), index (directory; search not built yet),
about.astro. Nav labels + About item: StudioNav.astro navItems.

## What is working (committed at 6c7f176, NOT pushed — awaiting user approval)

- Constellation: authored 9-cluster layout on a 3-3-3 lattice (min pairwise
  distance ≈ 700 world units; positions in cluster frontmatter
  desktop.x/y/width/driftRadius/depth), scattered seeded collages (no
  overlap, uniform padding, re-centred under the title plate), node-based
  marks with constant drift, cursor push physics, hover = camera zoom +
  white field + loud twinkle + anchored info block + blob splotch, title
  plates at constant screen size (counter-scaled via --ic per frame), map
  mode fits the whole spread with titles only, focus/map controls,
  keyboard/touch/reduced-motion support.

- Hover interaction model (rewritten): ENTER = pointer inside the collage
  bbox ≥150 ms; EXIT = outside the bbox ≥220 ms, zero margin; all-or-nothing
  (a single frame across an edge completes neither transition). A 1.5 s
  cooldown after any exit blocks other clusters, so a straight handoff into
  the next collage cannot fire; if the pointer is still parked on a cluster
  when the cooldown expires, that cluster activates. The hover zoom anchors
  to the pointer (clamped so the collage stays on-screen) — the collage
  grows in place under the cursor instead of drifting to the viewport
  centre; collage size is capped at ~1/6 of the viewport area. All cluster
  drift is frozen while hovered, so the constellation returns exactly to
  where it was. A hover star cluster (loud twinkle) rides beside the active
  collage. The hover colour fills the whole page chrome (header included)
  via --s-hover-bg + a background transition matched to the splotch timing.

- Cluster pages: one-screen asymmetric cards mixing projects and related
  writing. Project pages: simple (meta rail + viewport-fit artwork,
  prev/next), modular MDX (blocks on the grid), custom (registry stub).
- Writing pad: desktop scatter (seeded, featured pinned), ordered mobile
  stack; reading pages with essay/poem/fragment/mixed layouts; MDX blocks
  available in writing via Content components.
- Bookshelf: challenge rail + cover grid + featured review pane (persistent
  on featured, hover on others), recommended shelf, fixed footer.
- Index: numbered one-glance directory. About page: photo, statement,
  education/skills, news, elsewhere, influences.
- 15 sample books with generated SVG covers; 9 sample clusters/projects
  built from the user's images in src/assets/studio/sample/.

## Known issues / broken

- Map/focus controls were previously unclickable: the footer strip
  (z-index 10) covered them (z-index 9). Fixed by z-index 20.
- Two pre-existing rendering bugs fixed: the cluster translate used
  `bh = boxH * scale` instead of `boxH * width * scale` (collages rendered
  ~75 px low), and `transform-origin: 50% 50%` shifted the rendered collage
  off the camera math at low zoom — both made exact hit-testing impossible;
  the origin is now `0 0` and the bbox test is pixel-exact.
- Index search is NOT built (static directory only).
- Mobile: usable but not polished (no device testing since the hover
  rewrite; touch still uses click-to-activate and centres the cluster).
- Environment note: long file-writing tool calls tend to truncate; write
  large files in small chunks.

## Key decisions (do not casually reverse)

- Research homepage stays untouched; separate styles per world; only
  BaseLayout is shared.
- `layout` is a RESERVED Astro MDX frontmatter key — use `pageLayout`.
- CSS files must use /* */ comments only (// swallows following rules).
- In flex-column parents, .s-page needs explicit width: 100%.
- All positions/placements are authored or seeded (layoutSeed) — never
  random on refresh. Manual frontmatter overrides always win.
- Hover colour palette (white-text-safe): #ff2e88 #2438ff #ff3d1f #00b34a
  #7a2bff #ff7a00; strict monochrome at rest.
- Cluster spacing rule (kept by the 3-3-3 lattice): min pairwise centre
  distance ≈700 world units so hover collages (~1/6 screen, H capped 0.78)
  never touch neighbour collages at visible zoom levels (S ≥ mapBelow).
- Hover interactions are driven by the per-frame bbox state machine in the
  rAF loop (Constellation.tsx), NOT by DOM pointer events on the anchors.
  Dwell timers: enter 150 ms, exit 220 ms, cooldown 1500 ms.
- The hover zoom anchors the collage to the pointer position (clamped to
  keep the collage on-screen) rather than centring the viewport.
- Constellation styles live in src/styles/constellation.css (imported by
  /studio only); chrome styles stay in StudioLayout/StudioNav.
- Portrait is auto-detected via import.meta.glob on
  src/assets/portrait.{png,jpg,...}; sample images live in
  src/assets/studio/sample/ (raw *.MOV/*.MP4 sources are gitignored;
  compressed copies in public/studio/videos/).

## Next concrete steps (user-approved priorities)

1. USER REVIEW pending: verify hover feel + the cooldown behaviour live;
   approve pushing to main (currently NOT pushed — the live site is
   unchanged since a5d1b4c).
2. Touch pass: constellation click-to-activate camera anchoring on devices.
3. Index search: build-time JSON index + small client island with
   all/clusters/projects/writing/books filters (checkpoint 9 item).
4. Accessibility + performance polish (checkpoint 11): focus order on the
   constellation, video preload audit, docs refresh
   (docs/interaction-spec.md is still to be written).
5. Content swap-in: user replaces sample clusters/projects/writing/books
   with real work (edit src/content/* only; no code changes needed).
6. Custom project support: first pageType "custom" project will need a
   registry in src/components/studio/custom/.
